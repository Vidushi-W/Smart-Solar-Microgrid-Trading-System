// POST /api/auth/login checks a username, email, or NIC, a password, and that the selected role matches the account.
// GET /api/auth/me reads the user id, username, and role from the JWT.
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;

namespace SolarMicrogridTrading.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService authService;
    private readonly IUserRepository userRepository;

    public AuthController(IAuthService authService, IUserRepository userRepository)
    {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Identifier)
            || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Identifier and password are required." });
        }

        var outcome = await authService.LoginAsync(request, cancellationToken);
        return outcome.Response is null
            ? Unauthorized(new { message = outcome.ErrorMessage })
            : Ok(outcome.Response);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<object>> Me(CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var user = await userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null || !user.IsActive || user.AccountStatus != AccountStatuses.Active)
        {
            return Unauthorized(new { message = "Your account is inactive. Please contact Backoffice." });
        }

        return Ok(new
        {
            userId = user.Id,
            username = user.Username,
            name = user.Name,
            email = user.Email,
            contactNumber = user.ContactNumber,
            address = user.Address,
            nic = user.Nic,
            accountStatus = user.AccountStatus,
            isActive = user.IsActive,
            createdAtUtc = user.CreatedAtUtc,
            profilePictureData = user.ProfilePictureData,
            role = user.Role
        });
    }
}
