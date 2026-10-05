using System.ComponentModel.DataAnnotations;

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

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Status { get; init; } = string.Empty;
}
