using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.Interfaces;

namespace SolarMicrogridTrading.Api.Controllers;

[ApiController]
[Route("api/prosumers")]
public sealed class ProsumerManagementController : ControllerBase
{
    private readonly IProsumerStatusService statusService;

    public ProsumerManagementController(IProsumerStatusService statusService)
    {
        this.statusService = statusService;
    }

    [HttpGet("pending")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> GetPendingProsumers(CancellationToken cancellationToken) =>
        Ok(await statusService.GetPendingAsync(cancellationToken));

    [HttpPost("{userId}/activate")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> ActivateProsumer(string userId, CancellationToken cancellationToken) =>
        TransitionResult(await statusService.ActivateAsync(userId, cancellationToken));

    [HttpPost("{userId}/deactivate")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> DeactivateProsumer(string userId, CancellationToken cancellationToken) =>
        TransitionResult(await statusService.ProcessDeactivationAsync(userId, cancellationToken));

    [HttpPost("{userId}/reactivate")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> ReactivateProsumer(string userId, CancellationToken cancellationToken) =>
        TransitionResult(await statusService.ReactivateAsync(userId, cancellationToken));

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
    public async Task<IActionResult> RequestOwnDeactivation(CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return userId is null
            ? Unauthorized()
            : TransitionResult(await statusService.RequestDeactivationAsync(userId, cancellationToken));
    }

    private IActionResult TransitionResult(object? result) =>
        result is null ? NotFound(new { message = "The prosumer is not in a valid state for this transition." }) : Ok(result);
}
