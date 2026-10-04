// HTTP surface for energy slots on the reservation API.
using Microsoft.AspNetCore.Mvc;
using SolarMicrogrid.API.DTOs;
using SolarMicrogrid.API.Interfaces;

namespace SolarMicrogrid.API.Controllers;

[ApiController]
[Route("api/slots")]
public class SlotsController : ControllerBase
{
    private readonly IStationService _stations;

    public SlotsController(IStationService stations)
    {
        _stations = stations;
    }

    [HttpGet]
    public Task<IReadOnlyList<SlotDto>> List([FromQuery] string? stationId, CancellationToken cancellationToken)
    {
        return _stations.ListSlotsAsync(stationId, cancellationToken);
    }

    [HttpGet("{id}")]
    public Task<SlotDto> Get(string id, CancellationToken cancellationToken)
    {
        return _stations.GetSlotAsync(id, cancellationToken);
    }

    [HttpPost]
    public async Task<ActionResult<SlotDto>> Create(SlotWriteRequest request, CancellationToken cancellationToken)
    {
        var created = await _stations.CreateSlotAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPatch("{id}")]
    public Task<SlotDto> Update(string id, SlotWriteRequest request, CancellationToken cancellationToken)
    {
        return _stations.UpdateSlotAsync(id, request, cancellationToken);
    }

    [HttpPatch("{id}/availability")]
    public Task<SlotDto> Availability(string id, SlotAvailabilityRequest request, CancellationToken cancellationToken)
    {
        return _stations.SetSlotOpenAsync(id, request.IsOpen, cancellationToken);
    }
}
