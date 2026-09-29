/*
 * QR Energy Transfer HTTP contracts. Requests carry identifiers and opaque
 * credentials only; reservation details always come from server persistence.
 */
using System.ComponentModel.DataAnnotations;

namespace SmartSolar.Microgrid.DTOs;

public sealed class VerifyQrRequest
{
    [Range(1, 1)]
    public int Version { get; init; }
    [Required, StringLength(200)]
    public string ReservationId { get; init; } = string.Empty;
    [Required, RegularExpression("^[A-F0-9]{64}$")]
    public string Token { get; init; } = string.Empty;
}

public sealed class CompleteEnergyTransferRequest
{
    [Required, RegularExpression("^[A-F0-9]{64}$")]
    public string Token { get; init; } = string.Empty;
    [Required, RegularExpression("^[A-F0-9]{64}$")]
    public string VerificationToken { get; init; } = string.Empty;
}

public sealed record QrPayload(int Version, string ReservationId, string Token);
public sealed record IssueQrResponse(string TransactionId, QrPayload QrPayload);
public sealed record QrTransferResponse(
    string TransactionId, string ReservationId, string ProsumerId, string StationId,
    string SlotId, double EnergyKwh, string ReservationStatus, string TokenStatus,
    string? VerificationToken, DateTime? CompletedAtUtc, string? CompletedBy);
