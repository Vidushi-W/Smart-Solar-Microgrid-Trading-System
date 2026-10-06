using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Services;
using SolarMicrogridTrading.Api.Constants;

namespace SmartSolar.Microgrid.Controllers;

[ApiController]
[Route("api/slots")]
[Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
public sealed class EnergyBookingSlotsController : ControllerBase
{
    private readonly IEnergyBookingSlotService _service;

    public EnergyBookingSlotsController(IEnergyBookingSlotService service) => _service = service;

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(EnergyBookingSlotResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EnergyBookingSlotResponse>> Update(
        string id,
        [FromBody] UpdateEnergyBookingSlotRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var slot = await _service.UpdateAsync(id, request, cancellationToken);
            return slot is null
                ? Problem(statusCode: StatusCodes.Status404NotFound, title: "Slot not found")
                : Ok(slot);
        }
        catch (SlotOverlapException exception)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Slot overlaps an existing slot",
                detail: exception.Message);
        }
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var result = await _service.DeleteAsync(id, cancellationToken);
        return result switch
        {
            DeleteEnergyBookingSlotResult.Deleted => NoContent(),
            DeleteEnergyBookingSlotResult.NotFound => Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Slot not found"),
            DeleteEnergyBookingSlotResult.HasReservations => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Slot has reservations",
                detail: "This slot has reservations and cannot be deleted."),
            _ => Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Reservation check unavailable",
                detail: "The slot was not deleted because reservation status could not be verified."),
        };
    }
}
