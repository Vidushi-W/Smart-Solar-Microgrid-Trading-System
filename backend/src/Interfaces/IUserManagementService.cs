using SolarMicrogridTrading.Api.DTOs;

namespace SolarMicrogridTrading.Api.Interfaces;

public interface IUserManagementService
{
    Task<IReadOnlyList<UserSummaryResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<UserSummaryResponse?> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<(UserSummaryResponse? User, string? Error)> CreateAsync(CreateWebUserRequest request, CancellationToken cancellationToken);
    Task<(UserSummaryResponse? User, string? Error)> UpdateAsync(string id, UpdateWebUserRequest request, CancellationToken cancellationToken);
    Task<UserSummaryResponse?> UpdateStatusAsync(string id, bool isActive, CancellationToken cancellationToken);
}
