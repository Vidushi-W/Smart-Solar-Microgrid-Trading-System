using SolarMicrogridTrading.Api.DTOs;

namespace SolarMicrogridTrading.Api.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}
