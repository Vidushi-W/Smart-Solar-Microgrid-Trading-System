using System.Net.Mail;
using System.Text.RegularExpressions;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;
using SolarMicrogridTrading.Api.Models;

namespace SolarMicrogridTrading.Api.Services;

public sealed class ProsumerProfileService : IProsumerProfileService
{
    private static readonly Regex PhonePattern = new("^\\+?[0-9\\s().-]+$", RegexOptions.Compiled);
    private readonly IUserRepository userRepository;

    public ProsumerProfileService(IUserRepository userRepository)
    {
        this.userRepository = userRepository;
    }

    public async Task<(ProsumerProfileResponse? Profile, string? Error)> GetAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken);
        return user is null || user.Role != "Prosumer"
            ? (null, "Prosumer profile was not found.")
            : (Map(user), null);
    }

    public async Task<(ProsumerProfileResponse? Profile, string? Error)> GetByNicAsync(
        string nic,
        CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByNicAsync(nic, cancellationToken);
        return user is null || user.Role != "Prosumer"
            ? (null, "Prosumer profile was not found.")
            : (Map(user), null);
    }

    public async Task<(ProsumerProfileResponse? Profile, string? Error)> UpdateAsync(
        string userId,
        UpdateProsumerProfileRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = Validate(request);
        if (validationError is not null)
        {
            return (null, validationError);
        }

        var user = await userRepository.GetByIdAsync(userId, cancellationToken);
        return await UpdateAsync(user, request, cancellationToken);
    }

    public async Task<(ProsumerProfileResponse? Profile, string? Error)> UpdateByNicAsync(
        string nic,
        UpdateProsumerProfileRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = Validate(request);
        if (validationError is not null)
        {
            return (null, validationError);
        }

        var user = await userRepository.GetByNicAsync(nic, cancellationToken);
        return await UpdateAsync(user, request, cancellationToken);
    }

    private async Task<(ProsumerProfileResponse? Profile, string? Error)> UpdateAsync(
        User? user,
        UpdateProsumerProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (user is null || user.Role != "Prosumer")
        {
            return (null, "Prosumer profile was not found.");
        }

        user.Name = request.Name.Trim();
        user.Email = request.Email.Trim();
        user.ContactNumber = request.ContactNumber.Trim();
        user.Address = request.Address.Trim();

        return await userRepository.UpdateAsync(user, cancellationToken)
            ? (Map(user), null)
            : (null, "Prosumer profile could not be updated.");
    }

    private static string? Validate(UpdateProsumerProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.ContactNumber)
            || string.IsNullOrWhiteSpace(request.Address))
        {
            return "Name, email, phone number, and address are required.";
        }

        try
        {
            _ = new MailAddress(request.Email.Trim());
        }
        catch (FormatException)
        {
            return "A valid email address is required.";
        }

        var phone = request.ContactNumber.Trim();
        var phoneDigitCount = phone.Count(char.IsAsciiDigit);
        if (!PhonePattern.IsMatch(phone) || phoneDigitCount is < 7 or > 15)
        {
            return "Phone number must contain 7 to 15 digits and may include a leading +, spaces, parentheses, periods, or hyphens.";
        }

        return null;
    }

    private static ProsumerProfileResponse Map(User user) => new(
        user.Id,
        user.Nic,
        user.Name,
        user.Email,
        user.ContactNumber,
        user.Address,
        user.AccountStatus,
        user.IsActive,
        user.CreatedAtUtc);
}
