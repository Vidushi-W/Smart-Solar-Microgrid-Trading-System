// Development-only MongoDB ping used to see whether the reservation API can reach its database.
using Microsoft.AspNetCore.Mvc;
using SolarMicrogrid.API.DTOs;
using SolarMicrogrid.API.Interfaces;

namespace SolarMicrogrid.API.Controllers;

[ApiController]
[Route("api/health")]
public class DatabaseHealthController : ControllerBase
{
    private readonly IMongoConnectionService _connection;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<DatabaseHealthController> _logger;

    public DatabaseHealthController(
        IMongoConnectionService connection,
        IHostEnvironment environment,
        ILogger<DatabaseHealthController> logger)
    {
        _connection = connection;
        _environment = environment;
        _logger = logger;
    }

    // Returns 404 outside Development. A failed ping is 503.
    [HttpGet("database")]
    public async Task<ActionResult<DatabaseStatusResponse>> GetDatabaseStatus(CancellationToken cancellationToken)
    {
        if (!_environment.IsDevelopment())
        {
            return NotFound();
        }

        try
        {
            var connected = await _connection.PingAsync(cancellationToken);
            return Ok(new DatabaseStatusResponse(connected, _connection.DatabaseName));
        }
        catch (Exception exception)
        {
            _logger.LogWarning("MongoDB ping failed with {ExceptionType}.", exception.GetType().Name);
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new DatabaseStatusResponse(false, _connection.DatabaseName));
        }
    }
}
