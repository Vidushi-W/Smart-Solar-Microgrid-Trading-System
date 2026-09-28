using System.ComponentModel.DataAnnotations;

namespace SmartSolar.Microgrid.Configuration;

public sealed class StationOptions
{
    public const string SectionName = "Stations";

    [Range(typeof(double), "0", "20000")]
    public double NearbyRadiusKilometers { get; init; } = 25;
}
