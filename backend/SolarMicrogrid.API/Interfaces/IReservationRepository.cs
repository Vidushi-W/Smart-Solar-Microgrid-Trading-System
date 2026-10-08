// Persistence for OperationalEnergyReservation, kept apart from the account API's reservation collection.
using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Interfaces;

// Optional filters combined with AND. A null field is not applied. Start bounds are UTC.
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
    // Applies only the filters that are set. A prosumer id limits the rows to that prosumer.
    Task<IReadOnlyList<EnergyReservation>> SearchAsync(ReservationSearch search, CancellationToken cancellationToken);
    // Counts Requested, Approved, and Scheduled on the slot, skipping ignoreId when it is set.
    Task<int> CountHoldingAsync(string slotId, string? ignoreId, CancellationToken cancellationToken);
    // Counts Requested, Approved, and Scheduled reservations for the station.
    Task<int> CountHoldingForStationAsync(string stationId, CancellationToken cancellationToken);
    // Holding reservations for the prosumer, skipping ignoreId when it is set.
    Task<IReadOnlyList<EnergyReservation>> ListHoldingForProsumerAsync(string prosumerId, string? ignoreId, CancellationToken cancellationToken);
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken);
}
