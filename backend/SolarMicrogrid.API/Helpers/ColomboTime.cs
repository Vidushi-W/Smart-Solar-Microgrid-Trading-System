// Booking windows use Asia/Colombo (UTC+5:30). Windows looks up Sri Lanka Standard Time first.
namespace SolarMicrogrid.API.Helpers;

public static class ColomboTime
{
    // Sri Lanka Standard Time, otherwise Asia/Colombo, otherwise a fixed UTC+5:30 zone.
    public static TimeZoneInfo Zone { get; } = Resolve();

    // True when the start is still ahead and falls on or before the end of the local day seven days from today.
    public static bool IsInsideSevenDayWindow(DateTime startUtc, DateTime nowUtc)
    {
        var start = AsUtc(startUtc);
        var now = AsUtc(nowUtc);
        if (start <= now)
        {
            return false;
        }

        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(now, Zone);
        var startLocal = TimeZoneInfo.ConvertTimeFromUtc(start, Zone);
        var limit = nowLocal.Date.AddDays(7).AddHours(23).AddMinutes(59).AddSeconds(59).AddMilliseconds(999);
        return startLocal <= limit;
    }

    public static bool HasTwelveHourNotice(DateTime startUtc, DateTime nowUtc)
    {
        return (AsUtc(startUtc) - AsUtc(nowUtc)).TotalHours >= 12;
    }

    // That Colombo calendar day, from 00:00:00 through 23:59:59.999, converted to UTC.
    public static (DateTime FromUtc, DateTime ToUtc) DayRangeUtc(DateOnly day)
    {
        var from = ToUtc(day, TimeOnly.MinValue);
        var to = ToUtc(day, new TimeOnly(23, 59, 59, 999));
        return (from, to);
    }

    // Treats the date and time as Colombo local time.
    public static DateTime ToUtc(DateOnly date, TimeOnly time)
    {
        var local = date.ToDateTime(time);
        return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), Zone);
    }

    public static DateOnly LocalDate(DateTime utc)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(AsUtc(utc), Zone);
        return DateOnly.FromDateTime(local);
    }

    // Unspecified values are labeled UTC without shifting. Local values are converted.
    public static DateTime AsUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }

    private static TimeZoneInfo Resolve()
    {
        if (TimeZoneInfo.TryFindSystemTimeZoneById("Sri Lanka Standard Time", out var windows))
        {
            return windows;
        }

        if (TimeZoneInfo.TryFindSystemTimeZoneById("Asia/Colombo", out var iana))
        {
            return iana;
        }

        return TimeZoneInfo.CreateCustomTimeZone("Asia/Colombo", TimeSpan.FromMinutes(330), "Asia/Colombo", "Asia/Colombo");
    }
}
