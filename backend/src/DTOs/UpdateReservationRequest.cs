using System.ComponentModel.DataAnnotations;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.DTOs;

/// <summary>Fields a client may change on an existing energy reservation.</summary>
public sealed class UpdateReservationRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string ProsumerId { get; init; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string StationId { get; init; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string SlotId { get; init; } = string.Empty;

    public DateTime ScheduledAtUtc { get; init; }

    public ReservationStatus Status { get; init; }
}
