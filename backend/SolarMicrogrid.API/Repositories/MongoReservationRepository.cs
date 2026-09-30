using MongoDB.Driver;
using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.Helpers;
using SolarMicrogrid.API.Interfaces;
using SolarMicrogrid.API.Models;

namespace SolarMicrogrid.API.Repositories;

public class MongoReservationRepository : IReservationRepository
{
    private readonly IMongoCollection<EnergyReservation> _collection;

    public MongoReservationRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<EnergyReservation>(MongoCollections.Reservations);
    }

    public Task InsertAsync(EnergyReservation reservation, CancellationToken cancellationToken)
    {
        Normalize(reservation);
        return _collection.InsertOneAsync(reservation, cancellationToken: cancellationToken);
    }

    public async Task<EnergyReservation?> GetAsync(string id, CancellationToken cancellationToken)
    {
        var reservation = await _collection.Find(item => item.Id == id).FirstOrDefaultAsync(cancellationToken);
        return reservation is null ? null : Normalize(reservation);
    }

    public Task ReplaceAsync(EnergyReservation reservation, CancellationToken cancellationToken)
    {
        Normalize(reservation);
        return _collection.ReplaceOneAsync(item => item.Id == reservation.Id, reservation, cancellationToken: cancellationToken);
    }

    public async Task<IReadOnlyList<EnergyReservation>> SearchAsync(ReservationSearch search, CancellationToken cancellationToken)
    {
        var filters = new List<FilterDefinition<EnergyReservation>>();
        var builder = Builders<EnergyReservation>.Filter;
        if (!string.IsNullOrWhiteSpace(search.Status))
        {
            filters.Add(builder.Eq(item => item.Status, search.Status));
        }

        if (!string.IsNullOrWhiteSpace(search.StationId))
        {
            filters.Add(builder.Eq(item => item.StationId, search.StationId));
        }

        if (!string.IsNullOrWhiteSpace(search.ProsumerId))
        {
            filters.Add(builder.Eq(item => item.ProsumerId, search.ProsumerId));
        }

        if (search.StartFromUtc is not null)
        {
            filters.Add(builder.Gte(item => item.Start, search.StartFromUtc.Value));
        }

        if (search.StartToUtc is not null)
        {
            filters.Add(builder.Lte(item => item.Start, search.StartToUtc.Value));
        }

        var filter = filters.Count == 0 ? builder.Empty : builder.And(filters);
        var rows = await _collection.Find(filter).Limit(500).ToListAsync(cancellationToken);
        return rows.Select(Normalize).ToList();
    }

    public async Task<int> CountHoldingAsync(string slotId, string? ignoreId, CancellationToken cancellationToken)
    {
        var builder = Builders<EnergyReservation>.Filter;
        var filter = builder.Eq(item => item.SlotId, slotId) & builder.In(item => item.Status, ReservationStatus.Holding);
        if (!string.IsNullOrWhiteSpace(ignoreId))
        {
            filter &= builder.Ne(item => item.Id, ignoreId);
        }

        var count = await _collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        return (int)count;
    }

    public async Task<int> CountHoldingForStationAsync(string stationId, CancellationToken cancellationToken)
    {
        var builder = Builders<EnergyReservation>.Filter;
        var filter = builder.Eq(item => item.StationId, stationId) & builder.In(item => item.Status, ReservationStatus.Holding);
        var count = await _collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        return (int)count;
    }

    public async Task<IReadOnlyList<EnergyReservation>> ListHoldingForProsumerAsync(string prosumerId, string? ignoreId, CancellationToken cancellationToken)
    {
        var builder = Builders<EnergyReservation>.Filter;
        var filter = builder.Eq(item => item.ProsumerId, prosumerId) & builder.In(item => item.Status, ReservationStatus.Holding);
        if (!string.IsNullOrWhiteSpace(ignoreId))
        {
            filter &= builder.Ne(item => item.Id, ignoreId);
        }

        var rows = await _collection.Find(filter).ToListAsync(cancellationToken);
        return rows.Select(Normalize).ToList();
    }

    public async Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken)
    {
        var count = await _collection.CountDocumentsAsync(item => item.Code == code, cancellationToken: cancellationToken);
        return count > 0;
    }

    private static EnergyReservation Normalize(EnergyReservation reservation)
    {
        reservation.Start = ColomboTime.AsUtc(reservation.Start);
        reservation.End = ColomboTime.AsUtc(reservation.End);
        foreach (var entry in reservation.History)
        {
            entry.At = ColomboTime.AsUtc(entry.At);
        }

        return reservation;
    }
}
