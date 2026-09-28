using System.ComponentModel.DataAnnotations;

namespace SmartSolar.Microgrid.Configuration;

public sealed class MongoDbSettings
{
    public const string SectionName = "MongoDB";

    [Required]
    public string ConnectionString { get; init; } = string.Empty;

    [Required]
    public string DatabaseName { get; init; } = string.Empty;

    [Required]
    public string StationsCollectionName { get; init; } = "SolarStationInfo";

    [Required]
    public string SlotsCollectionName { get; init; } = "EnergyBookingSlots";
}
