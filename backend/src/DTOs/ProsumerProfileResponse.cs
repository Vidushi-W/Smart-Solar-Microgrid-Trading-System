namespace SolarMicrogridTrading.Api.DTOs;

public sealed record ProsumerProfileResponse(
    string UserId,
    string Nic,
    string Name,
    string Email,
    string ContactNumber,
    string Address,
    string AccountStatus,
    bool IsActive,
    DateTime CreatedAtUtc,
    string? ProfilePictureData = null);
