using MongoDB.Driver;
using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Configuration;

public class MongoIndexInitializer : IHostedService
{
    private readonly IMongoDatabase _database;

    public MongoIndexInitializer(IMongoDatabase database)
    {
        _database = database;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var collection = _database.GetCollection<EnergyReservation>(MongoCollections.Reservations);
        var keys = Builders<EnergyReservation>.IndexKeys;
        await collection.Indexes.CreateManyAsync(
        [
            new CreateIndexModel<EnergyReservation>(keys.Ascending(item => item.Code), new CreateIndexOptions { Unique = true }),
            new CreateIndexModel<EnergyReservation>(keys.Ascending(item => item.SlotId).Ascending(item => item.Status)),
            new CreateIndexModel<EnergyReservation>(keys.Ascending(item => item.ProsumerId).Ascending(item => item.Start)),
            new CreateIndexModel<EnergyReservation>(keys.Ascending(item => item.Status).Ascending(item => item.Start)),
        ], cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
