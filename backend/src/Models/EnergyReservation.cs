/*
 * Energy reservation document in the EnergyReservation collection.
 * QR transfer state stays on this document so partial updates can preserve it.
 */
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolar.Microgrid.Models;

[BsonIgnoreExtraElements]
public sealed class EnergyReservation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ReservationId { get; set; } = string.Empty;

    [BsonElement("prosumerId")]
    public string ProsumerId { get; set; } = string.Empty;

    [BsonElement("stationId")]
    public string StationId { get; set; } = string.Empty;

    [BsonElement("slotId")]
    public string SlotId { get; set; } = string.Empty;

    [BsonElement("scheduledDateTime")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime ScheduledDateTime { get; set; }

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

    [BsonElement("createdAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime UpdatedAt { get; set; }

    [BsonElement("cancelledAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? CancelledAt { get; set; }

    [BsonElement("completedAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? CompletedAt { get; set; }

    [BsonElement("energyKwh")]
    public double EnergyKwh { get; set; }

    [BsonElement("qrTransfer")]
    public QrTransferState? QrTransfer { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class QrTransferState
{
    [BsonElement("tokenHash")]
    public string TokenHash { get; set; } = string.Empty;
    [BsonElement("tokenStatus")]
    public string TokenStatus { get; set; } = "Issued";
    [BsonElement("issuedAtUtc")]
    public DateTime IssuedAtUtc { get; set; }
    [BsonElement("verificationHash")]
    public string? VerificationHash { get; set; }
    [BsonElement("verifiedBy")]
    public string? VerifiedBy { get; set; }
    [BsonElement("verifiedAtUtc")]
    public DateTime? VerifiedAtUtc { get; set; }
    [BsonElement("reservationFingerprint")]
    public string? ReservationFingerprint { get; set; }
    [BsonElement("completedBy")]
    public string? CompletedBy { get; set; }
    [BsonElement("completedAtUtc")]
    public DateTime? CompletedAtUtc { get; set; }
}
