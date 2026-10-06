using System.Text.RegularExpressions;
using MongoDB.Bson;
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
            Builders<User>.Filter.Eq(user => user.Nic, normalizedIdentifier),
            Builders<User>.Filter.Regex(
                user => user.Email,
                new BsonRegularExpression($"^{Regex.Escape(normalizedIdentifier)}$", "i")));

        return await users.Find(filter).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await users.Find(FilterDefinition<User>.Empty)
            .SortByDescending(user => user.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        return await users.Find(user => user.Id == id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<User?> GetByNicAsync(string nic, CancellationToken cancellationToken)
    {
        return await users.Find(user => user.Nic == nic.Trim().ToUpperInvariant()).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<bool> ExistsByUsernameEmailOrNicAsync(
        string username,
        string email,
        string nic,
        string? excludedId,
        CancellationToken cancellationToken)
    {
        var filter = Builders<User>.Filter.Or(
            Builders<User>.Filter.Eq(user => user.Username, username),
            Builders<User>.Filter.Eq(user => user.Nic, nic),
            Builders<User>.Filter.Regex(
                user => user.Email,
                new BsonRegularExpression($"^{Regex.Escape(email.Trim())}$", "i")));
        if (!string.IsNullOrWhiteSpace(excludedId))
        {
            filter &= Builders<User>.Filter.Ne(user => user.Id, excludedId);
        }

        return await users.Find(filter).Limit(1).AnyAsync(cancellationToken);
    }

    public Task<bool> ExistsByNicAsync(string nic, CancellationToken cancellationToken)
    {
        return users.Find(user => user.Nic == nic).Limit(1).AnyAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetByRoleAndStatusesAsync(
        string role,
        IReadOnlyCollection<string> statuses,
        CancellationToken cancellationToken)
    {
        var filter = Builders<User>.Filter.Eq(user => user.Role, role)
            & Builders<User>.Filter.In(user => user.AccountStatus, statuses);
        return await users.Find(filter)
            .SortBy(user => user.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task CreateAsync(User user, CancellationToken cancellationToken)
    {
        return users.InsertOneAsync(user, cancellationToken: cancellationToken);
    }

    public async Task<bool> UpdateAsync(User user, CancellationToken cancellationToken)
    {
        var result = await users.ReplaceOneAsync(
            existing => existing.Id == user.Id,
            user,
            cancellationToken: cancellationToken);
        return result.MatchedCount == 1;
    }
}
