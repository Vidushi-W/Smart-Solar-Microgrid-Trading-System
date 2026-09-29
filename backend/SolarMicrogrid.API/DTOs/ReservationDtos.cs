namespace SolarMicrogrid.API.DTOs;

public class CreateReservationRequest
{
    public string? ProsumerId { get; set; }
    public string? SlotId { get; set; }
    public string? ServiceType { get; set; }
    public double EnergyKwh { get; set; }
}

public record ProsumerOptionDto(string Id, string Name);

public record SlotOptionDto(string Id, string Label, DateTime Start, DateTime End, int Capacity, int Remaining);

public record StationOptionDto(string Id, string Name, double CapacityKwh, IReadOnlyList<SlotOptionDto> Slots);

public record ReservationOptionsDto(IReadOnlyList<ProsumerOptionDto> Prosumers, IReadOnlyList<StationOptionDto> Stations);

public class ModifyReservationRequest
{
    public string? SlotId { get; set; }
}

public class RejectReservationRequest
{
    public string? Reason { get; set; }
}

public record ReservationHistoryDto(DateTime At, string Action, string ActorId, string ActorRole, string Note);

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

public record ReservationDashboardDto(int Pending, int ApprovedFuture, int DueSoon);
