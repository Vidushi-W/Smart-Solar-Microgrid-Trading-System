/*
 * MongoDB adapter for QR transfer state in EnergyReservation.
 * Single-document compare-and-set prevents duplicate completion and lost updates.
 */
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Repositories;

public sealed class MongoQrTransferRepository : IQrTransferRepository
{
    private readonly IMongoCollection<EnergyReservation> _reservations;

    // Reuse the shared database and configuration; no separate transaction collection.
    public MongoQrTransferRepository(IMongoDatabase database, IOptions<MongoDbSettings> options) =>
        _reservations = database.GetCollection<EnergyReservation>(options.Value.ReservationsCollectionName);

    // Read by the string _id, following the station and slot identifier convention.
    public async Task<EnergyReservation?> GetAsync(string reservationId, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(reservationId, out _)) return null;
        return await _reservations.Find(item => item.ReservationId == reservationId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    // Compare every reservation field used in verification and the entire QR state.
    public async Task<bool> TryUpdateAsync(EnergyReservation expected, QrTransferState next,
        bool complete, CancellationToken cancellationToken)
    {
        var f = Builders<EnergyReservation>.Filter;
        var filter = f.Eq(x => x.ReservationId, expected.ReservationId)
            & f.Eq(x => x.Status, expected.Status)
            & f.Eq(x => x.ProsumerId, expected.ProsumerId)
            & f.Eq(x => x.StationId, expected.StationId)
            & f.Eq(x => x.SlotId, expected.SlotId)
            & f.Eq(x => x.EnergyKwh, expected.EnergyKwh)
            & f.Eq(x => x.QrTransfer, expected.QrTransfer);
        var update = Builders<EnergyReservation>.Update.Set(x => x.QrTransfer, next);
        if (complete)
        {
            update = update.Set(x => x.Status, ReservationStatus.Completed);
        }
        var result = await _reservations.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
        return result.ModifiedCount == 1;
    }
}
