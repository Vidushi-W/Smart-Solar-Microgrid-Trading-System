/*
 * QR Energy Transfer foundation: minimal reservation projection.
 * Member 3 must align this contract with the reservation lifecycle before integration.
 * Partial updates preserve fields owned by other components.
 */
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolar.Microgrid.Models;

[BsonIgnoreExtraElements]
public sealed class EnergyReservation
{
    [BsonId]
    public string ReservationId { get; set; } = string.Empty;
    [BsonElement("prosumerId")]
    public string ProsumerId { get; set; } = string.Empty;
    [BsonElement("stationId")]
    public string StationId { get; set; } = string.Empty;
    [BsonElement("slotId")]
    public string SlotId { get; set; } = string.Empty;
    [BsonElement("energyKwh")]
    public double EnergyKwh { get; set; }
    [BsonElement("status")]
    public string Status { get; set; } = string.Empty;
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
