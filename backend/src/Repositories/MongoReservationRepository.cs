using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Repositories;

public sealed class MongoReservationRepository : IReservationRepository
{
    private readonly IMongoCollection<EnergyReservation> _reservations;

    public MongoReservationRepository(IMongoDatabase database, IOptions<MongoDbSettings> options)
    {
        _reservations = database.GetCollection<EnergyReservation>(options.Value.ReservationsCollectionName);
    }

    public Task InsertAsync(EnergyReservation reservation, CancellationToken cancellationToken) =>
        _reservations.InsertOneAsync(reservation, cancellationToken: cancellationToken);

    public async Task<EnergyReservation?> GetByIdAsync(string reservationId, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(reservationId, out _))
        {
            return null;
        }

        return await _reservations.Find(item => item.ReservationId == reservationId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<bool> ReplaceAsync(EnergyReservation reservation, CancellationToken cancellationToken)
    {
        var result = await _reservations.ReplaceOneAsync(
            item => item.ReservationId == reservation.ReservationId,
            reservation,
            cancellationToken: cancellationToken);
        return result.MatchedCount == 1;
    }

    public async Task<IReadOnlyList<EnergyReservation>> ListByProsumerAsync(
        string prosumerId,
        CancellationToken cancellationToken) =>
        await _reservations.Find(item => item.ProsumerId == prosumerId)
            .SortBy(item => item.ScheduledDateTime)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<EnergyReservation>> ListAllAsync(CancellationToken cancellationToken) =>
        await _reservations.Find(FilterDefinition<EnergyReservation>.Empty)
            .SortBy(item => item.ScheduledDateTime)
            .ToListAsync(cancellationToken);

    public Task<IReadOnlyList<EnergyReservation>> ListByProsumerAndStatusesAsync(
        string prosumerId,
        IReadOnlyCollection<ReservationStatus> statuses,
        string? exceptReservationId,
        CancellationToken cancellationToken)
    {
        var filter = Builders<EnergyReservation>.Filter.Eq(item => item.ProsumerId, prosumerId)
            & Builders<EnergyReservation>.Filter.In(item => item.Status, statuses);
        if (!string.IsNullOrWhiteSpace(exceptReservationId))
        {
            filter &= Builders<EnergyReservation>.Filter.Ne(item => item.ReservationId, exceptReservationId);
        }

        return ListAsync(filter, cancellationToken);
    }

    public Task<IReadOnlyList<EnergyReservation>> ListBySlotAndStatusesAsync(
        string slotId,
        IReadOnlyCollection<ReservationStatus> statuses,
        CancellationToken cancellationToken)
    {
        var filter = Builders<EnergyReservation>.Filter.Eq(item => item.SlotId, slotId)
            & Builders<EnergyReservation>.Filter.In(item => item.Status, statuses);
        return ListAsync(filter, cancellationToken);
    }

    public Task<IReadOnlyList<EnergyReservation>> ListByStationAndStatusesAsync(
        string stationId,
        IReadOnlyCollection<ReservationStatus> statuses,
        CancellationToken cancellationToken)
    {
        var filter = Builders<EnergyReservation>.Filter.Eq(item => item.StationId, stationId)
            & Builders<EnergyReservation>.Filter.In(item => item.Status, statuses);
        return ListAsync(filter, cancellationToken);
    }

    private async Task<IReadOnlyList<EnergyReservation>> ListAsync(
        FilterDefinition<EnergyReservation> filter,
        CancellationToken cancellationToken) =>
        await _reservations.Find(filter).ToListAsync(cancellationToken);
}
