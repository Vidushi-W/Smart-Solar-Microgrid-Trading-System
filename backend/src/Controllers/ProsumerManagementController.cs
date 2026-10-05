// Backoffice queue for pending activation, deactivation, and reactivation.
// A prosumer can sign in only after the account is Active.
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

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> GetAllProsumers(CancellationToken cancellationToken) =>
        Ok(await statusService.GetAllAsync(cancellationToken));

    [HttpGet("{nic}")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> GetProsumerByNic(string nic, CancellationToken cancellationToken) =>
        ProfileResult(await profileService.GetByNicAsync(nic, cancellationToken));

    [HttpPut("{nic}")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> UpdateProsumerByNic(
        string nic,
        UpdateProsumerProfileRequest request,
        CancellationToken cancellationToken) =>
        ProfileResult(await profileService.UpdateByNicAsync(nic, request, cancellationToken));

    [HttpGet("pending")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> GetPendingProsumers(CancellationToken cancellationToken) =>
        Ok(await statusService.GetPendingAsync(cancellationToken));

    [HttpGet("deactivated")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> GetDeactivatedProsumers(CancellationToken cancellationToken) =>
        Ok(await statusService.GetDeactivatedAsync(cancellationToken));

    [HttpPost("{identifier}/activate")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> ActivateProsumer(string identifier, CancellationToken cancellationToken) =>
        TransitionResult(await statusService.ActivateAsync(identifier, cancellationToken));

    [HttpPost("{identifier}/deactivate")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> DeactivateProsumer(string identifier, CancellationToken cancellationToken) =>
        TransitionResult(await statusService.ProcessDeactivationAsync(identifier, cancellationToken));

    [HttpPost("{identifier}/request-deactivation")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> RequestProsumerDeactivation(string identifier, CancellationToken cancellationToken) =>
        TransitionResult(await statusService.RequestDeactivationAsync(identifier, cancellationToken));

    [HttpPost("{identifier}/reactivate")]
    [Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
    public async Task<IActionResult> ReactivateProsumer(string identifier, CancellationToken cancellationToken) =>
        TransitionResult(await statusService.ReactivateAsync(identifier, cancellationToken));

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
