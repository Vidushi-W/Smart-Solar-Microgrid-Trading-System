// Reservation rules: an active prosumer, an open slot, a known service type, the seven-day window, no double booking, and 12 hours' notice before a change or cancellation.
// Requested, Approved, and Scheduled reservations hold slot capacity.
using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.DTOs;
using SolarMicrogrid.API.Helpers;
using SolarMicrogrid.API.Interfaces;
using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Services;

// Prosumers create, modify, and cancel their own bookings. Backoffice approves or rejects. Grid Operator schedules.
public class ReservationService : IReservationService
{
    private readonly IReservationRepository _reservations;
    private readonly IEnergyCatalog _catalog;
    private readonly IProsumerLookup _prosumers;
    private readonly ICurrentUser _currentUser;
    private readonly IClock _clock;

    public ReservationService(
        IReservationRepository reservations,
        IEnergyCatalog catalog,
        IProsumerLookup prosumers,
        ICurrentUser currentUser,
        IClock clock)
    {
        _reservations = reservations;
        _catalog = catalog;
        _prosumers = prosumers;
        _currentUser = currentUser;
        _clock = clock;
    }

    // Starts as Requested. Fails when the slot is full, energy exceeds station capacity, or the prosumer is not active.
    public async Task<ReservationDto> CreateAsync(CreateReservationRequest request, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Prosumer);
        var prosumerId = _currentUser.ProsumerId;
        if (string.IsNullOrWhiteSpace(prosumerId))
        {
            throw Rule(400, "A prosumer is required.");
        }

        var prosumer = await RequireActiveProsumer(prosumerId, cancellationToken);
        if (string.IsNullOrWhiteSpace(request.SlotId))
        {
            throw Rule(400, "An energy slot is required.");
        }

        if (!ServiceTypes.IsKnown(request.ServiceType))
        {
            throw Rule(400, "Service type must be Drop-off or Charging.");
        }

        if (request.EnergyKwh <= 0)
        {
            throw Rule(400, "Energy must be greater than zero.");
        }

        var slot = await RequireSlot(request.SlotId, cancellationToken);
        var station = await RequireStation(slot.StationId, cancellationToken);
        var now = _clock.UtcNow;
        EnsureBookable(slot, station, request.EnergyKwh, now);
        await EnsureCapacity(slot, null, cancellationToken);
        await EnsureNoOverlap(prosumer.Id, slot.Start, slot.End, null, cancellationToken);

