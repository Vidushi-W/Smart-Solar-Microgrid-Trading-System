// Database name and ping used at startup and by the development health route.
namespace SolarMicrogrid.API.Interfaces;

public interface IMongoConnectionService
{
    string DatabaseName { get; }

    Task<bool> PingAsync(CancellationToken cancellationToken);
}
