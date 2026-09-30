namespace SolarMicrogrid.API.Services;

public class ReservationRuleException : Exception
{
    public ReservationRuleException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }

    public int StatusCode { get; }
}
