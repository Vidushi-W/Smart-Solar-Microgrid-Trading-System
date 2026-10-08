// Caller identity for one request. Outside Development the implementation leaves the caller anonymous.
namespace SolarMicrogrid.API.Interfaces;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    string UserId { get; }
    string Role { get; }
    string? ProsumerId { get; }
}
