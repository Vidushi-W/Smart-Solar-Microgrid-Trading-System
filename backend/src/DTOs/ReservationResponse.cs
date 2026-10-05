using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.DTOs;

/// <summary>Reservation returned by the API.</summary>
public sealed class ReservationResponse
{
    public required string ReservationId { get; init; }
    public required string ProsumerId { get; init; }
    public required string StationId { get; init; }
    public required string SlotId { get; init; }
    public DateTime ScheduledAtUtc { get; init; }
    public ReservationStatus Status { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime UpdatedAtUtc { get; init; }
}
