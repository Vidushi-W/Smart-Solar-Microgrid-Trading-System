using SolarMicrogridTrading.Api.DTOs;

namespace SolarMicrogridTrading.Api.Interfaces;

public interface IProsumerRegistrationService
{
    Task<(ProsumerRegistrationResponse? Response, string? Error)> RegisterAsync(
        RegisterProsumerRequest request,
        CancellationToken cancellationToken);
}
