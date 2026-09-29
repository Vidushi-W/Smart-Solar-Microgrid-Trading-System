using MongoDB.Driver;

namespace SolarMicrogrid.API.Configuration;

public static class MongoDbServiceCollectionExtensions
{
    public const string ConnectionStringVariable = "MONGODB_CONNECTION_STRING";
    public const string DatabaseNameVariable = "MONGODB_DATABASE_NAME";

    public static IServiceCollection AddMongoDb(this IServiceCollection services)
    {
        var connectionString = Environment.GetEnvironmentVariable(ConnectionStringVariable);
        var databaseName = Environment.GetEnvironmentVariable(DatabaseNameVariable);

        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(databaseName))
        {
            throw new InvalidOperationException(
                "MongoDB is not configured. Set MONGODB_CONNECTION_STRING and MONGODB_DATABASE_NAME in backend/SolarMicrogrid.API/.env.");
        }

        services.AddSingleton<IMongoClient>(_ => new MongoClient(connectionString));
        services.AddSingleton(serviceProvider =>
            serviceProvider.GetRequiredService<IMongoClient>().GetDatabase(databaseName));

        return services;
    }
}
