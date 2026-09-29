using SmartSolar.Microgrid.Interfaces;

namespace SmartSolar.Microgrid.Services;

/// <summary>
/// Fail-closed placeholder until Member 3 supplies the reservation schema and query.
/// </summary>
public sealed class UnconfiguredStationReservationChecker : IStationReservationChecker
{
    public Task<StationReservationCheck> CheckAsync(string stationId, CancellationToken cancellationToken) =>
        Task.FromResult(StationReservationCheck.Unavailable);
}
