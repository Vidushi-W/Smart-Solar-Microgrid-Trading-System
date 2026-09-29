using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarMicrogridTrading.Api.Constants;

namespace SolarMicrogridTrading.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Policy = AuthorizationPolicies.BackofficeOnly)]
public sealed class UserManagementController : ControllerBase
{
    [HttpGet]
    public IActionResult GetUsers() => NotImplemented("User management is the next account-management slice.");

    [HttpPost]
    public IActionResult CreateUser() => NotImplemented("User creation is the next account-management slice.");

    private ObjectResult NotImplemented(string message) =>
        StatusCode(StatusCodes.Status501NotImplemented, new { message });
}
