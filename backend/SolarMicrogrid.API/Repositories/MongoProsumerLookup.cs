// Reads id, name, and status from the Prosumers collection written by the account API.
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.Interfaces;
using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Repositories;

public class MongoProsumerLookup : IProsumerLookup
{
    private readonly IMongoCollection<ProsumerDocument> _prosumers;

    public MongoProsumerLookup(IMongoDatabase database)
    {
        _prosumers = database.GetCollection<ProsumerDocument>(MongoCollections.Prosumers);
    }

    public async Task<ProsumerSnapshot?> FindAsync(string id, CancellationToken cancellationToken)
    {
        var prosumer = await _prosumers.Find(item => item.Id == id).FirstOrDefaultAsync(cancellationToken);
        return prosumer is null ? null : new ProsumerSnapshot(prosumer.Id, prosumer.Name, prosumer.Status);
    }

    public async Task<IReadOnlyList<ProsumerSnapshot>> ListAsync(CancellationToken cancellationToken)
    {
        var people = await _prosumers.Find(Builders<ProsumerDocument>.Filter.Empty).ToListAsync(cancellationToken);
        return people.Select(item => new ProsumerSnapshot(item.Id, item.Name, item.Status)).ToList();
    }
}

// The prosumer fields this API maps. Other account fields on the document are left unread.
public class ProsumerDocument
{
    [BsonId]
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Status { get; set; } = "";
}
