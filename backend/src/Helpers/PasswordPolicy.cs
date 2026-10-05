namespace SolarMicrogridTrading.Api.Helpers;

public static class PasswordPolicy
{
    public static string? Validate(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8)
        {
            return "Password must be at least 8 characters long.";
        }

        if (!password.Any(char.IsUpper)
            || !password.Any(char.IsLower)
            || !password.Any(char.IsDigit)
            || !password.Any(character => !char.IsLetterOrDigit(character) && !char.IsWhiteSpace(character)))
        {
            return "Password must include an uppercase letter, a lowercase letter, a number, and a special character.";
        }

        return null;
    }
}