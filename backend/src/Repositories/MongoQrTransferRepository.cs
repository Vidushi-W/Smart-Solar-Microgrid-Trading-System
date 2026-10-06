/*
 * MongoDB adapter for QR transfer state in EnergyReservation.
 * Single-document compare-and-set prevents duplicate completion and lost updates.
 */
using Microsoft.Extensions.Options;
using System.Runtime.CompilerServices;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Repositories;

public sealed class MongoQrTransferRepository : IQrTransferRepository
{
    private readonly IMongoCollection<BsonDocument> _reservations;
    private readonly ConditionalWeakTable<EnergyReservation, BsonDocument> _snapshots = new();

    // Reuse the shared database and configuration; no separate transaction collection.
    public MongoQrTransferRepository(IMongoDatabase database, IOptions<MongoDbSettings> options) =>
        _reservations = database.GetCollection<BsonDocument>(options.Value.ReservationsCollectionName);

    // QR reservations use string IDs; newer account reservations use BSON ObjectIds.
    public async Task<EnergyReservation?> GetAsync(string reservationId, CancellationToken cancellationToken)
    {
        var f = Builders<BsonDocument>.Filter;
        var filter = f.Eq("_id", reservationId);
        if (ObjectId.TryParse(reservationId, out var objectId))
            filter |= f.Eq("_id", objectId);
        var document = await _reservations.Find(filter).FirstOrDefaultAsync(cancellationToken);
        if (document is null) return null;
        var status = document.GetValue(Field(document, "status", "Status"), "").AsString;
        if (!Enum.TryParse<ReservationStatus>(status, out var reservationStatus)
            || !Enum.IsDefined(reservationStatus)) return null;
        var reservation = new EnergyReservation
        {
            ReservationId = document["_id"].ToString()!,
            ProsumerId = document.GetValue(Field(document, "prosumerId", "ProsumerId"), "").AsString,
            StationId = document.GetValue(Field(document, "stationId", "StationId"), "").AsString,
            SlotId = document.GetValue(Field(document, "slotId", "SlotId"), "").AsString,
            EnergyKwh = document.GetValue(Field(document, "energyKwh", "EnergyKwh"), 0).ToDouble(),
            Status = reservationStatus,
            QrTransfer = document.GetValue("qrTransfer", BsonNull.Value) is BsonDocument qr
                ? BsonSerializer.Deserialize<QrTransferState>(qr) : null,
        };
        _snapshots.Add(reservation, document);
        return reservation;
    }

    private static string Field(BsonDocument document, string current, string legacy) =>
        document.Contains(current) ? current : document.Contains(legacy) ? legacy : current;

    // Compare every reservation field used in verification and the entire QR state.
    public async Task<bool> TryUpdateAsync(EnergyReservation expected, QrTransferState next,
        bool complete, CancellationToken cancellationToken)
    {
        if (!_snapshots.TryGetValue(expected, out var document)) return false;
        var f = Builders<BsonDocument>.Filter;
        var statusField = Field(document, "status", "Status");
        var filter = f.Eq("_id", document["_id"]);
        foreach (var field in new[] { statusField, Field(document, "prosumerId", "ProsumerId"),
            Field(document, "stationId", "StationId"), Field(document, "slotId", "SlotId"),
            Field(document, "energyKwh", "EnergyKwh"), "qrTransfer" })
        {
            filter &= document.TryGetValue(field, out var value)
                ? f.Eq(field, value) : f.Exists(field, false);
        }
        var update = Builders<BsonDocument>.Update.Set("qrTransfer", next.ToBsonDocument());
        if (complete)
        {
            update = update.Set(statusField, nameof(ReservationStatus.Completed));
        }
        var result = await _reservations.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
        return result.ModifiedCount == 1;
    }
}
