using System.Net.Mail;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using MongoDB.Bson;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;
using SolarMicrogridTrading.Api.Models;

namespace SolarMicrogridTrading.Api.Services;

public sealed class ProsumerRegistrationService : IProsumerRegistrationService
{
    private static readonly Regex NicPattern = new("^(?:\\d{9}[VvXx]|\\d{12})$", RegexOptions.Compiled);
    private readonly IUserRepository userRepository;
    private readonly IPasswordHasher<User> passwordHasher;

    public ProsumerRegistrationService(
        IUserRepository userRepository,
        IPasswordHasher<User> passwordHasher)
    {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
    }

    public async Task<(ProsumerRegistrationResponse? Response, string? Error)> RegisterAsync(
        RegisterProsumerRequest request,
        CancellationToken cancellationToken)
    {
        var nic = request.Nic.Trim().ToUpperInvariant();
        var error = Validate(request, nic);
        if (error is not null)
        {
            return (null, error);
        }

        if (await userRepository.ExistsByNicAsync(nic, cancellationToken))
        {
            return (null, "A prosumer with this NIC already exists.");
        }

        var user = new User
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Username = nic,
            Nic = nic,
            Name = request.FullName.Trim(),
            Email = request.Email.Trim(),
            ContactNumber = request.PhoneNumber.Trim(),
            Address = request.Address.Trim(),
            Role = "Prosumer",
            IsActive = false,
            AccountStatus = "PendingActivation",
            CreatedAtUtc = DateTime.UtcNow
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        await userRepository.CreateAsync(user, cancellationToken);
        return (new ProsumerRegistrationResponse(
            "Registration submitted. Your account is awaiting Backoffice activation.",
            user.Nic,
            user.AccountStatus), null);
    }

    private static string? Validate(RegisterProsumerRequest request, string nic)
    {
        if (string.IsNullOrWhiteSpace(request.Nic)
            || string.IsNullOrWhiteSpace(request.FullName)
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.PhoneNumber)
            || string.IsNullOrWhiteSpace(request.Address)
            || string.IsNullOrWhiteSpace(request.Password)
            || string.IsNullOrWhiteSpace(request.ConfirmPassword))
        {
            return "NIC, name, email, phone number, address, password, and confirmation are required.";
        }

        if (!NicPattern.IsMatch(nic))
        {
            return "NIC must contain 12 digits or 9 digits followed by V or X.";
        }

        try
        {
            _ = new MailAddress(request.Email.Trim());
        }
        catch (FormatException)
        {
            return "A valid email address is required.";
        }

        if (request.Password.Length < 8)
        {
            return "Password must be at least 8 characters long.";
        }

        if (request.Password != request.ConfirmPassword)
        {
            return "Password and confirmation do not match.";
        }

        return null;
    }
}
