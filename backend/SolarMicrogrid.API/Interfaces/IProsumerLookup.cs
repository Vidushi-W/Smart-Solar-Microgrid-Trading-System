// Read-only prosumer id, name, and status. This API does not register or update prosumers.
using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Interfaces;

public interface IProsumerLookup
{
    Task<ProsumerSnapshot?> FindAsync(string id, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProsumerSnapshot>> ListAsync(CancellationToken cancellationToken);
}
