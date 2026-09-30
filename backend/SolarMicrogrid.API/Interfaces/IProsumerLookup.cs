using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Interfaces;

public interface IProsumerLookup
{
    Task<ProsumerSnapshot?> FindAsync(string id, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProsumerSnapshot>> ListAsync(CancellationToken cancellationToken);
}
