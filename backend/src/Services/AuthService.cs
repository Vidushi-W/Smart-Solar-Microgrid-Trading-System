// Issues a JWT only for an active user whose role is Backoffice, GridOperator, or Prosumer.
// Inactive and pending accounts are rejected the same way as a wrong password.
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;
using SolarMicrogridTrading.Api.Models;

namespace SolarMicrogridTrading.Api.Services;

public sealed class AuthService : IAuthService
{
    private static readonly HashSet<string> SupportedRoles = new(StringComparer.Ordinal)
    {
        "Backoffice",
        "GridOperator",
        "Prosumer"
    };

    private readonly IUserRepository userRepository;
    private readonly IPasswordHasher<User> passwordHasher;
    private readonly IConfiguration configuration;

    public AuthService(
        IUserRepository userRepository,
        IPasswordHasher<User> passwordHasher,
        IConfiguration configuration)
    {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.configuration = configuration;
    }

    public async Task<LoginOutcome> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdentifierAsync(request.Identifier, cancellationToken);
        if (user is null
            || !user.IsActive
            || user.AccountStatus != AccountStatuses.Active
            || !SupportedRoles.Contains(user.Role))
        {
            return Rejected("Invalid credentials or inactive account.");
        }

        var passwordResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (passwordResult == PasswordVerificationResult.Failed)
        {
            return Rejected("Invalid credentials or inactive account.");
        }

        // Native clients may omit the optional role; a selected web role must match the stored account.
        if (request.Role is not null
            && !string.Equals(user.Role, request.Role.Trim(), StringComparison.Ordinal))
        {
            return Rejected("The selected role does not match this account.");
        }

        return new LoginOutcome(new LoginResponse("Login successful", user.Role, CreateToken(user)), null);
    }

    private static LoginOutcome Rejected(string message) => new(null, message);

    private string CreateToken(User user)
    {
        var key = configuration["Jwt:Key"]
            ?? Environment.GetEnvironmentVariable("JWT_KEY")
            ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var issuer = configuration["Jwt:Issuer"] ?? "SolarMicrogridTrading.Api";
        var expiresMinutes = configuration.GetValue("Jwt:ExpiresMinutes", 60);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer,
            issuer,
            claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
