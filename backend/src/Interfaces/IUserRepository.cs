using SolarMicrogridTrading.Api.Models;

namespace SolarMicrogridTrading.Api.Interfaces;

public interface IUserRepository
{
    Task<User?> FindByIdentifierAsync(string identifier, CancellationToken cancellationToken);
}
