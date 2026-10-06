using SolarMicrogridTrading.Api.DTOs;

namespace SolarMicrogridTrading.Api.Interfaces;

public interface IProsumerStatusService
{
    Task<IReadOnlyList<UserSummaryResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<UserSummaryResponse>> GetPendingAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<UserSummaryResponse>> GetDeactivatedAsync(CancellationToken cancellationToken);
    Task<UserSummaryResponse?> ActivateAsync(string userId, CancellationToken cancellationToken);
    Task<UserSummaryResponse?> ProcessDeactivationAsync(string userId, CancellationToken cancellationToken);
    Task<UserSummaryResponse?> ReactivateAsync(string userId, CancellationToken cancellationToken);
    Task<UserSummaryResponse?> RequestDeactivationAsync(string userId, CancellationToken cancellationToken);
}
