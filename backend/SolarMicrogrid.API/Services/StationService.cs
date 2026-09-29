using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.DTOs;
using SolarMicrogrid.API.Helpers;
using SolarMicrogrid.API.Interfaces;
using SolarMicrogrid.API.Repositories;

namespace SolarMicrogrid.API.Services;

public class StationService : IStationService
{
    private readonly ICatalogStore _catalog;
    private readonly IReservationRepository _reservations;
    private readonly ICurrentUser _currentUser;

    public StationService(ICatalogStore catalog, IReservationRepository reservations, ICurrentUser currentUser)
    {
        _catalog = catalog;
        _reservations = reservations;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<StationDto>> ListStationsAsync(CancellationToken cancellationToken)
    {
        RequireSignedIn();
        var stations = await _catalog.ListStationsAsync(cancellationToken);
        var rows = new List<StationDto>();
        foreach (var station in stations.OrderBy(item => item.Name))
        {
            rows.Add(await ToStationDto(station, cancellationToken));
        }

        return rows;
    }

    public async Task<IReadOnlyList<NearbyStationDto>> ListNearbyAsync(double latitude, double longitude, double radiusKm, CancellationToken cancellationToken)
    {
        RequireSignedIn();
        if (latitude is < -90 or > 90 || longitude is < -180 or > 180)
        {
            throw Rule(400, "Latitude and longitude are outside the valid range.");
        }

        if (radiusKm <= 0 || radiusKm > 200)
        {
            throw Rule(400, "Search radius must be between 0 and 200 kilometres.");
        }

        var stations = await _catalog.ListStationsAsync(cancellationToken);
        var nearby = new List<NearbyStationDto>();
        foreach (var station in stations)
        {
            if (station.Status != "Active" || (station.Latitude == 0 && station.Longitude == 0))
            {
                continue;
            }

            var distance = DistanceKm(latitude, longitude, station.Latitude, station.Longitude);
            if (distance > radiusKm)
            {
                continue;
            }

            var dto = await ToStationDto(station, cancellationToken);
            nearby.Add(new NearbyStationDto
            {
                Id = dto.Id,
                Code = dto.Code,
                Name = dto.Name,
                Address = dto.Address,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                CapacityKwh = dto.CapacityKwh,
                BatterySlots = dto.BatterySlots,
                Hours = dto.Hours,
                Status = dto.Status,
                HoldingCount = dto.HoldingCount,
                DistanceKm = Math.Round(distance, 2),
            });
        }

        return nearby.OrderBy(item => item.DistanceKm).ToList();
    }

    public async Task<StationDto> GetStationAsync(string id, CancellationToken cancellationToken)
    {
        RequireSignedIn();
        var station = await RequireStation(id, cancellationToken);
        return await ToStationDto(station, cancellationToken);
    }

    public async Task<StationDto> CreateStationAsync(StationWriteRequest request, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Backoffice);
        ValidateStation(request);
        if (await _catalog.StationCodeExistsAsync(request.Code.Trim(), null, cancellationToken))
        {
            throw Rule(409, "A station with this code already exists.");
        }

        var station = new StationDocument
        {
            Id = $"st-{Guid.NewGuid():N}"[..11],
            Status = "Active",
        };
        Apply(station, request);
        await _catalog.InsertStationAsync(station, cancellationToken);
        return await ToStationDto(station, cancellationToken);
    }

    public async Task<StationDto> UpdateStationAsync(string id, StationWriteRequest request, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Backoffice);
        ValidateStation(request);
        var station = await RequireStation(id, cancellationToken);
        if (await _catalog.StationCodeExistsAsync(request.Code.Trim(), station.Id, cancellationToken))
        {
            throw Rule(409, "A station with this code already exists.");
        }

