namespace SolarMicrogrid.API.Interfaces;

public interface IMongoConnectionService
{
    string DatabaseName { get; }

    Task<bool> PingAsync(CancellationToken cancellationToken);
}
