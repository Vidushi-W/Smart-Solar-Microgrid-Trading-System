using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.DTOs;

public sealed class StationResponse
{
    public required string StationId { get; init; }
    public required string Name { get; init; }
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public double CapacityKwh { get; init; }
    public int TotalBatterySlots { get; init; }
    public int AvailableBatterySlots { get; init; }
    public required StationOperatingSchedule OperatingSchedule { get; init; }
    public StationStatus Status { get; init; }
    public double? DistanceKilometers { get; init; }
}
