using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.Interfaces;

namespace SolarMicrogrid.API.Services;

public class HeaderCurrentUser : ICurrentUser
{
    public const string UserIdHeader = "X-User-Id";
    public const string RoleHeader = "X-User-Role";

    public HeaderCurrentUser(IHttpContextAccessor accessor, IHostEnvironment environment)
    {
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
