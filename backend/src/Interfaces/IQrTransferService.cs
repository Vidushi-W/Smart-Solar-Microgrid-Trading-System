/*
 * FAT Service boundary for issuance, verification and explicit transfer completion.
 * The principal must originate from server authentication, never request fields.
 */
using System.Security.Claims;
using SmartSolar.Microgrid.DTOs;

namespace SmartSolar.Microgrid.Interfaces;

public enum QrTransferError { None, InvalidRequest, Forbidden, NotFound, Conflict }
public sealed record QrTransferResult<T>(T? Value, QrTransferError Error = QrTransferError.None,
    string? Message = null) where T : class;

public interface IQrTransferService
{
    /// <summary>Issue or rotate the owning prosumer's token after approval.</summary>
    Task<QrTransferResult<IssueQrResponse>> IssueAsync(string reservationId, ClaimsPrincipal user,
        CancellationToken cancellationToken);
    /// <summary>Verify an opaque QR token without completing the reservation.</summary>
    Task<QrTransferResult<QrTransferResponse>> VerifyAsync(VerifyQrRequest request, ClaimsPrincipal user,
        CancellationToken cancellationToken);
    /// <summary>Revalidate and atomically finalize after explicit operator confirmation.</summary>
    Task<QrTransferResult<QrTransferResponse>> CompleteAsync(string reservationId,
        CompleteEnergyTransferRequest request, ClaimsPrincipal user, CancellationToken cancellationToken);
}
