namespace SolarMicrogridTrading.Api.Configuration;

public sealed class MongoDbSettings
{
    public string ConnectionString { get; init; } = string.Empty;
    public string DatabaseName { get; init; } = "SolarMicrogridDB";
    public string UsersCollectionName { get; init; } = "UserDetails";
}
