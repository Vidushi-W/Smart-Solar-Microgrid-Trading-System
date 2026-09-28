using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolar.Microgrid.Models;

/// <summary>
/// MongoDB document describing a solar station.
/// stationId is the MongoDB document _id, which MongoDB uniquely indexes.
/// </summary>
[BsonIgnoreExtraElements]
public sealed class SolarStationInfo : IValidatableObject
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    [Required]
    public string StationId { get; set; } = string.Empty;

    [BsonElement("name")]
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [BsonElement("latitude")]
    [Range(-90, 90)]
    public double Latitude { get; set; }

    [BsonElement("longitude")]
    [Range(-180, 180)]
    public double Longitude { get; set; }

    [BsonElement("capacityKwh")]
    [Range(double.Epsilon, double.MaxValue)]
    public double CapacityKwh { get; set; }

    [BsonElement("totalBatterySlots")]
    [Range(1, int.MaxValue)]
    public int TotalBatterySlots { get; set; }

    [BsonElement("availableBatterySlots")]
    [Range(0, int.MaxValue)]
    public int AvailableBatterySlots { get; set; }

    [BsonElement("operatingSchedule")]
    [Required]
    public StationOperatingSchedule OperatingSchedule { get; set; } = new();

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    [Required]
    public StationStatus Status { get; set; } = StationStatus.Active;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (AvailableBatterySlots > TotalBatterySlots)
        {
            yield return new ValidationResult(
                "AvailableBatterySlots cannot exceed TotalBatterySlots.",
                new[] { nameof(AvailableBatterySlots), nameof(TotalBatterySlots) });
        }

        if (!Enum.IsDefined(typeof(StationStatus), Status))
        {
            yield return new ValidationResult("Status must be Active or Deactivated.", new[] { nameof(Status) });
        }
    }
}

[BsonIgnoreExtraElements]
public sealed class StationOperatingSchedule : IValidatableObject
{
    [BsonElement("days")]
    [Required]
    [MinLength(1)]
    public List<DayOfWeek> Days { get; set; } = new();

    /// <summary>Opening time in 24-hour HH:mm format.</summary>
    [BsonElement("openTime")]
    [Required]
    [RegularExpression("^(?:[01]\\d|2[0-3]):[0-5]\\d$")]
    public string OpenTime { get; set; } = string.Empty;

    /// <summary>Closing time in 24-hour HH:mm format.</summary>
    [BsonElement("closeTime")]
    [Required]
    [RegularExpression("^(?:[01]\\d|2[0-3]):[0-5]\\d$")]
    public string CloseTime { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
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

public enum StationStatus
{
    Active,
    Deactivated,
}
