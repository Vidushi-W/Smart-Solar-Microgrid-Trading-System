using System.ComponentModel.DataAnnotations;

namespace SmartSolar.Microgrid.DTOs;

/// <summary>Fields clients may set when creating or updating a station.</summary>
public sealed class StationWriteRequest : IValidatableObject
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; init; } = string.Empty;

    [Range(-90, 90)]
    public double Latitude { get; init; }

    [Range(-180, 180)]
    public double Longitude { get; init; }

    [Range(double.Epsilon, double.MaxValue)]
    public double CapacityKwh { get; init; }

    [Range(1, int.MaxValue)]
    public int TotalBatterySlots { get; init; }

    [Range(0, int.MaxValue)]
    public int AvailableBatterySlots { get; init; }

    [Required]
    public StationOperatingScheduleRequest? OperatingSchedule { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (AvailableBatterySlots > TotalBatterySlots)
        {
            yield return new ValidationResult(
                "AvailableBatterySlots cannot exceed TotalBatterySlots.",
                new[] { nameof(AvailableBatterySlots), nameof(TotalBatterySlots) });
        }

        if (OperatingSchedule is not null)
        {
            foreach (var result in OperatingSchedule.Validate(validationContext))
            {
                yield return result;
            }
        }
    }
}

public sealed class StationOperatingScheduleRequest : IValidatableObject
{
    [Required]
    [MinLength(1)]
    public List<DayOfWeek> Days { get; init; } = new();

    [Required]
    [RegularExpression("^(?:[01]\\d|2[0-3]):[0-5]\\d$")]
    public string OpenTime { get; init; } = string.Empty;

    [Required]
    [RegularExpression("^(?:[01]\\d|2[0-3]):[0-5]\\d$")]
    public string CloseTime { get; init; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Days.Any(day => !Enum.IsDefined(typeof(DayOfWeek), day)))
        {
            yield return new ValidationResult("Days must contain valid weekdays.", new[] { nameof(Days) });
        }

        if (TimeOnly.TryParseExact(OpenTime, "HH:mm", out var open)
            && TimeOnly.TryParseExact(CloseTime, "HH:mm", out var close)
            && open >= close)
        {
            yield return new ValidationResult(
                "OpenTime must be before CloseTime.",
                new[] { nameof(OpenTime), nameof(CloseTime) });
        }
    }
}
