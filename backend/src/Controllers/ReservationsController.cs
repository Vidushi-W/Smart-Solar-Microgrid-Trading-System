/*
 * Thin HTTP adapter for reservation create, read, update, and cancel.
 * Authorization decisions and booking rules stay in the reservation service.
 */
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;

namespace SmartSolar.Microgrid.Controllers;

[ApiController]
[Authorize]
[Route("api/reservations")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public sealed class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservations;

    public ReservationsController(IReservationService reservations)
    {
        _reservations = reservations;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create(
        [FromBody] CreateReservationRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor, out var unauthorized))
        {
            return unauthorized!;
        }

        var outcome = await _reservations.CreateAsync(actor, request, cancellationToken);
        if (outcome.Failure != ReservationFailure.None || outcome.Value is null)
        {
            return Failure(outcome.Failure, outcome.Message);
        }

        return CreatedAtAction(nameof(GetById), new { id = outcome.Value.ReservationId }, outcome.Value);
    }

    [HttpGet("my")]
    [ProducesResponseType(typeof(IReadOnlyList<ReservationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor, out var unauthorized))
        {
            return unauthorized!;
        }

        var outcome = await _reservations.GetForProsumerAsync(actor, actor.UserId, cancellationToken);
        return outcome.Failure == ReservationFailure.None
            ? Ok(outcome.Value)
            : Failure(outcome.Failure, outcome.Message);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ReservationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor, out var unauthorized))
        {
            return unauthorized!;
        }

        var outcome = await _reservations.GetAllForStaffAsync(actor, cancellationToken);
        return outcome.Failure == ReservationFailure.None
            ? Ok(outcome.Value)
            : Failure(outcome.Failure, outcome.Message);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor, out var unauthorized))
        {
            return unauthorized!;
        }

        var outcome = await _reservations.GetAsync(actor, id, cancellationToken);
        return outcome.Failure == ReservationFailure.None
            ? Ok(outcome.Value)
            : Failure(outcome.Failure, outcome.Message);
    }

    [HttpPost("{id}/approve")]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Approve(string id, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor, out var unauthorized))
        {
            return unauthorized!;
        }

        var outcome = await _reservations.ApproveAsync(actor, id, cancellationToken);
        return outcome.Failure == ReservationFailure.None
            ? Ok(outcome.Value)
            : Failure(outcome.Failure, outcome.Message);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        string id,
        [FromBody] UpdateReservationRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor, out var unauthorized))
        {
            return unauthorized!;
        }

        var outcome = await _reservations.UpdateAsync(actor, id, request, cancellationToken);
        return outcome.Failure == ReservationFailure.None
            ? Ok(outcome.Value)
            : Failure(outcome.Failure, outcome.Message);
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Cancel(string id, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor, out var unauthorized))
        {
            return unauthorized!;
        }

        var outcome = await _reservations.CancelAsync(actor, id, cancellationToken);
        return outcome.Failure == ReservationFailure.None
            ? Ok(outcome.Value)
            : Failure(outcome.Failure, outcome.Message);
    }

    private bool TryGetActor(out ReservationActor actor, out IActionResult? unauthorized)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value;
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(role))
        {
            actor = new ReservationActor(string.Empty, string.Empty);
            unauthorized = Unauthorized(new { message = "An authenticated user is required." });
            return false;
        }

        actor = new ReservationActor(userId, role);
        unauthorized = null;
        return true;
    }

    private ObjectResult Failure(ReservationFailure failure, string? message)
    {
        var body = new { message = string.IsNullOrWhiteSpace(message) ? "The reservation request could not be completed." : message };
        return failure switch
        {
            ReservationFailure.NotFound => NotFound(body),
            ReservationFailure.Forbidden => StatusCode(StatusCodes.Status403Forbidden, body),
            _ => BadRequest(body),
        };
    }
}
