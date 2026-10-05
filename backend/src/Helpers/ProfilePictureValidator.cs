namespace SolarMicrogridTrading.Api.Helpers;

public static class ProfilePictureValidator
{
    private const string JpegDataUrlPrefix = "data:image/jpeg;base64,";
    private const int MaximumImageBytes = 750_000;

    public static string? Validate(string? profilePictureData)
    {
        if (profilePictureData is null || profilePictureData.Length == 0)
        {
            return null;
        }

        if (!profilePictureData.StartsWith(JpegDataUrlPrefix, StringComparison.Ordinal))
        {
            return "Profile pictures must be JPEG images.";
        }

        var encodedImage = profilePictureData[JpegDataUrlPrefix.Length..];
        var buffer = new byte[MaximumImageBytes + 1];
        if (Convert.TryFromBase64String(encodedImage, buffer, out var written)
            && written <= MaximumImageBytes)
        {
            return null;
        }

        return "Profile pictures must be smaller than 750 KB.";
    }
}
