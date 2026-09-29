using SolarMicrogridTrading.Api.Models;

namespace SolarMicrogridTrading.Api.Interfaces;

public interface IUserRepository
{
    Task<User?> FindByIdentifierAsync(string identifier, CancellationToken cancellationToken);
    Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken);
    Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<bool> ExistsByUsernameOrNicAsync(string username, string nic, string? excludedId, CancellationToken cancellationToken);
    Task CreateAsync(User user, CancellationToken cancellationToken);
    Task<bool> UpdateAsync(User user, CancellationToken cancellationToken);
}
