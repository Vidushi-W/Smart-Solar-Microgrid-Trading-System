using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;

namespace SolarMicrogridTrading.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
public sealed class UserManagementController : ControllerBase
{
    private readonly IUserManagementService userManagementService;

    public UserManagementController(IUserManagementService userManagementService)
    {
        this.userManagementService = userManagementService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserSummaryResponse>>> GetUsers(CancellationToken cancellationToken)
    {
        return Ok(await userManagementService.GetAllAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<UserSummaryResponse>> CreateUser(
        CreateWebUserRequest request,
        CancellationToken cancellationToken)
    {
        var result = await userManagementService.CreateAsync(request, cancellationToken);
        if (result.User is not null)
        {
            return CreatedAtAction(nameof(GetUser), new { id = result.User.Id }, result.User);
        }

        return result.Error?.Contains("already exists", StringComparison.OrdinalIgnoreCase) == true
            ? Conflict(new { message = result.Error })
            : BadRequest(new { message = result.Error ?? "User could not be created." });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserSummaryResponse>> GetUser(string id, CancellationToken cancellationToken)
    {
        var user = await userManagementService.GetByIdAsync(id, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UserSummaryResponse>> UpdateUser(
        string id,
        UpdateWebUserRequest request,
        CancellationToken cancellationToken)
    {
        var result = await userManagementService.UpdateAsync(id, request, cancellationToken);
        if (result.User is not null)
        {
            return Ok(result.User);
        }

        return result.Error is null
            ? NotFound()
            : BadRequest(new { message = result.Error });
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<UserSummaryResponse>> UpdateStatus(
        string id,
        UpdateUserStatusRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userManagementService.UpdateStatusAsync(id, request.IsActive, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }
}
