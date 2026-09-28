using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Repositories;

public sealed class MongoStationRepository : IStationRepository
{
    private readonly IMongoCollection<SolarStationInfo> _stations;

    public MongoStationRepository(IMongoDatabase database, IOptions<MongoDbSettings> options)
    {
        _stations = database.GetCollection<SolarStationInfo>(options.Value.StationsCollectionName);
    }

    public Task InsertAsync(SolarStationInfo station, CancellationToken cancellationToken) =>
        _stations.InsertOneAsync(station, cancellationToken: cancellationToken);

    public async Task<IReadOnlyList<SolarStationInfo>> GetAllAsync(CancellationToken cancellationToken) =>
        await _stations.Find(FilterDefinition<SolarStationInfo>.Empty)
            .SortBy(station => station.Name)
            .ToListAsync(cancellationToken);

    public async Task<SolarStationInfo?> GetByIdAsync(string stationId, CancellationToken cancellationToken) =>
        await _stations.Find(station => station.StationId == stationId).FirstOrDefaultAsync(cancellationToken);

    public async Task<bool> ReplaceAsync(SolarStationInfo station, CancellationToken cancellationToken)
    {
        var result = await _stations.ReplaceOneAsync(
            existing => existing.StationId == station.StationId,
            station,
            cancellationToken: cancellationToken);
        return result.MatchedCount == 1;
    }

    public async Task<bool> DeactivateAsync(string stationId, CancellationToken cancellationToken)
    {
        var result = await _stations.UpdateOneAsync(
            station => station.StationId == stationId,
            Builders<SolarStationInfo>.Update.Set(station => station.Status, StationStatus.Deactivated),
            cancellationToken: cancellationToken);
        return result.MatchedCount == 1;
    }
}
