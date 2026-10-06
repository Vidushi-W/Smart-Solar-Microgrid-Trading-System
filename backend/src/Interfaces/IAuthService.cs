using SolarMicrogridTrading.Api.DTOs;

namespace SolarMicrogridTrading.Api.Interfaces;

public interface IAuthService
{
    Task<LoginOutcome> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}
