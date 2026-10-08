using System.Globalization;
using MongoDB.Bson;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.Interfaces;

namespace SmartSolar.Microgrid.Services;

// Energy slot reservations: create, update, and cancel.
// A booking must be scheduled within the next 7 Colombo calendar days.
// Create does not require 12 hours' notice.
// Update and cancel do: at least 12 hours must remain before the scheduled time.
// The API owns these rules. Web and Android only display the result.
public sealed class ReservationService : IReservationService
{
    private const string ProsumerRole = "Prosumer";
    private const string BackofficeRole = "Backoffice";
    private const string GridOperatorRole = "GridOperator";
    private static readonly ReservationStatus[] HoldingStatuses = [ReservationStatus.Pending, ReservationStatus.Approved];

    private readonly IReservationRepository _reservations;
    private readonly IUserRepository _users;
    private readonly IStationRepository _stations;
    private readonly IEnergyBookingSlotRepository _slots;

    public ReservationService(
        IReservationRepository reservations,
        IUserRepository users,
        IStationRepository stations,
        IEnergyBookingSlotRepository slots)
    {
        _reservations = reservations;
        _users = users;
        _stations = stations;
        _slots = slots;
    }

    public async Task<ReservationOutcome<ReservationResponse>> CreateAsync(
        ReservationActor actor,
        CreateReservationRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsProsumer(actor))
        {
            return Invalid<ReservationResponse>("Only an authenticated Prosumer can create a reservation.");
        }

        if (!string.Equals(actor.UserId, request.ProsumerId, StringComparison.Ordinal))
        {
            return Invalid<ReservationResponse>("A Prosumer can only create a reservation for their own account.");
        }

        var prosumerError = await RequireActiveProsumerAsync(request.ProsumerId, cancellationToken);
        if (prosumerError is not null)
        {
            return Invalid<ReservationResponse>(prosumerError);
        }

        // Seven-day window is enforced inside RequireBookableSlotAsync. Twelve hours is not required to create.
        var booking = await RequireBookableSlotAsync(request.StationId, request.SlotId, request.ScheduledAtUtc, sameSlotHold: false, cancellationToken);
        if (booking.Error is not null || booking.Slot is null)
        {
            return Invalid<ReservationResponse>(booking.Error ?? "The slot is not available.");
        }

        var conflict = await FindConflictAsync(request.ProsumerId, booking.Slot, exceptReservationId: null, cancellationToken);
        if (conflict is not null)
        {
            return Invalid<ReservationResponse>(conflict);
        }

        if (!await HoldSlotAsync(booking.Slot, cancellationToken))
        {
            return Invalid<ReservationResponse>("The slot is not available.");
        }

        var now = DateTime.UtcNow;
        var reservationId = ObjectId.GenerateNewId().ToString();
        var reservation = new EnergyReservation
        {
            ReservationId = reservationId,
            Code = reservationId,
            ProsumerId = request.ProsumerId,
            StationId = booking.Slot.StationId,
            SlotId = booking.Slot.SlotId,
            ScheduledDateTime = booking.Start,
            Status = ReservationStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now,
        };

        try
        {
            await _reservations.InsertAsync(reservation, cancellationToken);
        }
        catch
        {
            await ReleaseSlotAsync(booking.Slot.SlotId, cancellationToken);
            throw;
        }

