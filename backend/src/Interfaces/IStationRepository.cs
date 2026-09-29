using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Interfaces;

public interface IStationRepository
{
    Task InsertAsync(SolarStationInfo station, CancellationToken cancellationToken);
    Task<IReadOnlyList<SolarStationInfo>> GetAllAsync(CancellationToken cancellationToken);
    Task<SolarStationInfo?> GetByIdAsync(string stationId, CancellationToken cancellationToken);
    Task<bool> ReplaceAsync(SolarStationInfo station, CancellationToken cancellationToken);
    Task<bool> DeactivateAsync(string stationId, CancellationToken cancellationToken);
}
