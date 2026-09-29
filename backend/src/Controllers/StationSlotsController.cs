using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Services;

namespace SmartSolar.Microgrid.Controllers;

[ApiController]
[Route("api/stations/{stationId}/slots")]
public sealed class StationSlotsController : ControllerBase
{
    private readonly IEnergyBookingSlotService _service;

    public StationSlotsController(IEnergyBookingSlotService service) => _service = service;

    [HttpPost]
    [ProducesResponseType(typeof(EnergyBookingSlotResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EnergyBookingSlotResponse>> Create(
        string stationId,
        [FromBody] CreateEnergyBookingSlotRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(stationId, request, cancellationToken);
        if (result.StationNotFound)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "Station not found");
        }
        if (result.StationInactive)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Station is not active",
                detail: "Slots can only be added to an active station.");
        }
        if (result.Overlap)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Slot overlaps an existing slot",
                detail: "The slot overlaps another slot for this station and date.");
        }

        return StatusCode(StatusCodes.Status201Created, result.Slot);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<EnergyBookingSlotResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<EnergyBookingSlotResponse>>> GetByDate(
        string stationId,
        [FromQuery, Required, RegularExpression("^\\d{4}-\\d{2}-\\d{2}$")] string? date,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByStationAndDateAsync(stationId, date!, cancellationToken);
        if (result.InvalidDate)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid date",
                detail: "Date must be a valid calendar date in yyyy-MM-dd format.");
        }
        if (result.StationNotFound)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "Station not found");
        }

        return Ok(result.Slots);
    }
}
