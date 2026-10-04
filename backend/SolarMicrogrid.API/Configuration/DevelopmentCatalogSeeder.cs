// Inserts demo stations, slots, and prosumers when those collections are empty.
// It does not create login users.
using MongoDB.Driver;
using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.Helpers;
using SolarMicrogrid.API.Repositories;

namespace SolarMicrogrid.API.Configuration;

public class DevelopmentCatalogSeeder : IHostedService
{
    private readonly IMongoDatabase _database;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<DevelopmentCatalogSeeder> _logger;

    public DevelopmentCatalogSeeder(IMongoDatabase database, IHostEnvironment environment, ILogger<DevelopmentCatalogSeeder> logger)
    {
        _database = database;
        _environment = environment;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_environment.IsDevelopment())
        {
            return;
        }

        if (!string.Equals(Environment.GetEnvironmentVariable("SEED_DEMO_DATA"), "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        await SeedStations(cancellationToken);
        await FillMissingStationDetails(cancellationToken);
        await SeedSlots(cancellationToken);
        await SeedProsumers(cancellationToken);
        _logger.LogInformation("Demo stations, slots, and prosumers are ready for reservation testing.");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task SeedStations(CancellationToken cancellationToken)
    {
        var collection = _database.GetCollection<StationDocument>(MongoCollections.Stations);
        if (await collection.CountDocumentsAsync(FilterDefinition<StationDocument>.Empty, cancellationToken: cancellationToken) > 0)
        {
            return;
        }

        await collection.InsertManyAsync(
        [
            Station("st-cmb", "CMB-01", "Colombo Fort Microgrid", "York Street, Colombo 01", 6.9344, 79.8428, 120, 8, "06:00–18:00", "Active"),
            Station("st-neg", "NEG-01", "Negombo Lagoon Node", "Lagoon Road, Negombo", 7.2083, 79.8358, 40, 4, "07:00–16:00", "Inactive"),
        ], cancellationToken: cancellationToken);
    }

    private async Task FillMissingStationDetails(CancellationToken cancellationToken)
    {
        var collection = _database.GetCollection<StationDocument>(MongoCollections.Stations);
        await Fill(collection, "st-cmb", "CMB-01", "York Street, Colombo 01", 6.9344, 79.8428, 8, "06:00–18:00", cancellationToken);
        await Fill(collection, "st-neg", "NEG-01", "Lagoon Road, Negombo", 7.2083, 79.8358, 4, "07:00–16:00", cancellationToken);
    }

    private static async Task Fill(
        IMongoCollection<StationDocument> collection,
        string id,
        string code,
        string address,
        double latitude,
        double longitude,
        int batterySlots,
        string hours,
        CancellationToken cancellationToken)
    {
        var filter = Builders<StationDocument>.Filter;
        var missingGps = filter.Eq(item => item.Id, id)
            & (filter.Exists(item => item.Latitude, false) | filter.Eq(item => item.Latitude, 0));
        var update = Builders<StationDocument>.Update
            .Set(item => item.Code, code)
            .Set(item => item.Address, address)
            .Set(item => item.Latitude, latitude)
            .Set(item => item.Longitude, longitude)
            .Set(item => item.BatterySlots, batterySlots)
            .Set(item => item.Hours, hours);
        await collection.UpdateOneAsync(missingGps, update, cancellationToken: cancellationToken);
    }

    private static StationDocument Station(
        string id,
        string code,
        string name,
        string address,
        double latitude,
        double longitude,
        double capacityKwh,
        int batterySlots,
        string hours,
        string status)
    {
        return new StationDocument
        {
            Id = id,
            Code = code,
            Name = name,
            Address = address,
            Latitude = latitude,
            Longitude = longitude,
            CapacityKwh = capacityKwh,
            BatterySlots = batterySlots,
            Hours = hours,
            Status = status,
        };
    }

    private async Task SeedSlots(CancellationToken cancellationToken)
    {
        var collection = _database.GetCollection<SlotDocument>(MongoCollections.Slots);
        if (await collection.CountDocumentsAsync(FilterDefinition<SlotDocument>.Empty, cancellationToken: cancellationToken) > 0)
        {
            return;
        }

        var today = ColomboTime.LocalDate(DateTime.UtcNow);
        await collection.InsertManyAsync(
        [
            Slot("sl-tomorrow", "st-cmb", "Tomorrow morning", today.AddDays(1), new TimeOnly(9, 0), new TimeOnly(10, 0), 2, true),
            Slot("sl-later", "st-cmb", "Two days out", today.AddDays(2), new TimeOnly(10, 0), new TimeOnly(11, 30), 2, true),
            Slot("sl-day7", "st-cmb", "Seventh-day boundary", today.AddDays(7), new TimeOnly(11, 0), new TimeOnly(12, 0), 1, true),
            Slot("sl-day8", "st-cmb", "Beyond seven days", today.AddDays(8), new TimeOnly(11, 0), new TimeOnly(12, 0), 1, true),
            Slot("sl-closed", "st-cmb", "Closed window", today.AddDays(1), new TimeOnly(14, 0), new TimeOnly(15, 0), 1, false),
            Slot("sl-inactive", "st-neg", "Inactive station window", today.AddDays(1), new TimeOnly(9, 0), new TimeOnly(10, 0), 1, true),
            new SlotDocument
            {
                Id = "sl-soon",
                StationId = "st-cmb",
                Label = "Starts in six hours",
                Start = DateTime.UtcNow.AddHours(6),
                End = DateTime.UtcNow.AddHours(7),
                Capacity = 1,
                IsOpen = true,
            },
        ], cancellationToken: cancellationToken);
    }

    private async Task SeedProsumers(CancellationToken cancellationToken)
    {
        var collection = _database.GetCollection<ProsumerDocument>(MongoCollections.Prosumers);
        if (await collection.CountDocumentsAsync(FilterDefinition<ProsumerDocument>.Empty, cancellationToken: cancellationToken) > 0)
        {
            return;
        }

        await collection.InsertManyAsync(
        [
            new ProsumerDocument { Id = "p-ishara", Name = "Ishara Jayawardena", Status = "Active" },
            new ProsumerDocument { Id = "p-kavindu", Name = "Kavindu Silva", Status = "Pending" },
        ], cancellationToken: cancellationToken);
    }

    private static SlotDocument Slot(string id, string stationId, string label, DateOnly day, TimeOnly start, TimeOnly end, int capacity, bool isOpen)
    {
        return new SlotDocument
        {
            Id = id,
            StationId = stationId,
            Label = label,
            Start = ColomboTime.ToUtc(day, start),
            End = ColomboTime.ToUtc(day, end),
            Capacity = capacity,
            IsOpen = isOpen,
        };
    }
}
