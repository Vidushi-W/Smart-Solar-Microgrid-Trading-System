namespace SolarMicrogridTrading.Api.DTOs;

public sealed record UpdateWebUserRequest(
    string Name,
    string Email,
    string ContactNumber,
    string Role,
    string? Password,
    string? Address = null,
    string? ProfilePictureData = null);
