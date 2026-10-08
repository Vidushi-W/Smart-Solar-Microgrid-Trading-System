// Dashboard counts for the signed-in caller: pending, approved-future, and due-soon reservations.
using Microsoft.AspNetCore.Mvc;
using SolarMicrogrid.API.DTOs;
using SolarMicrogrid.API.Interfaces;

namespace SolarMicrogrid.API.Controllers;

[ApiController]
[Route("api/dashboard")]
public class ReservationDashboardController : ControllerBase
{
    private readonly IReservationService _reservations;

    public ReservationDashboardController(IReservationService reservations)
    {
        _reservations = reservations;
    }

    [HttpGet("reservations")]
    public Task<ReservationDashboardDto> Get(CancellationToken cancellationToken)
    {
        return _reservations.GetDashboardAsync(cancellationToken);
    }
}
