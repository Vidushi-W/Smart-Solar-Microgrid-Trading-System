// Turns a reservation rule failure into its HTTP status and message.
// A MongoDB failure becomes 503 so the client does not see a driver exception.
using MongoDB.Driver;
using SolarMicrogrid.API.Services;

namespace SolarMicrogrid.API.Middleware;

public class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiExceptionMiddleware> _logger;

    public ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    // A reservation rule keeps its status code. Any MongoDB driver failure becomes 503.
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ReservationRuleException exception)
        {
            await Write(context, exception.StatusCode, exception.Message);
        }
        catch (MongoException)
        {
            _logger.LogWarning("MongoDB request failed.");
            await Write(context, StatusCodes.Status503ServiceUnavailable, "The database request could not be completed.");
        }
    }

    private static Task Write(HttpContext context, int statusCode, string message)
    {
        if (context.Response.HasStarted)
        {
            return Task.CompletedTask;
        }

        context.Response.StatusCode = statusCode;
        return context.Response.WriteAsJsonAsync(new { message });
    }
}
