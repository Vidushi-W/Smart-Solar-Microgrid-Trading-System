// HTTP surface for reservation search, create, change, cancel, approve, reject, and schedule.
// Rules live in ReservationService.
using Microsoft.AspNetCore.Mvc;
using SolarMicrogrid.API.DTOs;
using SolarMicrogrid.API.Interfaces;

namespace SolarMicrogrid.API.Controllers;

[ApiController]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservations;

    public ReservationsController(IReservationService reservations)
    {
        _reservations = reservations;
    }

    [HttpGet("options")]
    public Task<ReservationOptionsDto> Options([FromQuery] string? prosumerId, CancellationToken cancellationToken)
    {
        return _reservations.GetOptionsAsync(prosumerId, cancellationToken);
    }

    [HttpGet]
    public Task<IReadOnlyList<ReservationDto>> List(
        [FromQuery] string? status,
        [FromQuery] string? stationId,
        [FromQuery] string? date,
        [FromQuery] string? q,
        CancellationToken cancellationToken)
    {
        return _reservations.SearchAsync(status, stationId, date, q, cancellationToken);
    }

    [HttpGet("{id}")]
    public Task<ReservationDto> Get(string id, CancellationToken cancellationToken)
    {
        return _reservations.GetAsync(id, cancellationToken);
    }

    [HttpPost]
    public async Task<ActionResult<ReservationDto>> Create(CreateReservationRequest request, CancellationToken cancellationToken)
    {
        var created = await _reservations.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPatch("{id}")]
    public Task<ReservationDto> Modify(string id, ModifyReservationRequest request, CancellationToken cancellationToken)
    {
        return _reservations.ModifyAsync(id, request, cancellationToken);
    }

    [HttpPost("{id}/cancel")]
    public Task<ReservationDto> Cancel(string id, CancellationToken cancellationToken)
    {
        return _reservations.CancelAsync(id, cancellationToken);
    }

    [HttpPost("{id}/approve")]
    public Task<ReservationDto> Approve(string id, CancellationToken cancellationToken)
    {
        return _reservations.ApproveAsync(id, cancellationToken);
    }

    [HttpPost("{id}/reject")]
    public Task<ReservationDto> Reject(string id, RejectReservationRequest request, CancellationToken cancellationToken)
    {
        return _reservations.RejectAsync(id, request, cancellationToken);
    }

    [HttpPost("{id}/schedule")]
    public Task<ReservationDto> Schedule(string id, CancellationToken cancellationToken)
    {
        return _reservations.ScheduleAsync(id, cancellationToken);
    }
}
