using System.ComponentModel.DataAnnotations;
using System.Globalization;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.DTOs;

public abstract class EnergyBookingSlotWriteRequest : IValidatableObject
{
    [Required]
    [RegularExpression("^\\d{4}-\\d{2}-\\d{2}$", ErrorMessage = "Date must use yyyy-MM-dd format.")]
    public string Date { get; init; } = string.Empty;

    [Required]
    [RegularExpression("^(?:[01]\\d|2[0-3]):[0-5]\\d$", ErrorMessage = "Time must use 24-hour HH:mm format.")]
    public string StartTime { get; init; } = string.Empty;

    [Required]
    [RegularExpression("^(?:[01]\\d|2[0-3]):[0-5]\\d$", ErrorMessage = "Time must use 24-hour HH:mm format.")]
    public string EndTime { get; init; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int TotalCapacity { get; init; }

    [Range(0, int.MaxValue)]
    public int RemainingCapacity { get; init; }

    public virtual IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!DateOnly.TryParseExact(Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
        {
            yield return new ValidationResult("Date must be a valid calendar date in yyyy-MM-dd format.", new[] { nameof(Date) });
        }

        if (RemainingCapacity > TotalCapacity)
        {
            yield return new ValidationResult(
                "RemainingCapacity cannot exceed TotalCapacity.",
                new[] { nameof(RemainingCapacity), nameof(TotalCapacity) });
        }

        if (TimeOnly.TryParseExact(StartTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start)
            && TimeOnly.TryParseExact(EndTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end)
            && start >= end)
        {
            yield return new ValidationResult("StartTime must be before EndTime.", new[] { nameof(StartTime), nameof(EndTime) });
        }
    }
}

public sealed class CreateEnergyBookingSlotRequest : EnergyBookingSlotWriteRequest { }

public sealed class UpdateEnergyBookingSlotRequest : EnergyBookingSlotWriteRequest
{
    public EnergyBookingSlotStatus? Status { get; init; }

    public override IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var result in base.Validate(validationContext))
        {
            yield return result;
        }

        if (Status.HasValue && !Enum.IsDefined(typeof(EnergyBookingSlotStatus), Status.Value))
        {
            yield return new ValidationResult("Status must be Open, Full, or Closed.", new[] { nameof(Status) });
        }
    }
}
