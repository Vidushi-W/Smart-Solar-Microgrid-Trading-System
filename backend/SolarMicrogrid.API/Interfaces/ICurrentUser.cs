namespace SolarMicrogrid.API.Interfaces;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    string UserId { get; }
    string Role { get; }
    string? ProsumerId { get; }
}
