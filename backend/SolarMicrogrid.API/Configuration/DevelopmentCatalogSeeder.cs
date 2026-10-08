// Hosted service registered at startup. It does not insert stations, slots, or prosumers.
using Microsoft.Extensions.Hosting;

namespace SolarMicrogrid.API.Configuration;

// Demo stations, slots, and prosumers are not inserted. Stations and slots come from the station API.
public class DevelopmentCatalogSeeder : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
