using SolarMicrogridTrading.Api.DTOs;

namespace SolarMicrogridTrading.Api.Interfaces;

public interface IProsumerProfileService
{
    Task<(ProsumerProfileResponse? Profile, string? Error)> GetAsync(string userId, CancellationToken cancellationToken);
    Task<(ProsumerProfileResponse? Profile, string? Error)> UpdateAsync(
        string userId,
        UpdateProsumerProfileRequest request,
        CancellationToken cancellationToken);
}
