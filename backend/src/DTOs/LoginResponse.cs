namespace SolarMicrogridTrading.Api.DTOs;

public sealed record LoginResponse(string Message, string Role, string Token);

public sealed record LoginOutcome(LoginResponse? Response, string? ErrorMessage);
