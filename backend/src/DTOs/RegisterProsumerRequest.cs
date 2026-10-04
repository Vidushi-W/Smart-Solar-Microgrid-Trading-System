namespace SolarMicrogridTrading.Api.DTOs;

public sealed record RegisterProsumerRequest(
    string Nic,
    string FullName,
    string Email,
    string PhoneNumber,
    string Address,
    string Password,
    string ConfirmPassword);
