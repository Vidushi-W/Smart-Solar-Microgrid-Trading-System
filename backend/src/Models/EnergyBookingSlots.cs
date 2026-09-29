using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolar.Microgrid.Models;

/// <summary>
/// MongoDB document for one station's energy booking window.
/// StationId stores the SolarStationInfo _id as a reference; slots are not embedded.
/// </summary>
[BsonIgnoreExtraElements]
public sealed class EnergyBookingSlots : IValidatableObject
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    [Required]
    public string SlotId { get; set; } = string.Empty;

    [BsonElement("stationId")]
    [BsonRepresentation(BsonType.String)]
    [Required]
    public string StationId { get; set; } = string.Empty;

    /// <summary>Calendar date stored at midnight UTC.</summary>
    [BsonElement("date")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc, DateOnly = true)]
    [Required]
    public DateTime Date { get; set; }

    /// <summary>Start time in 24-hour HH:mm format.</summary>
    [BsonElement("startTime")]
    [Required]
    [RegularExpression("^(?:[01]\\d|2[0-3]):[0-5]\\d$")]
    public string StartTime { get; set; } = string.Empty;

    /// <summary>End time in 24-hour HH:mm format.</summary>
    [BsonElement("endTime")]
    [Required]
    [RegularExpression("^(?:[01]\\d|2[0-3]):[0-5]\\d$")]
    public string EndTime { get; set; } = string.Empty;

    [BsonElement("totalCapacity")]
    [Range(1, int.MaxValue)]
    public int TotalCapacity { get; set; }

    [BsonElement("remainingCapacity")]
    [Range(0, int.MaxValue)]
    public int RemainingCapacity { get; set; }

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    [Required]
    public EnergyBookingSlotStatus Status { get; set; } = EnergyBookingSlotStatus.Open;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (RemainingCapacity > TotalCapacity)
        {
            yield return new ValidationResult(
                "RemainingCapacity cannot exceed TotalCapacity.",
                new[] { nameof(RemainingCapacity), nameof(TotalCapacity) });
        }

        if (TimeOnly.TryParseExact(StartTime, "HH:mm", out var start)
            && TimeOnly.TryParseExact(EndTime, "HH:mm", out var end)
            && start >= end)
        {
            yield return new ValidationResult(
                "StartTime must be before EndTime.",
                new[] { nameof(StartTime), nameof(EndTime) });
        }

        if (!Enum.IsDefined(typeof(EnergyBookingSlotStatus), Status))
        {
            yield return new ValidationResult("Status must be Open, Full, or Closed.", new[] { nameof(Status) });
        }
    }
}

public enum EnergyBookingSlotStatus
{
    Open,
    Full,
    Closed,
}