        return Ok(ToResponse(reservation));
    }

    public async Task<ReservationOutcome<ReservationResponse>> UpdateAsync(
        ReservationActor actor,
        string reservationId,
        UpdateReservationRequest request,
        CancellationToken cancellationToken)
    {
        var reservation = await _reservations.GetByIdAsync(reservationId, cancellationToken);
        if (reservation is null)
        {
            return NotFound<ReservationResponse>("Reservation not found.");
        }

        if (!OwnsReservation(actor, reservation))
        {
            return Forbidden<ReservationResponse>("Only the prosumer who made this reservation can update it.");
        }

        var statusError = ChangeableStatus(reservation);
        if (statusError is not null)
        {
            return Invalid<ReservationResponse>(statusError);
        }

        if (request.Status != reservation.Status)
        {
            return Invalid<ReservationResponse>("Reservation status cannot be changed here. Cancel the reservation to set it to Cancelled.");
        }

        if (!string.Equals(request.ProsumerId, reservation.ProsumerId, StringComparison.Ordinal))
        {
            return Invalid<ReservationResponse>("The prosumer on a reservation cannot be changed.");
        }

        // Update needs 12 hours' notice before the current scheduled time.
        if (!HasTwelveHourNotice(reservation.ScheduledDateTime))
        {
            return Invalid<ReservationResponse>("At least 12 hours must remain before the scheduled time.");
        }

        var sameSlot = string.Equals(request.SlotId, reservation.SlotId, StringComparison.Ordinal);
        var booking = await RequireBookableSlotAsync(request.StationId, request.SlotId, request.ScheduledAtUtc, sameSlot, cancellationToken);
        if (booking.Error is not null || booking.Slot is null)
        {
            return Invalid<ReservationResponse>(booking.Error ?? "The slot is not available.");
        }

        // The replacement time must also still have 12 hours' notice, and it must stay inside the 7-day window.
        if (!HasTwelveHourNotice(booking.Start))
        {
            return Invalid<ReservationResponse>("At least 12 hours must remain before the scheduled time.");
        }

        var conflict = await FindConflictAsync(reservation.ProsumerId, booking.Slot, reservation.ReservationId, cancellationToken);
        if (conflict is not null)
        {
            return Invalid<ReservationResponse>(conflict);
        }

        if (!sameSlot && !await HoldSlotAsync(booking.Slot, cancellationToken))
        {
            return Invalid<ReservationResponse>("The slot is not available.");
        }

        var previousSlotId = reservation.SlotId;
        reservation.StationId = booking.Slot.StationId;
        reservation.SlotId = booking.Slot.SlotId;
        reservation.ScheduledDateTime = booking.Start;
        reservation.UpdatedAt = DateTime.UtcNow;

        try
        {
            if (!await _reservations.ReplaceAsync(reservation, cancellationToken))
            {
                if (!sameSlot)
                {
                    await ReleaseSlotAsync(booking.Slot.SlotId, cancellationToken);
                }

                return NotFound<ReservationResponse>("Reservation not found.");
            }
        }
        catch
        {
            if (!sameSlot)
            {
                await ReleaseSlotAsync(booking.Slot.SlotId, cancellationToken);
            }

            throw;
        }

        if (!sameSlot)
        {
            await ReleaseSlotAsync(previousSlotId, cancellationToken);
        }

        return Ok(ToResponse(reservation));
    }

    public async Task<ReservationOutcome<ReservationResponse>> CancelAsync(
        ReservationActor actor,
        string reservationId,
        CancellationToken cancellationToken)
    {
        var reservation = await _reservations.GetByIdAsync(reservationId, cancellationToken);
        if (reservation is null)
        {
            return NotFound<ReservationResponse>("Reservation not found.");
        }

        if (!OwnsReservation(actor, reservation))
        {
            return Forbidden<ReservationResponse>("Only the prosumer who made this reservation can cancel it.");
        }

        var statusError = ChangeableStatus(reservation);
        if (statusError is not null)
        {
            return Invalid<ReservationResponse>(statusError);
        }

        // Cancel needs 12 hours' notice before the scheduled time. Inside that window the reservation stays unchanged.
        if (!HasTwelveHourNotice(reservation.ScheduledDateTime))
        {
            return Invalid<ReservationResponse>("At least 12 hours must remain before the scheduled time.");
        }

        var now = DateTime.UtcNow;
        reservation.Status = ReservationStatus.Cancelled;
        reservation.CancelledAt = now;
        reservation.UpdatedAt = now;
        if (!await _reservations.ReplaceAsync(reservation, cancellationToken))
        {
            return NotFound<ReservationResponse>("Reservation not found.");
        }

        await ReleaseSlotAsync(reservation.SlotId, cancellationToken);
        return Ok(ToResponse(reservation));
    }

    public async Task<ReservationOutcome<ReservationResponse>> GetAsync(
        ReservationActor actor,
        string reservationId,
        CancellationToken cancellationToken)
    {
        var reservation = await _reservations.GetByIdAsync(reservationId, cancellationToken);
        if (reservation is null)
        {
            return NotFound<ReservationResponse>("Reservation not found.");
        }

        if (!CanView(actor, reservation))
        {
            return Forbidden<ReservationResponse>("You cannot view this reservation.");
        }

        return Ok(ToResponse(reservation));
    }

    public async Task<ReservationOutcome<IReadOnlyList<ReservationResponse>>> GetForProsumerAsync(
        ReservationActor actor,
        string prosumerId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(prosumerId))
        {
            return Invalid<IReadOnlyList<ReservationResponse>>("A prosumer is required.");
        }

        if (IsProsumer(actor) && !string.Equals(actor.UserId, prosumerId, StringComparison.Ordinal))
        {
            return Forbidden<IReadOnlyList<ReservationResponse>>("You can only view your own reservations.");
        }

        if (!IsProsumer(actor) && !IsStaff(actor))
        {
            return Forbidden<IReadOnlyList<ReservationResponse>>("You cannot view these reservations.");
        }

        var rows = await _reservations.ListByProsumerAsync(prosumerId, cancellationToken);
        return Ok<IReadOnlyList<ReservationResponse>>(rows.Select(ToResponse).ToArray());
    }

    public async Task<ReservationOutcome<IReadOnlyList<ReservationResponse>>> GetAllForStaffAsync(
        ReservationActor actor,
        CancellationToken cancellationToken)
    {
        if (!IsStaff(actor))
        {
            return Forbidden<IReadOnlyList<ReservationResponse>>("Only Backoffice or Grid Operator staff can list all reservations.");
        }

        var rows = await _reservations.ListAllAsync(cancellationToken);
        return Ok<IReadOnlyList<ReservationResponse>>(rows.Select(ToResponse).ToArray());
    }

    public async Task<ReservationOutcome<ReservationResponse>> ApproveAsync(
        ReservationActor actor,
        string reservationId,
        CancellationToken cancellationToken)
    {
        if (!IsBackoffice(actor))
        {
            return Forbidden<ReservationResponse>("Only Backoffice can approve a reservation.");
        }

        var reservation = await _reservations.GetByIdAsync(reservationId, cancellationToken);
        if (reservation is null)
        {
            return NotFound<ReservationResponse>("Reservation not found.");
        }

        if (reservation.Status == ReservationStatus.Approved)
        {
            return Invalid<ReservationResponse>("This reservation is already approved.");
        }

        if (reservation.Status != ReservationStatus.Pending)
        {
            return Invalid<ReservationResponse>("Only a pending reservation can be approved.");
        }

        reservation.Status = ReservationStatus.Approved;
        reservation.UpdatedAt = DateTime.UtcNow;
        if (!await _reservations.ReplaceAsync(reservation, cancellationToken))
        {
            return NotFound<ReservationResponse>("Reservation not found.");
        }

        return Ok(ToResponse(reservation));
    }

    private async Task<string?> RequireActiveProsumerAsync(string prosumerId, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(prosumerId, cancellationToken);
        if (user is null)
        {
            return "Prosumer not found.";
        }

        if (!string.Equals(user.Role, ProsumerRole, StringComparison.Ordinal))
        {
            return "This account is not a Solar Prosumer.";
        }

        if (!user.IsActive || user.AccountStatus != AccountStatuses.Active)
        {
            return "The prosumer account is not active.";
        }

        return null;
    }

    private async Task<BookableSlot> RequireBookableSlotAsync(
        string stationId,
        string slotId,
        DateTime scheduledAtUtc,
        bool sameSlotHold,
        CancellationToken cancellationToken)
    {
        var station = await _stations.GetByIdAsync(stationId, cancellationToken);
        if (station is null)
        {
            return BookableSlot.Fail("Station not found.");
        }

        if (station.Status != StationStatus.Active)
        {
            return BookableSlot.Fail("The station is not active.");
        }

        var slot = await _slots.GetByIdAsync(slotId, cancellationToken);
        if (slot is null)
        {
            return BookableSlot.Fail("Slot not found.");
        }

        if (!string.Equals(slot.StationId, station.StationId, StringComparison.Ordinal))
        {
            return BookableSlot.Fail("The slot does not belong to the selected station.");
        }

        if (!TrySlotWindow(slot, out var start, out _))
        {
            return BookableSlot.Fail("The slot is not available.");
        }

        if (!ScheduledTimeMatchesSlot(scheduledAtUtc, start))
        {
            return BookableSlot.Fail("The scheduled time must match the selected slot.");
        }

        if (start <= DateTime.UtcNow)
        {
            return BookableSlot.Fail("This slot has already started. Choose a later time.");
        }

        if (!IsWithinNextSevenDays(start))
        {
            return BookableSlot.Fail("The scheduled booking must be within the next 7 days.");
        }

        var available = slot.Status == EnergyBookingSlotStatus.Open && slot.RemainingCapacity > 0;
        if (!sameSlotHold && !available)
        {
            return BookableSlot.Fail("The slot is not available.");
        }

        if (sameSlotHold && slot.Status == EnergyBookingSlotStatus.Closed)
        {
            return BookableSlot.Fail("The slot is not available.");
        }

        return new BookableSlot(slot, start, null);
    }

    private async Task<string?> FindConflictAsync(
        string prosumerId,
        EnergyBookingSlots slot,
        string? exceptReservationId,
        CancellationToken cancellationToken)
    {
        if (!TrySlotWindow(slot, out var start, out var end))
        {
            return "The slot is not available.";
        }

        var existing = await _reservations.ListByProsumerAndStatusesAsync(
            prosumerId,
            HoldingStatuses,
            exceptReservationId,
            cancellationToken);

        foreach (var reservation in existing)
        {
            if (string.Equals(reservation.SlotId, slot.SlotId, StringComparison.Ordinal))
            {
                return "This prosumer already has a reservation for the selected slot.";
            }

            var otherSlot = await _slots.GetByIdAsync(reservation.SlotId, cancellationToken);
            if (otherSlot is not null && TrySlotWindow(otherSlot, out var otherStart, out var otherEnd))
            {
                if (start < otherEnd && otherStart < end)
                {
                    return "This prosumer already has a reservation that conflicts with the selected time.";
                }
            }
            else if (reservation.ScheduledDateTime == start)
            {
                return "This prosumer already has a reservation that conflicts with the selected time.";
            }
        }

        return null;
    }

    private async Task<bool> HoldSlotAsync(EnergyBookingSlots slot, CancellationToken cancellationToken)
    {
        var current = await _slots.GetByIdAsync(slot.SlotId, cancellationToken);
        if (current is null || current.Status != EnergyBookingSlotStatus.Open || current.RemainingCapacity <= 0)
        {
            return false;
        }

        current.RemainingCapacity -= 1;
        if (current.RemainingCapacity == 0)
        {
            current.Status = EnergyBookingSlotStatus.Full;
        }

        return await _slots.ReplaceAsync(current, cancellationToken);
    }

    private async Task ReleaseSlotAsync(string slotId, CancellationToken cancellationToken)
    {
        var slot = await _slots.GetByIdAsync(slotId, cancellationToken);
        if (slot is null || slot.RemainingCapacity >= slot.TotalCapacity)
        {
            return;
        }

        slot.RemainingCapacity += 1;
        if (slot.Status == EnergyBookingSlotStatus.Full)
        {
            slot.Status = EnergyBookingSlotStatus.Open;
        }

        await _slots.ReplaceAsync(slot, cancellationToken);
    }

    private static string? ChangeableStatus(EnergyReservation reservation)
    {
        if (reservation.Status == ReservationStatus.Cancelled)
        {
            return "This reservation is already cancelled.";
        }

        if (reservation.Status == ReservationStatus.Completed)
        {
            return "This reservation is already completed.";
        }

        if (reservation.Status is not (ReservationStatus.Pending or ReservationStatus.Approved))
        {
            return "This reservation can no longer be changed.";
        }

        return null;
    }

    private static bool OwnsReservation(ReservationActor actor, EnergyReservation reservation) =>
        IsProsumer(actor) && string.Equals(actor.UserId, reservation.ProsumerId, StringComparison.Ordinal);

    private static bool CanView(ReservationActor actor, EnergyReservation reservation) =>
        IsStaff(actor) || (IsProsumer(actor) && string.Equals(actor.UserId, reservation.ProsumerId, StringComparison.Ordinal));

    private static bool IsProsumer(ReservationActor actor) =>
        actor.Role == ProsumerRole && !string.IsNullOrWhiteSpace(actor.UserId);

    private static bool IsBackoffice(ReservationActor actor) =>
        actor.Role == BackofficeRole && !string.IsNullOrWhiteSpace(actor.UserId);

    private static bool IsStaff(ReservationActor actor) =>
        actor.Role is BackofficeRole or GridOperatorRole && !string.IsNullOrWhiteSpace(actor.UserId);

    // True when the scheduled instant is at least 12 hours ahead of now, in UTC.
    private static bool HasTwelveHourNotice(DateTime scheduledAtUtc)
    {
        var start = scheduledAtUtc.Kind == DateTimeKind.Local
            ? scheduledAtUtc.ToUniversalTime()
            : DateTime.SpecifyKind(scheduledAtUtc, DateTimeKind.Utc);
        return start >= DateTime.UtcNow.AddHours(12);
    }

    // "Within 7 days": later than now, and no later than the end of the seventh Colombo calendar day.
    private static bool IsWithinNextSevenDays(DateTime startUtc)
    {
        var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
        var start = DateTime.SpecifyKind(startUtc, DateTimeKind.Utc);
        if (start <= now)
        {
            return false;
        }

        var zone = ColomboZone();
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(now, zone);
        var startLocal = TimeZoneInfo.ConvertTimeFromUtc(start, zone);
        var limit = nowLocal.Date.AddDays(7).AddHours(23).AddMinutes(59).AddSeconds(59).AddMilliseconds(999);
        return startLocal <= limit;
    }

    private static TimeZoneInfo ColomboZone()
    {
        if (TimeZoneInfo.TryFindSystemTimeZoneById("Sri Lanka Standard Time", out var windows))
        {
            return windows;
        }

        if (TimeZoneInfo.TryFindSystemTimeZoneById("Asia/Colombo", out var iana))
        {
            return iana;
        }

        return TimeZoneInfo.CreateCustomTimeZone("Asia/Colombo", TimeSpan.FromMinutes(330), "Asia/Colombo", "Asia/Colombo");
    }

    private static bool ScheduledTimeMatchesSlot(DateTime scheduledAtUtc, DateTime slotStartUtc)
    {
        var scheduled = scheduledAtUtc.Kind == DateTimeKind.Local
            ? scheduledAtUtc.ToUniversalTime()
            : DateTime.SpecifyKind(scheduledAtUtc, DateTimeKind.Utc);
        return scheduled == slotStartUtc;
    }

    private static bool TrySlotWindow(EnergyBookingSlots slot, out DateTime startUtc, out DateTime endUtc)
    {
        startUtc = default;
        endUtc = default;
        if (!TimeOnly.TryParseExact(slot.StartTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start)
            || !TimeOnly.TryParseExact(slot.EndTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end)
            || start >= end)
        {
            return false;
        }

        var date = DateOnly.FromDateTime(DateTime.SpecifyKind(slot.Date, DateTimeKind.Utc));
        startUtc = date.ToDateTime(start, DateTimeKind.Utc);
        endUtc = date.ToDateTime(end, DateTimeKind.Utc);
        return true;
    }

    private static ReservationResponse ToResponse(EnergyReservation reservation) => new()
    {
        ReservationId = reservation.ReservationId,
        ProsumerId = reservation.ProsumerId,
        StationId = reservation.StationId,
        SlotId = reservation.SlotId,
        ScheduledAtUtc = reservation.ScheduledDateTime,
        Status = reservation.Status,
        CreatedAtUtc = reservation.CreatedAt,
        UpdatedAtUtc = reservation.UpdatedAt,
    };

    private static ReservationOutcome<T> Ok<T>(T value) => new(value);

    private static ReservationOutcome<T> Invalid<T>(string message) =>
        new(default, ReservationFailure.Invalid, message);

    private static ReservationOutcome<T> NotFound<T>(string message) =>
        new(default, ReservationFailure.NotFound, message);

    private static ReservationOutcome<T> Forbidden<T>(string message) =>
        new(default, ReservationFailure.Forbidden, message);

    private readonly record struct BookableSlot(EnergyBookingSlots? Slot, DateTime Start, string? Error)
    {
        public static BookableSlot Fail(string error) => new(null, default, error);
    }
}
