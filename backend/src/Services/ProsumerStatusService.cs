// Allowed status moves: PendingActivation to Active, then DeactivationRequested, Deactivated, and back to Active.
using MongoDB.Bson;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;
using SolarMicrogridTrading.Api.Models;

namespace SolarMicrogridTrading.Api.Services;

public sealed class ProsumerStatusService : IProsumerStatusService
{
    private readonly IUserRepository userRepository;

    public ProsumerStatusService(IUserRepository userRepository)
    {
        this.userRepository = userRepository;
    }

    public async Task<IReadOnlyList<UserSummaryResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var users = await userRepository.GetAllAsync(cancellationToken);
        return users.Where(user => user.Role == "Prosumer").Select(Map).ToList();
    }

    public async Task<IReadOnlyList<UserSummaryResponse>> GetPendingAsync(CancellationToken cancellationToken)
    {
        var users = await userRepository.GetByRoleAndStatusesAsync(
            "Prosumer",
            new[] { AccountStatuses.PendingActivation, AccountStatuses.Registered, AccountStatuses.DeactivationRequested },
            cancellationToken);
        return users.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<UserSummaryResponse>> GetDeactivatedAsync(CancellationToken cancellationToken)
    {
        var users = await userRepository.GetByRoleAndStatusesAsync(
            "Prosumer",
            new[] { AccountStatuses.Deactivated },
            cancellationToken);
        return users.Select(Map).ToList();
    }

    public Task<UserSummaryResponse?> ActivateAsync(string userId, CancellationToken cancellationToken)
    {
        return TransitionAsync(
            userId,
            new[] { AccountStatuses.PendingActivation, AccountStatuses.Registered },
            AccountStatuses.Active,
            true,
            cancellationToken);
    }

    public Task<UserSummaryResponse?> ProcessDeactivationAsync(string userId, CancellationToken cancellationToken)
    {
        return TransitionAsync(
            userId,
            new[] { AccountStatuses.DeactivationRequested },
            AccountStatuses.Deactivated,
            false,
            cancellationToken);
    }

    public Task<UserSummaryResponse?> ReactivateAsync(string userId, CancellationToken cancellationToken)
    {
        return TransitionAsync(
            userId,
            new[] { AccountStatuses.Deactivated },
            AccountStatuses.Active,
            true,
            cancellationToken);
    }

    public Task<UserSummaryResponse?> RequestDeactivationAsync(string userId, CancellationToken cancellationToken)
    {
        return TransitionAsync(
            userId,
            new[] { AccountStatuses.Active },
            AccountStatuses.DeactivationRequested,
            true,
            cancellationToken);
    }

    private async Task<UserSummaryResponse?> TransitionAsync(
        string identifier,
        IReadOnlyCollection<string> allowedStatuses,
        string nextStatus,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var user = ObjectId.TryParse(identifier, out _)
            ? await userRepository.GetByIdAsync(identifier, cancellationToken)
            : await userRepository.GetByNicAsync(identifier, cancellationToken);
        if (user is null
            || user.Role != "Prosumer"
            || !allowedStatuses.Contains(user.AccountStatus))
        {
            return null;
        }

        user.AccountStatus = nextStatus;
        user.IsActive = isActive;
        return await userRepository.UpdateAsync(user, cancellationToken)
            ? Map(user)
            : null;
    }

    private static UserSummaryResponse Map(User user) => new(
        user.Id,
        user.Name,
        user.Username,
        user.Email,
        user.ContactNumber,
        user.Nic,
        user.Address,
        user.Role,
        user.IsActive,
        user.AccountStatus,
        user.CreatedAtUtc);
}
