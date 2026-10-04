using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarMicrogridTrading.Api.Constants;

namespace SolarMicrogridTrading.Api.Controllers;

[ApiController]
[Route("api/operations")]
[Authorize(Policy = AuthorizationPolicies.GridOperatorOnly)]
public sealed class OperationsController : ControllerBase
{
    [HttpGet("bookings")]
    public IActionResult GetOperationalBookings() => StatusCode(
        StatusCodes.Status501NotImplemented,
        new { message = "Operational booking access is reserved for Grid Operators and is not implemented yet." });
}
