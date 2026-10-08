// Read-only station and slot snapshots for reservation rules. Slot times are returned as UTC.
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.Helpers;
using SolarMicrogrid.API.Interfaces;
using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Repositories;

public class MongoEnergyCatalog : IEnergyCatalog
{
    private readonly IMongoCollection<StationDocument> _stations;
    private readonly IMongoCollection<SlotDocument> _slots;

    public MongoEnergyCatalog(IMongoDatabase database)
    {
        _stations = database.GetCollection<StationDocument>(MongoCollections.Stations);
        _slots = database.GetCollection<SlotDocument>(MongoCollections.Slots);
    }

    public async Task<StationSnapshot?> GetStationAsync(string id, CancellationToken cancellationToken)
    {
        var station = await _stations.Find(item => item.Id == id).FirstOrDefaultAsync(cancellationToken);
        return station is null ? null : new StationSnapshot(station.Id, station.Name, station.Status, station.CapacityKwh);
    }

    public async Task<SlotSnapshot?> GetSlotAsync(string id, CancellationToken cancellationToken)
    {
        var slot = await _slots.Find(item => item.Id == id).FirstOrDefaultAsync(cancellationToken);
        return slot is null ? null : ToSnapshot(slot);
    }

    public async Task<IReadOnlyList<StationSnapshot>> ListStationsAsync(CancellationToken cancellationToken)
    {
        var stations = await _stations.Find(Builders<StationDocument>.Filter.Empty).ToListAsync(cancellationToken);
        return stations.Select(item => new StationSnapshot(item.Id, item.Name, item.Status, item.CapacityKwh)).ToList();
    }

    public async Task<IReadOnlyList<SlotSnapshot>> ListSlotsAsync(CancellationToken cancellationToken)
    {
        var slots = await _slots.Find(Builders<SlotDocument>.Filter.Empty).ToListAsync(cancellationToken);
        return slots.Select(ToSnapshot).ToList();
    }

    private static SlotSnapshot ToSnapshot(SlotDocument slot)
    {
        return new SlotSnapshot(
            slot.Id,
            slot.StationId,
            slot.Label,
            ColomboTime.AsUtc(slot.Start),
            ColomboTime.AsUtc(slot.End),
            slot.Capacity,
            slot.IsOpen);
    }
}

// Station document in SolarStationInfo. Reservation checks use the smaller StationSnapshot.
public class StationDocument
{
    [BsonId]
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Status { get; set; } = "";
    public string Code { get; set; } = "";
    public string Address { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double CapacityKwh { get; set; }
    public int BatterySlots { get; set; }
    public string Hours { get; set; } = "";
}

// Slot document in EnergyBookingSlots. Start and End are treated as UTC.
public class SlotDocument
{
    [BsonId]
    public string Id { get; set; } = "";
    public string StationId { get; set; } = "";
    public string Label { get; set; } = "";
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public int Capacity { get; set; }
    public bool IsOpen { get; set; }
}
