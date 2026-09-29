namespace SolarMicrogridTrading.Api.DTOs;

public sealed record UserSummaryResponse(
    string Id,
    string Name,
    string Username,
    string Email,
    string ContactNumber,
    string Role,
    bool IsActive,
    string AccountStatus,
    DateTime CreatedAtUtc);
