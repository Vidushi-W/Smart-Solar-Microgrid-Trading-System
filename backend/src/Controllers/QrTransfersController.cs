/*
 * Thin HTTP adapter for QR issuance, verification and operator confirmation.
 * Authorization and business decisions remain in the FAT Service.
 */
using Microsoft.AspNetCore.Mvc;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;

namespace SmartSolar.Microgrid.Controllers;

[ApiController]
[Route("api")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
public sealed class QrTransfersController(IQrTransferService service) : ControllerBase
{
    // Issue on demand after approval; authentication supplies the owner/staff identity.
    [HttpPost("reservations/{id}/qr")]
    [ProducesResponseType(typeof(IssueQrResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<IssueQrResponse>> Issue(string id, CancellationToken cancellationToken) =>
        ToAction(await service.IssueAsync(id, User, cancellationToken));

    // A scan verifies only; Android must display these details before a separate confirmation.
    [HttpPost("transactions/verify")]
    [ProducesResponseType(typeof(QrTransferResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<QrTransferResponse>> Verify([FromBody] VerifyQrRequest request,
        CancellationToken cancellationToken) => ToAction(await service.VerifyAsync(request, User, cancellationToken));

    // TransactionId is the reservation _id in this single-document foundation.
    [HttpPost("transactions/{id}/complete")]
    [ProducesResponseType(typeof(QrTransferResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<QrTransferResponse>> Complete(string id,
        [FromBody] CompleteEnergyTransferRequest request, CancellationToken cancellationToken) =>
        ToAction(await service.CompleteAsync(id, request, User, cancellationToken));

    // Map domain failures to the project's ProblemDetails HTTP convention.
    private ActionResult<T> ToAction<T>(QrTransferResult<T> result) where T : class => result.Error switch
    {
        QrTransferError.None => Ok(result.Value),
        QrTransferError.InvalidRequest => Problem(statusCode: 400, title: result.Message),
        QrTransferError.Forbidden => Problem(statusCode: 403, title: result.Message),
        QrTransferError.NotFound => Problem(statusCode: 404, title: result.Message),
        _ => Problem(statusCode: 409, title: result.Message),
    };
}
