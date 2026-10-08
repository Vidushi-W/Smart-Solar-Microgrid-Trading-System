// Station and slot snapshots used by reservation checks. Writes go through the catalog store.
using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Interfaces;

public interface IEnergyCatalog
{
    Task<StationSnapshot?> GetStationAsync(string id, CancellationToken cancellationToken);
    Task<SlotSnapshot?> GetSlotAsync(string id, CancellationToken cancellationToken);
    Task<IReadOnlyList<StationSnapshot>> ListStationsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<SlotSnapshot>> ListSlotsAsync(CancellationToken cancellationToken);
}
