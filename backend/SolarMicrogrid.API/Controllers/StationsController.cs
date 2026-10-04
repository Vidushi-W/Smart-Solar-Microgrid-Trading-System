// HTTP surface for listing, nearby search, and editing stations on the reservation API.
using Microsoft.AspNetCore.Mvc;
using SolarMicrogrid.API.DTOs;
using SolarMicrogrid.API.Interfaces;

namespace SolarMicrogrid.API.Controllers;

[ApiController]
[Route("api/stations")]
public class StationsController : ControllerBase
{
    private readonly IStationService _stations;

    public StationsController(IStationService stations)
    {
        _stations = stations;
    }

    [HttpGet]
    public Task<IReadOnlyList<StationDto>> List(CancellationToken cancellationToken)
    {
        return _stations.ListStationsAsync(cancellationToken);
    }

    [HttpGet("nearby")]
    public Task<IReadOnlyList<NearbyStationDto>> Nearby(
        [FromQuery] double latitude,
        [FromQuery] double longitude,
        [FromQuery] double radiusKm = 25,
        CancellationToken cancellationToken = default)
    {
        return _stations.ListNearbyAsync(latitude, longitude, radiusKm, cancellationToken);
    }

    [HttpGet("{id}")]
    public Task<StationDto> Get(string id, CancellationToken cancellationToken)
    {
        return _stations.GetStationAsync(id, cancellationToken);
    }

    [HttpPost]
    public async Task<ActionResult<StationDto>> Create(StationWriteRequest request, CancellationToken cancellationToken)
    {
        var created = await _stations.CreateStationAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPatch("{id}")]
    public Task<StationDto> Update(string id, StationWriteRequest request, CancellationToken cancellationToken)
    {
        return _stations.UpdateStationAsync(id, request, cancellationToken);
    }

    [HttpPatch("{id}/status")]
    public Task<StationDto> Status(string id, StationStatusRequest request, CancellationToken cancellationToken)
    {
        return _stations.SetStationStatusAsync(id, request.Status, cancellationToken);
    }
}
