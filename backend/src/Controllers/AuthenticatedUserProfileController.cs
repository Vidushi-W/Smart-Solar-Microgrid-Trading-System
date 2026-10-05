using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;

namespace SolarMicrogridTrading.Api.Controllers;

[ApiController]
[Route("api/users/me/profile")]
[Authorize(Roles = "Backoffice,GridOperator")]
public sealed class AuthenticatedUserProfileController : ControllerBase
{
    private readonly IUserManagementService userManagementService;

    public AuthenticatedUserProfileController(IUserManagementService userManagementService)
    {
        this.userManagementService = userManagementService;
    }

    [HttpGet]
    public async Task<ActionResult<UserSummaryResponse>> GetProfile(CancellationToken cancellationToken)
    {
        var userId = GetAuthenticatedUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var user = await userManagementService.GetByIdAsync(userId, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPut]
    public async Task<ActionResult<UserSummaryResponse>> UpdateProfile(
        UpdateWebUserRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetAuthenticatedUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (userId is null || role is null)
        {
            return Unauthorized();
        }

        var selfUpdate = request with { Role = role };
        var result = await userManagementService.UpdateAsync(userId, selfUpdate, cancellationToken);
        if (result.User is not null)
        {
            return Ok(result.User);
        }

        return result.Error is null
            ? NotFound()
            : BadRequest(new { message = result.Error });
    }

    private string? GetAuthenticatedUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
}
