// Station list, nearby search, update, and deactivation for this API.
// The web station screens call these routes through stationsApi.
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;

namespace SmartSolar.Microgrid.Controllers;

[ApiController]
[Route("api/stations")]
public sealed class StationsController : ControllerBase
{
    private readonly IStationService _service;

    public StationsController(IStationService service) => _service = service;

    [HttpPost]
    [ProducesResponseType(typeof(StationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<StationResponse>> Create(
        [FromBody] StationWriteRequest request,
        CancellationToken cancellationToken)
    {
        var station = await _service.CreateAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, station);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<StationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StationResponse>>> GetAll(CancellationToken cancellationToken) =>
        Ok(await _service.GetAllAsync(cancellationToken));

    [HttpGet("nearby")]
    [ProducesResponseType(typeof(IReadOnlyList<StationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<StationResponse>>> GetNearby(
        [FromQuery, Required, Range(-90, 90)] double? lat,
        [FromQuery, Required, Range(-180, 180)] double? lng,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.GetNearbyAsync(lat!.Value, lng!.Value, cancellationToken));
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(StationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StationResponse>> Update(
        string id,
        [FromBody] StationWriteRequest request,
        CancellationToken cancellationToken)
    {
        var station = await _service.UpdateAsync(id, request, cancellationToken);
        return station is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: "Station not found")
            : Ok(station);
    }

    [HttpPut("{id}/deactivate")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Deactivate(string id, CancellationToken cancellationToken)
    {
        var result = await _service.DeactivateAsync(id, cancellationToken);
        return result switch
        {
            DeactivateStationResult.Deactivated => NoContent(),
            DeactivateStationResult.NotFound => Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Station not found"),
            DeactivateStationResult.HasActiveReservations => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "This station has active reservations",
                detail: "This station has active reservations"),
            _ => Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Reservation check unavailable",
                detail: "The station was not deactivated because reservation status could not be verified."),
        };
    }
}
