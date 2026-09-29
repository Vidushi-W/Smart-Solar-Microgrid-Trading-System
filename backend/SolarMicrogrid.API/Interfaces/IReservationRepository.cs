using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Interfaces;

public class ReservationSearch
{
    public string? Status { get; init; }
    public string? StationId { get; init; }
    public string? ProsumerId { get; init; }
    public DateTime? StartFromUtc { get; init; }
    public DateTime? StartToUtc { get; init; }
}

public interface IReservationRepository
{
    Task InsertAsync(EnergyReservation reservation, CancellationToken cancellationToken);
    Task<EnergyReservation?> GetAsync(string id, CancellationToken cancellationToken);
    Task ReplaceAsync(EnergyReservation reservation, CancellationToken cancellationToken);
    Task<IReadOnlyList<EnergyReservation>> SearchAsync(ReservationSearch search, CancellationToken cancellationToken);
    Task<int> CountHoldingAsync(string slotId, string? ignoreId, CancellationToken cancellationToken);
    Task<int> CountHoldingForStationAsync(string stationId, CancellationToken cancellationToken);
    Task<IReadOnlyList<EnergyReservation>> ListHoldingForProsumerAsync(string prosumerId, string? ignoreId, CancellationToken cancellationToken);
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken);
}
