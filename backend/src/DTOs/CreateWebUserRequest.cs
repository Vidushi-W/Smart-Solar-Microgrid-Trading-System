namespace SolarMicrogridTrading.Api.DTOs;

public sealed record CreateWebUserRequest(
    string Name,
    string Username,
    string Email,
    string ContactNumber,
    string Password,
    string Role);
