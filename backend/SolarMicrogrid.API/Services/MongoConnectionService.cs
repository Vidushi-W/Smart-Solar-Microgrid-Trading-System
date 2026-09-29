using MongoDB.Bson;
using MongoDB.Driver;
using SolarMicrogrid.API.Interfaces;

namespace SolarMicrogrid.API.Services;

public class MongoConnectionService : IMongoConnectionService
{
    private readonly IMongoDatabase _database;

    public MongoConnectionService(IMongoDatabase database)
    {
        _database = database;
        DatabaseName = database.DatabaseNamespace.DatabaseName;
    }

    public string DatabaseName { get; }

    public async Task<bool> PingAsync(CancellationToken cancellationToken)
    {
        var result = await _database.RunCommandAsync<BsonDocument>(
            new BsonDocument("ping", 1),
            cancellationToken: cancellationToken);

        return result.TryGetValue("ok", out var ok) && ok.ToDouble() == 1;
    }
}
