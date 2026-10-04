// Development stand-in for authentication.
// A request is treated as signed in only when X-User-Id and X-User-Role are present and the role is Backoffice, GridOperator, or Prosumer.
using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.Interfaces;

namespace SolarMicrogrid.API.Services;

public class HeaderCurrentUser : ICurrentUser
{
    public const string UserIdHeader = "X-User-Id";
    public const string RoleHeader = "X-User-Role";

    public HeaderCurrentUser(IHttpContextAccessor accessor, IHostEnvironment environment)
    {
        // Outside Development the headers are ignored, so the request stays anonymous.
        if (!environment.IsDevelopment() || accessor.HttpContext is null)
        {
            return;
        }

        var id = accessor.HttpContext.Request.Headers[UserIdHeader].ToString().Trim();
        var role = accessor.HttpContext.Request.Headers[RoleHeader].ToString().Trim();
        if (id.Length == 0 || role is not (AppRoles.Backoffice or AppRoles.GridOperator or AppRoles.Prosumer))
        {
            return;
        }

        IsAuthenticated = true;
        UserId = id;
        Role = role;
    }

    public bool IsAuthenticated { get; }
    public string UserId { get; } = "";
    public string Role { get; } = "";
    public string? ProsumerId => Role == AppRoles.Prosumer ? UserId : null;
}
