/*
 * QR Energy Transfer FAT Service: authoritative permissions, lifecycle checks,
 * cryptographic token verification and confirmation before atomic completion.
 */
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Services;

public sealed class QrTransferService(IQrTransferRepository repository) : IQrTransferService
{
    // Only authenticated server identities qualify; the current scaffold therefore denies access.
    private static ClaimsIdentity? Identity(ClaimsPrincipal user, params string[] roles) =>
        user.Identities.FirstOrDefault(identity => identity.IsAuthenticated
            && !string.IsNullOrWhiteSpace(identity.FindFirst(ClaimTypes.NameIdentifier)?.Value)
            && roles.Any(role => identity.HasClaim(identity.RoleClaimType, role)));

    // Rotate the token for an approved/scheduled reservation; the previous QR and receipt stop working.
    public async Task<QrTransferResult<IssueQrResponse>> IssueAsync(string reservationId,
        ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var identity = Identity(user, "Prosumer", "Backoffice");
        if (identity is null) return Fail<IssueQrResponse>(QrTransferError.Forbidden, "An authenticated Prosumer or Backoffice identity is required.");
        if (!ValidId(reservationId)) return Fail<IssueQrResponse>(QrTransferError.InvalidRequest, "Invalid reservation identifier.");
        var reservation = await repository.GetAsync(reservationId, cancellationToken);
        if (reservation is null) return Fail<IssueQrResponse>(QrTransferError.NotFound, "Reservation not found.");
        if (!identity.HasClaim(identity.RoleClaimType, "Backoffice")
            && identity.FindFirst(ClaimTypes.NameIdentifier)!.Value != reservation.ProsumerId)
            return Fail<IssueQrResponse>(QrTransferError.Forbidden, "Only the owning prosumer can obtain this QR.");
        if (!Eligible(reservation)) return Fail<IssueQrResponse>(QrTransferError.Conflict, "An approved or scheduled, incomplete reservation is required.");

        var token = NewToken();
        var state = new QrTransferState { TokenHash = Hash(token), IssuedAtUtc = DateTime.UtcNow };
        if (!await repository.TryUpdateAsync(reservation, state, false, cancellationToken))
            return Changed<IssueQrResponse>();
        return new(new(reservation.ReservationId, new(1, reservation.ReservationId, token)));
    }

    // Save a receipt bound to this operator and the verified reservation snapshot, without completion.
    public async Task<QrTransferResult<QrTransferResponse>> VerifyAsync(VerifyQrRequest request,
        ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var identity = Identity(user, "GridOperator");
        if (identity is null) return Fail<QrTransferResponse>(QrTransferError.Forbidden, "An authenticated GridOperator identity is required.");
        if (request.Version != 1 || !ValidId(request.ReservationId) || !ValidToken(request.Token))
            return Fail<QrTransferResponse>(QrTransferError.InvalidRequest, "Invalid QR payload or unsupported version.");
        var reservation = await repository.GetAsync(request.ReservationId, cancellationToken);
        var failure = CheckToken(reservation, request.Token);
        if (failure is not null) return failure;

        var receipt = NewToken();
        var state = new QrTransferState
        {
            TokenHash = reservation!.QrTransfer!.TokenHash,
            IssuedAtUtc = reservation.QrTransfer.IssuedAtUtc,
            TokenStatus = "Verified",
            VerificationHash = Hash(receipt),
            VerifiedBy = identity.FindFirst(ClaimTypes.NameIdentifier)!.Value,
            VerifiedAtUtc = DateTime.UtcNow,
            ReservationFingerprint = Fingerprint(reservation),
        };
        if (!await repository.TryUpdateAsync(reservation, state, false, cancellationToken))
            return Changed<QrTransferResponse>();
        return new(Response(reservation, state, receipt));
    }

