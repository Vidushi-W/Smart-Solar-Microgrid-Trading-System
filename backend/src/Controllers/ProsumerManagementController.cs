using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarMicrogridTrading.Api.Constants;

namespace SolarMicrogridTrading.Api.Controllers;

[ApiController]
[Route("api/prosumers")]
public sealed class ProsumerManagementController : ControllerBase
{
    [HttpGet("pending")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public IActionResult GetPendingProsumers() => NotImplemented("Pending prosumer activation is not implemented yet.");

    [HttpPost("{userId}/activate")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public IActionResult ActivateProsumer(string userId) => NotImplemented("Prosumer activation is not implemented yet.");

    [HttpPost("{userId}/reactivate")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public IActionResult ReactivateProsumer(string userId) => NotImplemented("Prosumer reactivation is not implemented yet.");

    [HttpGet("me")]
    [Authorize]
    public IActionResult GetOwnProfile() => Ok(new
    {
        userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value,
        username = User.Identity?.Name,
        role = User.FindFirst(ClaimTypes.Role)?.Value
    });

    [HttpPost("me/deactivation")]
    [Authorize(Policy = AuthorizationPolicies.ProsumerOnly)]
    public IActionResult RequestOwnDeactivation() => NotImplemented("Prosumer deactivation requests are not implemented yet.");

    private ObjectResult NotImplemented(string message) =>
        StatusCode(StatusCodes.Status501NotImplemented, new { message });
}
