// Station writes for this API.
// Deactivation stops when a reservation checker reports an active reservation.
using Microsoft.Extensions.Options;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Services;

public sealed class StationService : IStationService
{
    private const double EarthRadiusKilometers = 6371.0088;
    private readonly IStationRepository _repository;
    private readonly IStationReservationChecker _reservationChecker;
    private readonly double _nearbyRadiusKilometers;

    public StationService(
        IStationRepository repository,
        IStationReservationChecker reservationChecker,
        IOptions<StationOptions> options)
    {
        _repository = repository;
        _reservationChecker = reservationChecker;
        _nearbyRadiusKilometers = options.Value.NearbyRadiusKilometers;
    }

    public async Task<StationResponse> CreateAsync(StationWriteRequest request, CancellationToken cancellationToken)
    {
        var station = ToDocument(request, $"st-{Guid.NewGuid():N}");
        await _repository.InsertAsync(station, cancellationToken);
        return ToResponse(station);
    }

    public async Task<IReadOnlyList<StationResponse>> GetAllAsync(CancellationToken cancellationToken) =>
        (await _repository.GetAllAsync(cancellationToken)).Select(station => ToResponse(station)).ToArray();

    public async Task<IReadOnlyList<StationResponse>> GetNearbyAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken)
    {
        var activeStations = (await _repository.GetAllAsync(cancellationToken))
            .Where(station => station.Status == StationStatus.Active);

        return activeStations
            .Select(station => new
            {
                Station = station,
                Distance = DistanceKilometers(latitude, longitude, station.Latitude, station.Longitude),
            })
            .Where(result => result.Distance <= _nearbyRadiusKilometers)
            .OrderBy(result => result.Distance)
            .Select(result => ToResponse(result.Station, result.Distance))
            .ToArray();
    }

    public async Task<StationResponse?> UpdateAsync(
        string stationId,
        StationWriteRequest request,
        CancellationToken cancellationToken)
    {
        var station = await _repository.GetByIdAsync(stationId, cancellationToken);
        if (station is null)
        {
            return null;
        }

        Apply(request, station);
        if (!await _repository.ReplaceAsync(station, cancellationToken))
        {
            return null;
        }

        return ToResponse(station);
    }

    public async Task<DeactivateStationResult> DeactivateAsync(string stationId, CancellationToken cancellationToken)
    {
        if (await _repository.GetByIdAsync(stationId, cancellationToken) is null)
        {
            return DeactivateStationResult.NotFound;
        }

        var reservationCheck = await _reservationChecker.CheckAsync(stationId, cancellationToken);
        if (reservationCheck == StationReservationCheck.HasPendingOrApprovedReservations)
        {
            return DeactivateStationResult.HasActiveReservations;
        }
        if (reservationCheck != StationReservationCheck.Clear)
        {
            return DeactivateStationResult.ReservationCheckUnavailable;
        }

        return await _repository.DeactivateAsync(stationId, cancellationToken)
            ? DeactivateStationResult.Deactivated
            : DeactivateStationResult.NotFound;
    }

    private static SolarStationInfo ToDocument(StationWriteRequest request, string stationId) => new()
    {
        StationId = stationId,
        Name = request.Name.Trim(),
        Latitude = request.Latitude,
        Longitude = request.Longitude,
        CapacityKwh = request.CapacityKwh,
        TotalBatterySlots = request.TotalBatterySlots,
        AvailableBatterySlots = request.AvailableBatterySlots,
        OperatingSchedule = ToDocument(request.OperatingSchedule!),
        Status = StationStatus.Active,
    };

    private static void Apply(StationWriteRequest request, SolarStationInfo station)
    {
        station.Name = request.Name.Trim();
        station.Latitude = request.Latitude;
        station.Longitude = request.Longitude;
        station.CapacityKwh = request.CapacityKwh;
        station.TotalBatterySlots = request.TotalBatterySlots;
        station.AvailableBatterySlots = request.AvailableBatterySlots;
        station.OperatingSchedule = ToDocument(request.OperatingSchedule!);
    }

    private static StationOperatingSchedule ToDocument(StationOperatingScheduleRequest schedule) => new()
    {
        Days = schedule.Days.Distinct().ToList(),
        OpenTime = schedule.OpenTime,
        CloseTime = schedule.CloseTime,
    };

    private static StationResponse ToResponse(SolarStationInfo station, double? distanceKilometers = null) => new()
    {
        StationId = station.StationId,
        Name = station.Name,
        Latitude = station.Latitude,
        Longitude = station.Longitude,
        CapacityKwh = station.CapacityKwh,
        TotalBatterySlots = station.TotalBatterySlots,
        AvailableBatterySlots = station.AvailableBatterySlots,
        OperatingSchedule = station.OperatingSchedule,
        Status = station.Status,
        DistanceKilometers = distanceKilometers is null ? null : Math.Round(distanceKilometers.Value, 2),
    };

    private static double DistanceKilometers(double fromLatitude, double fromLongitude, double toLatitude, double toLongitude)
    {
        var latitudeDelta = DegreesToRadians(toLatitude - fromLatitude);
        var longitudeDelta = DegreesToRadians(toLongitude - fromLongitude);
        var a = Math.Pow(Math.Sin(latitudeDelta / 2), 2)
            + Math.Cos(DegreesToRadians(fromLatitude))
            * Math.Cos(DegreesToRadians(toLatitude))
            * Math.Pow(Math.Sin(longitudeDelta / 2), 2);
        return EarthRadiusKilometers * 2 * Math.Asin(Math.Sqrt(Math.Min(1, a)));
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180;
}