    // Re-read MongoDB and consume the QR and verification receipt in the same write as Completed.
    public async Task<QrTransferResult<QrTransferResponse>> CompleteAsync(string reservationId,
        CompleteEnergyTransferRequest request, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var identity = Identity(user, "GridOperator");
        if (identity is null) return Fail<QrTransferResponse>(QrTransferError.Forbidden, "An authenticated GridOperator identity is required.");
        if (!ValidId(reservationId) || !ValidToken(request.Token) || !ValidToken(request.VerificationToken))
            return Fail<QrTransferResponse>(QrTransferError.InvalidRequest, "Invalid completion credentials.");
        var reservation = await repository.GetAsync(reservationId, cancellationToken);
        var failure = CheckToken(reservation, request.Token);
        if (failure is not null) return failure;
        var previous = reservation!.QrTransfer!;
        var operatorId = identity.FindFirst(ClaimTypes.NameIdentifier)!.Value;
        if (reservation.Status != "Scheduled")
            return Fail<QrTransferResponse>(QrTransferError.Conflict, "The reservation must be Scheduled before completion.");
        if (previous.TokenStatus != "Verified" || !Matches(request.VerificationToken, previous.VerificationHash)
            || previous.VerifiedBy != operatorId || previous.ReservationFingerprint != Fingerprint(reservation))
            return Fail<QrTransferResponse>(QrTransferError.Conflict, "Verify the current reservation with this operator before confirming transfer.");

        var state = new QrTransferState
        {
            TokenHash = previous.TokenHash,
            IssuedAtUtc = previous.IssuedAtUtc,
            TokenStatus = "Used",
            VerifiedBy = previous.VerifiedBy,
            VerifiedAtUtc = previous.VerifiedAtUtc,
            ReservationFingerprint = previous.ReservationFingerprint,
            CompletedBy = operatorId,
            CompletedAtUtc = DateTime.UtcNow,
        };
        if (!await repository.TryUpdateAsync(reservation, state, true, cancellationToken))
            return Changed<QrTransferResponse>();
        reservation.Status = "Completed";
        return new(Response(reservation, state, null));
    }

    // Reject missing, mismatched, used and ineligible reservations using persisted state only.
    private static QrTransferResult<QrTransferResponse>? CheckToken(EnergyReservation? reservation, string token)
    {
        if (reservation is null) return Fail<QrTransferResponse>(QrTransferError.NotFound, "Reservation not found.");
        if (!Matches(token, reservation.QrTransfer?.TokenHash))
            return Fail<QrTransferResponse>(QrTransferError.Forbidden, "QR token does not match the reservation.");
        if (!Eligible(reservation) || reservation.QrTransfer!.TokenStatus is not ("Issued" or "Verified"))
            return Fail<QrTransferResponse>(QrTransferError.Conflict, "Reservation is ineligible or the QR has already been used.");
        return null;
    }

    // Mirror the existing web lifecycle without adding time, billing or capacity rules.
    private static bool Eligible(EnergyReservation r) => r.Status is "Approved" or "Scheduled"
        && r.QrTransfer?.TokenStatus != "Used" && r.QrTransfer?.CompletedAtUtc is null
        && ValidId(r.ProsumerId) && ValidId(r.StationId) && ValidId(r.SlotId)
        && double.IsFinite(r.EnergyKwh) && r.EnergyKwh > 0;

    // Bound input sizes and accept the exact canonical opaque-token encoding.
    private static bool ValidId(string? value) => !string.IsNullOrWhiteSpace(value) && value.Length <= 200;
    private static bool ValidToken(string? value) => value is not null && value.Length == 64
        && Regex.IsMatch(value, "\\A[A-F0-9]{64}\\z", RegexOptions.CultureInvariant);
    private static string NewToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    // Fixed-time comparisons avoid exposing partial hash matches; raw tokens are never persisted.
    private static bool Matches(string token, string? storedHash) => ValidToken(storedHash)
        && CryptographicOperations.FixedTimeEquals(Convert.FromHexString(Hash(token)), Convert.FromHexString(storedHash!));

    // Bind confirmation to exactly the reservation details returned for operator review.
    private static string Fingerprint(EnergyReservation r) => Hash(JsonSerializer.Serialize(new
        { r.ReservationId, r.ProsumerId, r.StationId, r.SlotId, r.EnergyKwh, r.Status }));

    // Return authoritative fields only and keep all stored hashes private.
    private static QrTransferResponse Response(EnergyReservation r, QrTransferState state, string? receipt) =>
        new(r.ReservationId, r.ReservationId, r.ProsumerId, r.StationId, r.SlotId, r.EnergyKwh,
            r.Status, state.TokenStatus, receipt, state.CompletedAtUtc, state.CompletedBy);

    // Preserve the existing result-oriented service/controller error boundary.
    private static QrTransferResult<T> Fail<T>(QrTransferError error, string message) where T : class => new(null, error, message);
    private static QrTransferResult<T> Changed<T>() where T : class =>
        Fail<T>(QrTransferError.Conflict, "Reservation or QR state changed. Verify again before proceeding.");
}
