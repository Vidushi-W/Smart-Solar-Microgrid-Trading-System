using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;

namespace SolarMicrogridTrading.Api.Controllers;

[ApiController]
[Route("api/prosumers")]
public sealed class ProsumerManagementController : ControllerBase
{
    private readonly IProsumerStatusService statusService;
    private readonly IProsumerProfileService profileService;

    public ProsumerManagementController(
        IProsumerStatusService statusService,
        IProsumerProfileService profileService)
    {
        this.statusService = statusService;
        this.profileService = profileService;
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

    [HttpGet("me/profile")]
    [Authorize(Policy = AuthorizationPolicies.ProsumerOnly)]
    public async Task<IActionResult> GetOwnProfileDetails(CancellationToken cancellationToken)
    {
        var userId = GetAuthenticatedUserId();
        return userId is null
            ? Unauthorized()
            : ProfileResult(await profileService.GetAsync(userId, cancellationToken));
    }

    [HttpPut("me/profile")]
    [Authorize(Policy = AuthorizationPolicies.ProsumerOnly)]
    public async Task<IActionResult> UpdateOwnProfile(
        UpdateProsumerProfileRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetAuthenticatedUserId();
        return userId is null
            ? Unauthorized()
            : ProfileResult(await profileService.UpdateAsync(userId, request, cancellationToken));
    }

    [HttpPost("me/deactivation")]
    [Authorize(Policy = AuthorizationPolicies.ProsumerOnly)]
    public async Task<IActionResult> RequestOwnDeactivation(CancellationToken cancellationToken)
    {
        var userId = GetAuthenticatedUserId();
        return userId is null
            ? Unauthorized()
            : TransitionResult(await statusService.RequestDeactivationAsync(userId, cancellationToken));
    }

    private IActionResult TransitionResult(object? result) =>
        result is null ? NotFound(new { message = "The prosumer is not in a valid state for this transition." }) : Ok(result);

    private IActionResult ProfileResult((ProsumerProfileResponse? Profile, string? Error) result)
    {
        if (result.Profile is not null)
        {
            return Ok(result.Profile);
        }

        return result.Error == "Prosumer profile was not found."
            ? NotFound(new { message = result.Error })
            : BadRequest(new { message = result.Error });
    }

    private string? GetAuthenticatedUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
}
