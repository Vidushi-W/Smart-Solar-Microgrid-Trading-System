// Creates Backoffice and Grid Operator users and stores a hashed password.
// A blank password on update leaves the current password in place.
using System.Net.Mail;
using Microsoft.AspNetCore.Identity;
using MongoDB.Bson;
using MongoDB.Driver;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;
using SolarMicrogridTrading.Api.Helpers;
using SolarMicrogridTrading.Api.Models;

namespace SolarMicrogridTrading.Api.Services;

public sealed class UserManagementService : IUserManagementService
{
    private static readonly System.Text.RegularExpressions.Regex PhonePattern =
        new("^\\+?[0-9\\s().-]+$", System.Text.RegularExpressions.RegexOptions.Compiled);
    private static readonly HashSet<string> WebRoles = new(StringComparer.Ordinal)
    {
        "Backoffice",
        "GridOperator"
    };

    private readonly IUserRepository userRepository;
    private readonly IPasswordHasher<User> passwordHasher;

    public UserManagementService(
        IUserRepository userRepository,
        IPasswordHasher<User> passwordHasher)
    {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<UserSummaryResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var users = await userRepository.GetAllAsync(cancellationToken);
        return users.Select(Map).ToList();
    }

    public async Task<UserSummaryResponse?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        return user is null ? null : Map(user);
    }

    public async Task<(UserSummaryResponse? User, string? Error)> CreateAsync(
        CreateWebUserRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateCreate(request);
        if (validationError is not null)
        {
            return (null, validationError);
        }

        if (await userRepository.ExistsByUsernameEmailOrNicAsync(
                request.Username.Trim(), request.Email.Trim(), request.Username.Trim(), null, cancellationToken))
        {
            return (null, "Username, email, or NIC already exists.");
        }

        var user = new User
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Name = request.Name.Trim(),
            Username = request.Username.Trim(),
            Nic = request.Username.Trim(),
            Email = request.Email.Trim(),
            ContactNumber = request.ContactNumber.Trim(),
            Role = request.Role.Trim(),
            IsActive = true,
            AccountStatus = AccountStatuses.Active,
            CreatedAtUtc = DateTime.UtcNow
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        try
        {
            await userRepository.CreateAsync(user, cancellationToken);
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return (null, "Username, email, or NIC already exists.");
        }

        return (Map(user), null);
    }

    public async Task<(UserSummaryResponse? User, string? Error)> UpdateAsync(
        string id,
        UpdateWebUserRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateUpdate(request);
        if (validationError is not null)
        {
            return (null, validationError);
        }

        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return (null, null);
        }

        if (user.Role == "Prosumer")
        {
            return (null, "Prosumer accounts must be managed through Prosumer Management.");
        }

        if (await userRepository.ExistsByUsernameEmailOrNicAsync(
                user.Username, request.Email.Trim(), user.Nic, user.Id, cancellationToken))
        {
            return (null, "Email already exists.");
        }

        user.Name = request.Name.Trim();
        user.Email = request.Email.Trim();
        user.ContactNumber = request.ContactNumber.Trim();
        if (request.Address is not null)
        {
            user.Address = request.Address.Trim();
        }
        user.Role = request.Role.Trim();
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        }

        if (!await userRepository.UpdateAsync(user, cancellationToken))
        {
            return (null, null);
        }

        return (Map(user), null);
    }

    public async Task<UserSummaryResponse?> UpdateStatusAsync(
        string id,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return null;
        }

        if (user.Role == "Prosumer")
        {
            return null;
        }

        user.IsActive = isActive;
        user.AccountStatus = isActive ? AccountStatuses.Active : AccountStatuses.Deactivated;
        return await userRepository.UpdateAsync(user, cancellationToken)
            ? Map(user)
            : null;
    }

    private static string? ValidateCreate(CreateWebUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)
            || string.IsNullOrWhiteSpace(request.Username)
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.Password))
        {
            return "Name, username, email, and password are required.";
        }

        return ValidateCommon(request.Email, request.ContactNumber, request.Role, request.Password);
    }

    private static string? ValidateUpdate(UpdateWebUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
        {
            return "Name and email are required.";
        }

        return ValidateCommon(request.Email, request.ContactNumber, request.Role, request.Password);
    }

    private static string? ValidateCommon(string email, string contactNumber, string role, string? password)
    {
        try
        {
            _ = new MailAddress(email.Trim());
        }
        catch (FormatException)
        {
            return "A valid email address is required.";
        }

        var phoneError = ValidatePhone(contactNumber);
        if (phoneError is not null)
        {
            return phoneError;
        }

        if (!WebRoles.Contains(role.Trim()))
        {
            return "Role must be Backoffice or GridOperator.";
        }

        if (!string.IsNullOrEmpty(password))
        {
            var passwordError = PasswordPolicy.Validate(password);
            if (passwordError is not null)
            {
                return passwordError;
            }
        }

        return null;
    }

    private static string? ValidatePhone(string phone)
    {
        var normalized = phone.Trim();
        var digitCount = normalized.Count(char.IsAsciiDigit);
        if (!PhonePattern.IsMatch(normalized) || digitCount is < 7 or > 15)
        {
            return "Phone number must contain 7 to 15 digits and may include a leading +, spaces, parentheses, periods, or hyphens.";
        }
        return null;
    }

    private static UserSummaryResponse Map(User user) => new(
        user.Id,
        user.Name,
        user.Username,
        user.Email,
        user.ContactNumber,
        user.Nic,
        user.Address,
        user.Role,
        user.IsActive,
        user.AccountStatus,
        user.CreatedAtUtc);
}