        var reservation = new EnergyReservation
        {
            Id = $"rs-{Guid.NewGuid():N}",
            Code = await NextCode(cancellationToken),
            ProsumerId = prosumer.Id,
            StationId = station.Id,
            SlotId = slot.Id,
            Start = ColomboTime.AsUtc(slot.Start),
            End = ColomboTime.AsUtc(slot.End),
            Status = ReservationStatus.Requested,
            ServiceType = request.ServiceType!,
            EnergyKwh = request.EnergyKwh,
        };
        AddHistory(reservation, "Requested", "Reservation submitted.");
        await _reservations.InsertAsync(reservation, cancellationToken);
        return await Map(reservation, cancellationToken);
    }

    // Prosumer or Backoffice. Closed, full, past, out-of-window, and overlapping slots are left out.
    public async Task<ReservationOptionsDto> GetOptionsAsync(string? prosumerId, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Prosumer, AppRoles.Backoffice);
        var people = await _prosumers.ListAsync(cancellationToken);
        var active = people
            .Where(person => person.Status == "Active")
            .Select(person => new ProsumerOptionDto(person.Id, person.Name))
            .ToList();
        var targetId = _currentUser.Role == AppRoles.Prosumer ? _currentUser.ProsumerId : prosumerId;
        if (string.IsNullOrWhiteSpace(targetId))
        {
            return new ReservationOptionsDto(active, []);
        }

        if (active.All(person => person.Id != targetId))
        {
            throw Rule(400, "Choose an active prosumer.");
        }

        var now = _clock.UtcNow;
        var stations = await _catalog.ListStationsAsync(cancellationToken);
        var slots = await _catalog.ListSlotsAsync(cancellationToken);
        var holding = await _reservations.ListHoldingForProsumerAsync(targetId, null, cancellationToken);
        var availableStations = new List<StationOptionDto>();
        foreach (var station in stations.Where(item => item.Status == "Active"))
        {
            var availableSlots = new List<SlotOptionDto>();
            foreach (var slot in slots.Where(item => item.StationId == station.Id))
            {
                if (!slot.IsOpen || ColomboTime.AsUtc(slot.Start) <= now || !ColomboTime.IsInsideSevenDayWindow(slot.Start, now))
                {
                    continue;
                }

                var remaining = slot.Capacity - await _reservations.CountHoldingAsync(slot.Id, null, cancellationToken);
                if (remaining <= 0)
                {
                    continue;
                }

                var start = ColomboTime.AsUtc(slot.Start);
                var end = ColomboTime.AsUtc(slot.End);
                if (holding.Any(item => item.Start < end && item.End > start))
                {
                    continue;
                }

                availableSlots.Add(new SlotOptionDto(slot.Id, slot.Label, start, end, slot.Capacity, remaining));
            }

            if (availableSlots.Count > 0)
            {
                availableStations.Add(new StationOptionDto(
                    station.Id,
                    station.Name,
                    station.CapacityKwh,
                    availableSlots.OrderBy(item => item.Start).ToList()));
            }
        }

        return new ReservationOptionsDto(active, availableStations);
    }

    // Prosumers only see their own rows. ApprovedFuture and DueSoon are filters, and a date must be yyyy-MM-dd.
    public async Task<IReadOnlyList<ReservationDto>> SearchAsync(string? status, string? stationId, string? date, string? query, CancellationToken cancellationToken)
    {
        RequireSignedIn();
        var search = new ReservationSearch
        {
            StationId = string.IsNullOrWhiteSpace(stationId) ? null : stationId,
            ProsumerId = _currentUser.Role == AppRoles.Prosumer ? _currentUser.ProsumerId : null,
        };

        if (!string.IsNullOrWhiteSpace(status)
            && status is not ReservationStatus.ApprovedFuture
            && status is not ReservationStatus.DueSoon)
        {
            if (!ReservationStatus.Known.Contains(status))
            {
                throw Rule(400, "Unknown reservation status.");
            }

            search = new ReservationSearch
            {
                Status = status,
                StationId = search.StationId,
                ProsumerId = search.ProsumerId,
            };
        }

        if (!string.IsNullOrWhiteSpace(date))
        {
            if (!DateOnly.TryParse(date, out var day))
            {
                throw Rule(400, "Date must use yyyy-MM-dd.");
            }

            var range = ColomboTime.DayRangeUtc(day);
            search = new ReservationSearch
            {
                Status = search.Status,
                StationId = search.StationId,
                ProsumerId = search.ProsumerId,
                StartFromUtc = range.FromUtc,
                StartToUtc = range.ToUtc,
            };
        }

        var rows = await _reservations.SearchAsync(search, cancellationToken);
        var now = _clock.UtcNow;
        if (status == ReservationStatus.ApprovedFuture)
        {
            rows = rows.Where(item => IsApprovedFuture(item, now)).ToList();
        }
        else if (status == ReservationStatus.DueSoon)
        {
            rows = rows.Where(item => IsDueSoon(item, now)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var needle = query.Trim();
            var stations = await _catalog.ListStationsAsync(cancellationToken);
            var people = await _prosumers.ListAsync(cancellationToken);
            rows = rows.Where(item => MatchesQuery(item, needle, stations, people)).ToList();
        }

        var mapped = new List<ReservationDto>();
        foreach (var row in rows.OrderBy(item => item.Start))
        {
            mapped.Add(await Map(row, cancellationToken));
        }

        return mapped;
    }

    // Another prosumer's reservation is reported as not found.
    public async Task<ReservationDto> GetAsync(string id, CancellationToken cancellationToken)
    {
        var reservation = await RequireAccessible(id, cancellationToken);
        return await Map(reservation, cancellationToken);
    }

    // Only Requested or Approved. The replacement slot must be different and start at least 12 hours from now.
    public async Task<ReservationDto> ModifyAsync(string id, ModifyReservationRequest request, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Prosumer);
        var reservation = await RequireAccessible(id, cancellationToken);
        if (reservation.Status is not (ReservationStatus.Requested or ReservationStatus.Approved))
        {
            throw Rule(400, "Only a requested or approved reservation can be modified.");
        }

        var now = _clock.UtcNow;
        if (!ColomboTime.HasTwelveHourNotice(reservation.Start, now))
        {
            throw Rule(400, "Modification needs at least 12 hours before the current start.");
        }

        if (string.IsNullOrWhiteSpace(request.SlotId))
        {
            throw Rule(400, "An energy slot is required.");
        }

        if (request.SlotId == reservation.SlotId)
        {
            throw Rule(400, "Choose a different slot.");
        }

        var slot = await RequireSlot(request.SlotId, cancellationToken);
        var station = await RequireStation(slot.StationId, cancellationToken);
        EnsureBookable(slot, station, reservation.EnergyKwh, now);
        if (!ColomboTime.HasTwelveHourNotice(slot.Start, now))
        {
            throw Rule(400, "The new slot must start at least 12 hours from now.");
        }

        await EnsureCapacity(slot, reservation.Id, cancellationToken);
        await EnsureNoOverlap(reservation.ProsumerId, slot.Start, slot.End, reservation.Id, cancellationToken);

        reservation.StationId = station.Id;
        reservation.SlotId = slot.Id;
        reservation.Start = ColomboTime.AsUtc(slot.Start);
        reservation.End = ColomboTime.AsUtc(slot.End);
        AddHistory(reservation, "Modified", "Reservation moved to another slot.");
        await _reservations.ReplaceAsync(reservation, cancellationToken);
        return await Map(reservation, cancellationToken);
    }

    // Only a capacity-holding reservation, and only with 12 hours' notice. Cancelling releases the hold.
    public async Task<ReservationDto> CancelAsync(string id, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Prosumer);
        var reservation = await RequireAccessible(id, cancellationToken);
        if (!ReservationStatus.Holding.Contains(reservation.Status))
        {
            throw Rule(400, "This reservation can no longer be cancelled.");
        }

        if (!ColomboTime.HasTwelveHourNotice(reservation.Start, _clock.UtcNow))
        {
            throw Rule(400, "Cancellation needs at least 12 hours before the reserved start.");
        }

        reservation.Status = ReservationStatus.Cancelled;
        AddHistory(reservation, "Cancelled", "Cancelled with at least 12 hours' notice. The capacity hold was released.");
        await _reservations.ReplaceAsync(reservation, cancellationToken);
        return await Map(reservation, cancellationToken);
    }

    // Backoffice only, and only a Requested reservation whose station is active, slot is open, and start is still ahead.
    public async Task<ReservationDto> ApproveAsync(string id, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Backoffice);
        var reservation = await RequireAccessible(id, cancellationToken);
        if (reservation.Status != ReservationStatus.Requested)
        {
            throw Rule(400, "Only a requested reservation can be approved.");
        }

        var slot = await RequireSlot(reservation.SlotId, cancellationToken);
        var station = await RequireStation(reservation.StationId, cancellationToken);
        if (station.Status != "Active")
        {
            throw Rule(400, "The station is not active.");
        }

        if (!slot.IsOpen)
        {
            throw Rule(400, "The energy slot is not open.");
        }

        if (ColomboTime.AsUtc(reservation.Start) <= _clock.UtcNow)
        {
            throw Rule(400, "The reserved start time has already passed.");
        }

        reservation.Status = ReservationStatus.Approved;
        AddHistory(reservation, "Approved", "Approved by the Backoffice Officer. QR generation is still waiting.");
        await _reservations.ReplaceAsync(reservation, cancellationToken);
        return await Map(reservation, cancellationToken);
    }

    // Backoffice only. A reason is required, and only a Requested reservation can be rejected.
    public async Task<ReservationDto> RejectAsync(string id, RejectReservationRequest request, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Backoffice);
        var reservation = await RequireAccessible(id, cancellationToken);
        if (reservation.Status != ReservationStatus.Requested)
        {
            throw Rule(400, "Only a requested reservation can be rejected.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw Rule(400, "A rejection reason is required.");
        }

        reservation.Status = ReservationStatus.Rejected;
        AddHistory(reservation, "Rejected", request.Reason.Trim());
        await _reservations.ReplaceAsync(reservation, cancellationToken);
        return await Map(reservation, cancellationToken);
    }

    // Grid Operator only, and only an Approved reservation whose start is still ahead.
    public async Task<ReservationDto> ScheduleAsync(string id, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.GridOperator);
        var reservation = await RequireAccessible(id, cancellationToken);
        if (reservation.Status != ReservationStatus.Approved)
        {
            throw Rule(400, "Only an approved reservation can be marked scheduled.");
        }

        if (ColomboTime.AsUtc(reservation.Start) <= _clock.UtcNow)
        {
            throw Rule(400, "The reserved start time has already passed.");
        }

        reservation.Status = ReservationStatus.Scheduled;
        AddHistory(reservation, "Scheduled", "Grid Operator confirmed the schedule.");
        await _reservations.ReplaceAsync(reservation, cancellationToken);
        return await Map(reservation, cancellationToken);
    }

    // Prosumers get counts for their own reservations. Due soon means a hold starting in under 12 hours.
    public async Task<ReservationDashboardDto> GetDashboardAsync(CancellationToken cancellationToken)
    {
        RequireSignedIn();
        var rows = await _reservations.SearchAsync(new ReservationSearch
        {
            ProsumerId = _currentUser.Role == AppRoles.Prosumer ? _currentUser.ProsumerId : null,
        }, cancellationToken);
        var now = _clock.UtcNow;
        return new ReservationDashboardDto(
            rows.Count(item => item.Status == ReservationStatus.Requested),
            rows.Count(item => IsApprovedFuture(item, now)),
            rows.Count(item => IsDueSoon(item, now)));
    }

    private async Task<EnergyReservation> RequireAccessible(string id, CancellationToken cancellationToken)
    {
        RequireSignedIn();
        var reservation = await _reservations.GetAsync(id, cancellationToken);
        if (reservation is null)
        {
            throw Rule(404, "Reservation not found.");
        }

        if (_currentUser.Role == AppRoles.Prosumer && reservation.ProsumerId != _currentUser.ProsumerId)
        {
            throw Rule(404, "Reservation not found.");
        }

        return reservation;
    }

    private async Task<ProsumerSnapshot> RequireActiveProsumer(string prosumerId, CancellationToken cancellationToken)
    {
        var prosumer = await _prosumers.FindAsync(prosumerId, cancellationToken);
        if (prosumer is null || prosumer.Status != "Active")
        {
            throw Rule(403, "Only an active prosumer can create a reservation.");
        }

        return prosumer;
    }

    private async Task<SlotSnapshot> RequireSlot(string slotId, CancellationToken cancellationToken)
    {
        var slot = await _catalog.GetSlotAsync(slotId, cancellationToken);
        if (slot is null)
        {
            throw Rule(404, "The energy slot was not found.");
        }

        return slot;
    }

    private async Task<StationSnapshot> RequireStation(string stationId, CancellationToken cancellationToken)
    {
        var station = await _catalog.GetStationAsync(stationId, cancellationToken);
        if (station is null)
        {
            throw Rule(404, "The station was not found.");
        }

        return station;
    }

    private static void EnsureBookable(SlotSnapshot slot, StationSnapshot station, double energyKwh, DateTime now)
    {
        if (station.Status != "Active")
        {
            throw Rule(400, "The station is not active.");
        }

        if (!slot.IsOpen)
        {
            throw Rule(400, "The energy slot is not open.");
        }

        if (ColomboTime.AsUtc(slot.Start) <= now)
        {
            throw Rule(400, "The reserved start time has already passed.");
        }

        if (!ColomboTime.IsInsideSevenDayWindow(slot.Start, now))
        {
            throw Rule(400, "The start time must fall within the next 7 days.");
        }

        if (energyKwh > station.CapacityKwh)
        {
            throw Rule(400, "The requested energy exceeds the station capacity.");
        }
    }

    private async Task EnsureCapacity(SlotSnapshot slot, string? ignoreId, CancellationToken cancellationToken)
    {
        var held = await _reservations.CountHoldingAsync(slot.Id, ignoreId, cancellationToken);
        if (held >= slot.Capacity)
        {
            throw Rule(409, "This slot is already fully booked.");
        }
    }

    private async Task EnsureNoOverlap(string prosumerId, DateTime start, DateTime end, string? ignoreId, CancellationToken cancellationToken)
    {
        var existing = await _reservations.ListHoldingForProsumerAsync(prosumerId, ignoreId, cancellationToken);
        var startUtc = ColomboTime.AsUtc(start);
        var endUtc = ColomboTime.AsUtc(end);
        if (existing.Any(item => item.Start < endUtc && item.End > startUtc))
        {
            throw Rule(409, "You already have a reservation that overlaps this time.");
        }
    }

    private async Task<string> NextCode(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var code = $"RS-{Random.Shared.Next(1000, 10000)}";
            if (!await _reservations.CodeExistsAsync(code, cancellationToken))
            {
                return code;
            }
        }

        throw Rule(500, "A reservation code could not be assigned.");
    }

    private void AddHistory(EnergyReservation reservation, string action, string note)
    {
        reservation.History.Add(new ReservationHistoryEntry
        {
            At = _clock.UtcNow,
            Action = action,
            ActorId = _currentUser.UserId,
            ActorRole = _currentUser.Role,
            Note = note,
        });
    }

    private async Task<ReservationDto> Map(EnergyReservation reservation, CancellationToken cancellationToken)
    {
        var prosumer = await _prosumers.FindAsync(reservation.ProsumerId, cancellationToken);
        var station = await _catalog.GetStationAsync(reservation.StationId, cancellationToken);
        var slot = await _catalog.GetSlotAsync(reservation.SlotId, cancellationToken);
        var allowed = new List<string>();
        var blocks = new Dictionary<string, string>();
        FillActions(reservation, station, slot, allowed, blocks);
        return new ReservationDto(
            reservation.Id,
            reservation.Code,
            reservation.ProsumerId,
            prosumer?.Name ?? reservation.ProsumerId,
            reservation.StationId,
            station?.Name ?? reservation.StationId,
            reservation.SlotId,
            slot?.Label ?? reservation.SlotId,
            ColomboTime.AsUtc(reservation.Start),
            ColomboTime.AsUtc(reservation.End),
            reservation.Status,
            reservation.ServiceType,
            reservation.EnergyKwh,
            reservation.History.Select(item => new ReservationHistoryDto(
                ColomboTime.AsUtc(item.At), item.Action, item.ActorId, item.ActorRole, item.Note)).ToList(),
            allowed,
            blocks);
    }

    private void FillActions(EnergyReservation reservation, StationSnapshot? station, SlotSnapshot? slot, List<string> allowed, Dictionary<string, string> blocks)
    {
        var now = _clock.UtcNow;
        if (_currentUser.Role == AppRoles.Backoffice)
        {
            Consider(allowed, blocks, "approve", ApproveBlock(reservation, station, slot, now));
            Consider(allowed, blocks, "reject", reservation.Status == ReservationStatus.Requested ? "" : "Only a requested reservation can be rejected.");
        }
        else if (_currentUser.Role == AppRoles.GridOperator)
        {
            Consider(allowed, blocks, "schedule", ScheduleBlock(reservation, now));
        }
        else if (_currentUser.Role == AppRoles.Prosumer)
        {
            Consider(allowed, blocks, "cancel", CancelBlock(reservation, now));
            Consider(allowed, blocks, "modify", ModifyBlock(reservation, now));
        }
    }

    private static string ApproveBlock(EnergyReservation reservation, StationSnapshot? station, SlotSnapshot? slot, DateTime now)
    {
        if (reservation.Status != ReservationStatus.Requested)
        {
            return "Only a requested reservation can be approved.";
        }

        if (station is null || station.Status != "Active")
        {
            return "The station is not active.";
        }

        if (slot is null || !slot.IsOpen)
        {
            return "The energy slot is not open.";
        }

        if (ColomboTime.AsUtc(reservation.Start) <= now)
        {
            return "The reserved start time has already passed.";
        }

        return "";
    }

    private static string ScheduleBlock(EnergyReservation reservation, DateTime now)
    {
        if (reservation.Status != ReservationStatus.Approved)
        {
            return "Only an approved reservation can be marked scheduled.";
        }

        if (ColomboTime.AsUtc(reservation.Start) <= now)
        {
            return "The reserved start time has already passed.";
        }

        return "";
    }

    private static string CancelBlock(EnergyReservation reservation, DateTime now)
    {
        if (!ReservationStatus.Holding.Contains(reservation.Status))
        {
            return "This reservation can no longer be cancelled.";
        }

        if (!ColomboTime.HasTwelveHourNotice(reservation.Start, now))
        {
            return "Cancellation needs at least 12 hours before the reserved start.";
        }

        return "";
    }

    private static string ModifyBlock(EnergyReservation reservation, DateTime now)
    {
        if (reservation.Status is not (ReservationStatus.Requested or ReservationStatus.Approved))
        {
            return "Only a requested or approved reservation can be modified.";
        }

        if (!ColomboTime.HasTwelveHourNotice(reservation.Start, now))
        {
            return "Modification needs at least 12 hours before the current start.";
        }

        return "";
    }

    private static void Consider(List<string> allowed, Dictionary<string, string> blocks, string action, string reason)
    {
        if (string.IsNullOrEmpty(reason))
        {
            allowed.Add(action);
        }
        else
        {
            blocks[action] = reason;
        }
    }

    private static bool IsApprovedFuture(EnergyReservation reservation, DateTime now)
    {
        return reservation.Status is ReservationStatus.Approved or ReservationStatus.Scheduled
            && ColomboTime.AsUtc(reservation.Start) > now;
    }

    private static bool IsDueSoon(EnergyReservation reservation, DateTime now)
    {
        if (!ReservationStatus.Holding.Contains(reservation.Status))
        {
            return false;
        }

        var hours = (ColomboTime.AsUtc(reservation.Start) - now).TotalHours;
        return hours > 0 && hours < 12;
    }

    private static bool MatchesQuery(
        EnergyReservation reservation,
        string needle,
        IReadOnlyList<StationSnapshot> stations,
        IReadOnlyList<ProsumerSnapshot> people)
    {
        var station = stations.FirstOrDefault(item => item.Id == reservation.StationId)?.Name ?? "";
        var person = people.FirstOrDefault(item => item.Id == reservation.ProsumerId)?.Name ?? "";
        return reservation.Code.Contains(needle, StringComparison.OrdinalIgnoreCase)
            || station.Contains(needle, StringComparison.OrdinalIgnoreCase)
            || person.Contains(needle, StringComparison.OrdinalIgnoreCase);
    }

    private void RequireSignedIn()
    {
        if (!_currentUser.IsAuthenticated)
        {
            throw Rule(401, "Sign in is required.");
        }
    }

    private void RequireRole(params string[] roles)
    {
        RequireSignedIn();
        if (!roles.Contains(_currentUser.Role))
        {
            throw Rule(403, "You do not have permission for this reservation action.");
        }
    }

    private static ReservationRuleException Rule(int statusCode, string message)
    {
        return new ReservationRuleException(statusCode, message);
    }
}
