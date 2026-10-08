// Request and response shapes for creating, searching, and reviewing reservations.
namespace SolarMicrogrid.API.DTOs;

// The service books the signed-in prosumer. ProsumerId on this body is not read.
public class CreateReservationRequest
{
    public string? ProsumerId { get; set; }
    public string? SlotId { get; set; }
    public string? ServiceType { get; set; }
    public double EnergyKwh { get; set; }
}

public record ProsumerOptionDto(string Id, string Name);

// Remaining is slot capacity minus Requested, Approved, and Scheduled reservations.
public record SlotOptionDto(string Id, string Label, DateTime Start, DateTime End, int Capacity, int Remaining);

// Slots are the ones that prosumer can still book at this station.
public record StationOptionDto(string Id, string Name, double CapacityKwh, IReadOnlyList<SlotOptionDto> Slots);

public record ReservationOptionsDto(IReadOnlyList<ProsumerOptionDto> Prosumers, IReadOnlyList<StationOptionDto> Stations);

public class ModifyReservationRequest
{
    public string? SlotId { get; set; }
}

// Reason must be non-empty or the rejection is refused.
public class RejectReservationRequest
{
    public string? Reason { get; set; }
}

public record ReservationHistoryDto(DateTime At, string Action, string ActorId, string ActorRole, string Note);

// AllowedActions are enabled for this caller. ActionBlocks maps a blocked action to the reason.
public record ReservationDto(
    string Id,
    string Code,
    string ProsumerId,
    string ProsumerName,
    string StationId,
    string StationName,
    string SlotId,
    string SlotLabel,
    DateTime Start,
    DateTime End,
    string Status,
    string ServiceType,
    double EnergyKwh,
    IReadOnlyList<ReservationHistoryDto> History,
    IReadOnlyList<string> AllowedActions,
    IReadOnlyDictionary<string, string> ActionBlocks);

// Pending is Requested. ApprovedFuture is a future Approved or Scheduled booking. DueSoon starts in under 12 hours.
public record ReservationDashboardDto(int Pending, int ApprovedFuture, int DueSoon);
