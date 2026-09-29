namespace SolarMicrogridTrading.Api.DTOs;

public sealed record ProsumerRegistrationResponse(
    string Message,
    string Nic,
    string AccountStatus);
