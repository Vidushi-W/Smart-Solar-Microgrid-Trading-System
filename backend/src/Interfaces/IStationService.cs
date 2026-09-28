using SmartSolar.Microgrid.DTOs;

namespace SmartSolar.Microgrid.Interfaces;

public enum DeactivateStationResult
{
    Deactivated,
    NotFound,
    HasActiveReservations,
    ReservationCheckUnavailable,
}

public interface IStationService
{
    Task<StationResponse> CreateAsync(StationWriteRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<StationResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<StationResponse>> GetNearbyAsync(double latitude, double longitude, CancellationToken cancellationToken);
    Task<StationResponse?> UpdateAsync(string stationId, StationWriteRequest request, CancellationToken cancellationToken);
    Task<DeactivateStationResult> DeactivateAsync(string stationId, CancellationToken cancellationToken);
}
