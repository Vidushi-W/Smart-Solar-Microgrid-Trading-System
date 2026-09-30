using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.DTOs;

public sealed class EnergyBookingSlotResponse
{
    public required string SlotId { get; init; }
    public required string StationId { get; init; }
    public DateOnly Date { get; init; }
    public required string StartTime { get; init; }
    public required string EndTime { get; init; }
    public int TotalCapacity { get; init; }
    public int RemainingCapacity { get; init; }
    public EnergyBookingSlotStatus Status { get; init; }
}
