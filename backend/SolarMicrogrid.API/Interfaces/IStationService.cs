// Station and slot operations. Create is Backoffice. Updates and status changes are Grid Operator.
using SolarMicrogrid.API.DTOs;

namespace SolarMicrogrid.API.Interfaces;

public interface IStationService
{
    Task<IReadOnlyList<StationDto>> ListStationsAsync(CancellationToken cancellationToken);
    // Active stations with real coordinates only. Radius must be greater than 0 and at most 200 km.
    Task<IReadOnlyList<NearbyStationDto>> ListNearbyAsync(double latitude, double longitude, double radiusKm, CancellationToken cancellationToken);
    Task<StationDto> GetStationAsync(string id, CancellationToken cancellationToken);
    // The code must be unique. A new station is stored as Active.
    Task<StationDto> CreateStationAsync(StationWriteRequest request, CancellationToken cancellationToken);
    // The code must stay unique among the other stations.
    Task<StationDto> UpdateStationAsync(string id, StationWriteRequest request, CancellationToken cancellationToken);
    // Inactive is refused while Requested, Approved, or Scheduled reservations still exist.
    Task<StationDto> SetStationStatusAsync(string id, string status, CancellationToken cancellationToken);
    Task<IReadOnlyList<SlotDto>> ListSlotsAsync(string? stationId, CancellationToken cancellationToken);
    Task<SlotDto> GetSlotAsync(string id, CancellationToken cancellationToken);
    // Capacity must be at least 1, and the end must be after the start.
    Task<SlotDto> CreateSlotAsync(SlotWriteRequest request, CancellationToken cancellationToken);
    // A capacity hold blocks station or time changes, closing the slot, and capacity below that hold.
    Task<SlotDto> UpdateSlotAsync(string id, SlotWriteRequest request, CancellationToken cancellationToken);
    // Closing is refused while Requested, Approved, or Scheduled reservations still exist.
    Task<SlotDto> SetSlotOpenAsync(string id, bool isOpen, CancellationToken cancellationToken);
}
