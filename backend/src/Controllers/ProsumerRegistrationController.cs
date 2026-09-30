using Microsoft.AspNetCore.Mvc;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;

namespace SolarMicrogridTrading.Api.Controllers;

[ApiController]
[Route("api/prosumers")]
public sealed class ProsumerRegistrationController : ControllerBase
{
    private readonly IProsumerRegistrationService registrationService;

    public ProsumerRegistrationController(IProsumerRegistrationService registrationService)
    {
        this.registrationService = registrationService;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(ProsumerRegistrationResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProsumerRegistrationResponse>> Register(
        RegisterProsumerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await registrationService.RegisterAsync(request, cancellationToken);
        if (result.Response is not null)
        {
            return Accepted(result.Response);
        }

        return result.Error?.Contains("already exists", StringComparison.OrdinalIgnoreCase) == true
            ? Conflict(new { message = result.Error })
            : BadRequest(new { message = result.Error ?? "Registration failed." });
    }
}
