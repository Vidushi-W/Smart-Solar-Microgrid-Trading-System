// Reads and writes full station and slot documents. Booking rules are checked before anything is saved.
using MongoDB.Driver;
using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.Interfaces;

namespace SolarMicrogrid.API.Repositories;

public class MongoCatalogStore : ICatalogStore
{
    private readonly IMongoCollection<StationDocument> _stations;
    private readonly IMongoCollection<SlotDocument> _slots;

    public MongoCatalogStore(IMongoDatabase database)
    {
        _stations = database.GetCollection<StationDocument>(MongoCollections.Stations);
        _slots = database.GetCollection<SlotDocument>(MongoCollections.Slots);
    }

    public async Task<IReadOnlyList<StationDocument>> ListStationsAsync(CancellationToken cancellationToken)
    {
        return await _stations.Find(Builders<StationDocument>.Filter.Empty).ToListAsync(cancellationToken);
    }

    public Task<StationDocument?> GetStationAsync(string id, CancellationToken cancellationToken)
    {
        return _stations.Find(item => item.Id == id).FirstOrDefaultAsync(cancellationToken)!;
    }

    public Task InsertStationAsync(StationDocument station, CancellationToken cancellationToken)
    {
        return _stations.InsertOneAsync(station, cancellationToken: cancellationToken);
    }

    public Task ReplaceStationAsync(StationDocument station, CancellationToken cancellationToken)
    {
        return _stations.ReplaceOneAsync(item => item.Id == station.Id, station, cancellationToken: cancellationToken);
    }

    // True when another station already uses this code. ignoreId skips the station being edited.
    public async Task<bool> StationCodeExistsAsync(string code, string? ignoreId, CancellationToken cancellationToken)
    {
        var builder = Builders<StationDocument>.Filter;
        var filter = builder.Eq(item => item.Code, code);
        if (!string.IsNullOrWhiteSpace(ignoreId))
        {
            filter &= builder.Ne(item => item.Id, ignoreId);
        }

        var count = await _stations.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        return count > 0;
    }

    // A blank station id returns every slot.
    public async Task<IReadOnlyList<SlotDocument>> ListSlotsAsync(string? stationId, CancellationToken cancellationToken)
    {
        var filter = string.IsNullOrWhiteSpace(stationId)
            ? Builders<SlotDocument>.Filter.Empty
            : Builders<SlotDocument>.Filter.Eq(item => item.StationId, stationId);
        return await _slots.Find(filter).ToListAsync(cancellationToken);
    }

    public Task<SlotDocument?> GetSlotAsync(string id, CancellationToken cancellationToken)
    {
        return _slots.Find(item => item.Id == id).FirstOrDefaultAsync(cancellationToken)!;
    }

    public Task InsertSlotAsync(SlotDocument slot, CancellationToken cancellationToken)
    {
        return _slots.InsertOneAsync(slot, cancellationToken: cancellationToken);
    }

    public Task ReplaceSlotAsync(SlotDocument slot, CancellationToken cancellationToken)
    {
        return _slots.ReplaceOneAsync(item => item.Id == slot.Id, slot, cancellationToken: cancellationToken);
    }
}
