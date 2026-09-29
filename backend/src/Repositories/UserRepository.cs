using MongoDB.Driver;
using SolarMicrogridTrading.Api.Configuration;
using SolarMicrogridTrading.Api.Interfaces;
using SolarMicrogridTrading.Api.Models;

namespace SolarMicrogridTrading.Api.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly IMongoCollection<User> users;

    public UserRepository(IMongoDatabase database, MongoDbSettings settings)
    {
        users = database.GetCollection<User>(settings.UsersCollectionName);
    }

    public async Task<User?> FindByIdentifierAsync(string identifier, CancellationToken cancellationToken)
    {
        var normalizedIdentifier = identifier.Trim();
        var filter = Builders<User>.Filter.Or(
            Builders<User>.Filter.Eq(user => user.Username, normalizedIdentifier),
            Builders<User>.Filter.Eq(user => user.Nic, normalizedIdentifier));

        return await users.Find(filter).FirstOrDefaultAsync(cancellationToken);
    }
}
