// Prosumer list for Backoffice. Other roles are rejected.
using Microsoft.AspNetCore.Mvc;
using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.Interfaces;
using SolarMicrogrid.API.Models;
using SolarMicrogrid.API.Services;

namespace SolarMicrogrid.API.Controllers;

[ApiController]
[Route("api/prosumers")]
public class ProsumersController : ControllerBase
{
    private readonly IProsumerLookup _prosumers;
    private readonly ICurrentUser _currentUser;

    public ProsumersController(IProsumerLookup prosumers, ICurrentUser currentUser)
    {
        _prosumers = prosumers;
        _currentUser = currentUser;
    }

    // Requires a signed-in Backoffice Officer.
    [HttpGet]
    public Task<IReadOnlyList<ProsumerSnapshot>> List(CancellationToken cancellationToken)
    {
        if (!_currentUser.IsAuthenticated)
        {
            throw new ReservationRuleException(401, "Sign in is required.");
        }

        if (_currentUser.Role != AppRoles.Backoffice)
        {
            throw new ReservationRuleException(403, "Only a Backoffice Officer can list prosumers.");
        }

        return _prosumers.ListAsync(cancellationToken);
    }
}
