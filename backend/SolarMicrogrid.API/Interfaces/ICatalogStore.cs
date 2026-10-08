// Full station and slot documents, including the check that a station code is not already used.
using SolarMicrogrid.API.Repositories;

namespace SolarMicrogrid.API.Interfaces;

public interface ICatalogStore
{
    Task<IReadOnlyList<StationDocument>> ListStationsAsync(CancellationToken cancellationToken);
    Task<StationDocument?> GetStationAsync(string id, CancellationToken cancellationToken);
    Task InsertStationAsync(StationDocument station, CancellationToken cancellationToken);
    Task ReplaceStationAsync(StationDocument station, CancellationToken cancellationToken);
    // True when another station already uses this code. ignoreId skips the station being edited.
    Task<bool> StationCodeExistsAsync(string code, string? ignoreId, CancellationToken cancellationToken);
    // A blank station id returns every slot.
    Task<IReadOnlyList<SlotDocument>> ListSlotsAsync(string? stationId, CancellationToken cancellationToken);
    Task<SlotDocument?> GetSlotAsync(string id, CancellationToken cancellationToken);
    Task InsertSlotAsync(SlotDocument slot, CancellationToken cancellationToken);
    Task ReplaceSlotAsync(SlotDocument slot, CancellationToken cancellationToken);
}
