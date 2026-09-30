using System.Net.Mail;
using SolarMicrogridTrading.Api.DTOs;
using SolarMicrogridTrading.Api.Interfaces;
using SolarMicrogridTrading.Api.Models;

namespace SolarMicrogridTrading.Api.Services;

public sealed class ProsumerProfileService : IProsumerProfileService
{
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

        return null;
    }

    private static ProsumerProfileResponse Map(User user) => new(
        user.Id,
        user.Nic,
        user.Name,
        user.Email,
        user.ContactNumber,
        user.Address,
        user.AccountStatus);
}
