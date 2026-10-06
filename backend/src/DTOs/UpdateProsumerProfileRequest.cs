namespace SolarMicrogridTrading.Api.DTOs;

public sealed record UpdateProsumerProfileRequest(
    string Name,
    string Email,
    string ContactNumber,
    string Address,
    string? ProfilePictureData = null);