        Apply(station, request);
        await _catalog.ReplaceStationAsync(station, cancellationToken);
        return await ToStationDto(station, cancellationToken);
    }

    public async Task<StationDto> SetStationStatusAsync(string id, string status, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Backoffice);
        if (status is not ("Active" or "Inactive"))
        {
            throw Rule(400, "Status must be Active or Inactive.");
        }

        var station = await RequireStation(id, cancellationToken);
        if (status == "Inactive")
        {
            var holding = await _reservations.CountHoldingForStationAsync(station.Id, cancellationToken);
            if (holding > 0)
            {
                throw Rule(409, "This station still has requested, approved, or scheduled reservations, so it cannot be deactivated.");
            }
        }

        station.Status = status;
        await _catalog.ReplaceStationAsync(station, cancellationToken);
        return await ToStationDto(station, cancellationToken);
    }

    public async Task<IReadOnlyList<SlotDto>> ListSlotsAsync(string? stationId, CancellationToken cancellationToken)
    {
        RequireSignedIn();
        var stations = await _catalog.ListStationsAsync(cancellationToken);
        var slots = await _catalog.ListSlotsAsync(stationId, cancellationToken);
        var rows = new List<SlotDto>();
        foreach (var slot in slots.OrderBy(item => item.Start))
        {
            rows.Add(await ToSlotDto(slot, stations, cancellationToken));
        }

        return rows;
    }

    public async Task<SlotDto> GetSlotAsync(string id, CancellationToken cancellationToken)
    {
        RequireSignedIn();
        var slot = await RequireSlot(id, cancellationToken);
        var stations = await _catalog.ListStationsAsync(cancellationToken);
        return await ToSlotDto(slot, stations, cancellationToken);
    }

    public async Task<SlotDto> CreateSlotAsync(SlotWriteRequest request, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Backoffice);
        var station = await RequireStation(request.StationId, cancellationToken);
        ValidateSlot(request);
        var slot = new SlotDocument { Id = $"sl-{Guid.NewGuid():N}"[..11] };
        Apply(slot, request);
        await _catalog.InsertSlotAsync(slot, cancellationToken);
        return await ToSlotDto(slot, [station], cancellationToken);
    }

    public async Task<SlotDto> UpdateSlotAsync(string id, SlotWriteRequest request, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Backoffice);
        var slot = await RequireSlot(id, cancellationToken);
        await RequireStation(request.StationId, cancellationToken);
        ValidateSlot(request);
        var holding = await _reservations.CountHoldingAsync(slot.Id, null, cancellationToken);
        var start = ColomboTime.AsUtc(request.Start);
        var end = ColomboTime.AsUtc(request.End);
        var scheduleChanged = slot.StationId != request.StationId.Trim()
            || ColomboTime.AsUtc(slot.Start) != start
            || ColomboTime.AsUtc(slot.End) != end;
        if (holding > 0 && scheduleChanged)
        {
            throw Rule(409, "This slot still has a capacity hold, so its station and time cannot change.");
        }

        if (request.Capacity < holding)
        {
            throw Rule(409, "This slot still has a capacity hold, so its capacity cannot drop below that number.");
        }

        if (!request.IsOpen && holding > 0)
        {
            throw Rule(409, "This slot still has a capacity hold, so it cannot be closed.");
        }

        Apply(slot, request);
        await _catalog.ReplaceSlotAsync(slot, cancellationToken);
        var stations = await _catalog.ListStationsAsync(cancellationToken);
        return await ToSlotDto(slot, stations, cancellationToken);
    }

    public async Task<SlotDto> SetSlotOpenAsync(string id, bool isOpen, CancellationToken cancellationToken)
    {
        RequireRole(AppRoles.Backoffice, AppRoles.GridOperator);
        var slot = await RequireSlot(id, cancellationToken);
        if (!isOpen)
        {
            var holding = await _reservations.CountHoldingAsync(slot.Id, null, cancellationToken);
            if (holding > 0)
            {
                throw Rule(409, "This slot still has a capacity hold, so it cannot be closed.");
            }
        }

        slot.IsOpen = isOpen;
        await _catalog.ReplaceSlotAsync(slot, cancellationToken);
        var stations = await _catalog.ListStationsAsync(cancellationToken);
        return await ToSlotDto(slot, stations, cancellationToken);
    }

    private async Task<StationDto> ToStationDto(StationDocument station, CancellationToken cancellationToken)
    {
        return new StationDto
        {
            Id = station.Id,
            Code = station.Code,
            Name = station.Name,
            Address = station.Address,
            Latitude = station.Latitude,
            Longitude = station.Longitude,
            CapacityKwh = station.CapacityKwh,
            BatterySlots = station.BatterySlots,
            Hours = station.Hours,
            Status = station.Status,
            HoldingCount = await _reservations.CountHoldingForStationAsync(station.Id, cancellationToken),
        };
    }

    private async Task<SlotDto> ToSlotDto(SlotDocument slot, IReadOnlyList<StationDocument> stations, CancellationToken cancellationToken)
    {
        return new SlotDto
        {
            Id = slot.Id,
            StationId = slot.StationId,
            StationName = stations.FirstOrDefault(item => item.Id == slot.StationId)?.Name ?? "",
            Label = slot.Label,
            Start = ColomboTime.AsUtc(slot.Start),
            End = ColomboTime.AsUtc(slot.End),
            Capacity = slot.Capacity,
            IsOpen = slot.IsOpen,
            HoldingCount = await _reservations.CountHoldingAsync(slot.Id, null, cancellationToken),
        };
    }

    private async Task<StationDocument> RequireStation(string id, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw Rule(400, "Choose a station.");
        }

        var station = await _catalog.GetStationAsync(id.Trim(), cancellationToken);
        if (station is null)
        {
            throw Rule(404, "That station was not found.");
        }

        return station;
    }

    private async Task<SlotDocument> RequireSlot(string id, CancellationToken cancellationToken)
    {
        var slot = await _catalog.GetSlotAsync(id, cancellationToken);
        if (slot is null)
        {
            throw Rule(404, "That slot was not found.");
        }

        return slot;
    }

    private static void ValidateStation(StationWriteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Address))
        {
            throw Rule(400, "Code, name, and address are required.");
        }

        if (request.Latitude is < -90 or > 90 || request.Longitude is < -180 or > 180)
        {
            throw Rule(400, "Latitude and longitude are outside the valid range.");
        }

        if (request.Latitude == 0 && request.Longitude == 0)
        {
            throw Rule(400, "Enter the station GPS coordinates.");
        }

        if (request.CapacityKwh <= 0)
        {
            throw Rule(400, "Storage capacity must be greater than zero.");
        }

        if (request.BatterySlots < 1)
        {
            throw Rule(400, "A station needs at least one battery slot.");
        }
    }

    private static void ValidateSlot(SlotWriteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Label))
        {
            throw Rule(400, "A slot needs a label.");
        }

        if (request.Capacity < 1)
        {
            throw Rule(400, "Slot capacity must be at least 1.");
        }

        if (ColomboTime.AsUtc(request.End) <= ColomboTime.AsUtc(request.Start))
        {
            throw Rule(400, "The slot end must be after its start.");
        }
    }

    private static void Apply(StationDocument station, StationWriteRequest request)
    {
        station.Code = request.Code.Trim();
        station.Name = request.Name.Trim();
        station.Address = request.Address.Trim();
        station.Latitude = request.Latitude;
        station.Longitude = request.Longitude;
        station.CapacityKwh = request.CapacityKwh;
        station.BatterySlots = request.BatterySlots;
        station.Hours = request.Hours.Trim();
    }

    private static void Apply(SlotDocument slot, SlotWriteRequest request)
    {
        slot.StationId = request.StationId.Trim();
        slot.Label = request.Label.Trim();
        slot.Start = ColomboTime.AsUtc(request.Start);
        slot.End = ColomboTime.AsUtc(request.End);
        slot.Capacity = request.Capacity;
        slot.IsOpen = request.IsOpen;
    }

    private static double DistanceKm(double latitude, double longitude, double otherLatitude, double otherLongitude)
    {
        const double earthKm = 6371;
        var lat = DegreesToRadians(otherLatitude - latitude);
        var lng = DegreesToRadians(otherLongitude - longitude);
        var a = Math.Sin(lat / 2) * Math.Sin(lat / 2)
            + Math.Cos(DegreesToRadians(latitude)) * Math.Cos(DegreesToRadians(otherLatitude))
            * Math.Sin(lng / 2) * Math.Sin(lng / 2);
        return earthKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180;

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
            throw Rule(403, "You do not have permission for this station action.");
        }
    }

    private static ReservationRuleException Rule(int statusCode, string message)
    {
        return new ReservationRuleException(statusCode, message);
    }
}
