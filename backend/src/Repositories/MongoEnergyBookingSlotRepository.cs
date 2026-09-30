using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Repositories;

public sealed class MongoEnergyBookingSlotRepository : IEnergyBookingSlotRepository
{
    private readonly IMongoCollection<EnergyBookingSlots> _slots;

    public MongoEnergyBookingSlotRepository(IMongoDatabase database, IOptions<MongoDbSettings> options)
    {
        _slots = database.GetCollection<EnergyBookingSlots>(options.Value.SlotsCollectionName);
    }

    public Task InsertAsync(EnergyBookingSlots slot, CancellationToken cancellationToken) =>
        _slots.InsertOneAsync(slot, cancellationToken: cancellationToken);

    public async Task<EnergyBookingSlots?> GetByIdAsync(string slotId, CancellationToken cancellationToken) =>
        await _slots.Find(slot => slot.SlotId == slotId).FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<EnergyBookingSlots>> GetByStationAndDateAsync(
        string stationId,
        DateTime date,
        CancellationToken cancellationToken) =>
        await _slots.Find(slot => slot.StationId == stationId && slot.Date == date)
            .SortBy(slot => slot.StartTime)
            .ToListAsync(cancellationToken);

    public Task<bool> HasOverlapAsync(
        string stationId,
        DateTime date,
        string startTime,
        string endTime,
        string? exceptSlotId,
        CancellationToken cancellationToken)
    {
        var filter = Builders<EnergyBookingSlots>.Filter.Eq(slot => slot.StationId, stationId)
            & Builders<EnergyBookingSlots>.Filter.Eq(slot => slot.Date, date)
            & Builders<EnergyBookingSlots>.Filter.Lt(slot => slot.StartTime, endTime)
            & Builders<EnergyBookingSlots>.Filter.Gt(slot => slot.EndTime, startTime);

        if (!string.IsNullOrWhiteSpace(exceptSlotId))
        {
            filter &= Builders<EnergyBookingSlots>.Filter.Ne(slot => slot.SlotId, exceptSlotId);
        }

        return _slots.Find(filter).Limit(1).AnyAsync(cancellationToken);
    }

    public async Task<bool> ReplaceAsync(EnergyBookingSlots slot, CancellationToken cancellationToken)
    {
        var result = await _slots.ReplaceOneAsync(
            existing => existing.SlotId == slot.SlotId,
            slot,
            cancellationToken: cancellationToken);
        return result.MatchedCount == 1;
    }

    public async Task<bool> DeleteAsync(string slotId, CancellationToken cancellationToken)
    {
        var result = await _slots.DeleteOneAsync(slot => slot.SlotId == slotId, cancellationToken);
        return result.DeletedCount == 1;
    }
}
