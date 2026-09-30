using SolarMicrogrid.API.DTOs;

namespace SolarMicrogrid.API.Interfaces;

public interface IStationService
{
    Task<IReadOnlyList<StationDto>> ListStationsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<NearbyStationDto>> ListNearbyAsync(double latitude, double longitude, double radiusKm, CancellationToken cancellationToken);
    Task<StationDto> GetStationAsync(string id, CancellationToken cancellationToken);
    Task<StationDto> CreateStationAsync(StationWriteRequest request, CancellationToken cancellationToken);
    Task<StationDto> UpdateStationAsync(string id, StationWriteRequest request, CancellationToken cancellationToken);
    Task<StationDto> SetStationStatusAsync(string id, string status, CancellationToken cancellationToken);
    Task<IReadOnlyList<SlotDto>> ListSlotsAsync(string? stationId, CancellationToken cancellationToken);
    Task<SlotDto> GetSlotAsync(string id, CancellationToken cancellationToken);
    Task<SlotDto> CreateSlotAsync(SlotWriteRequest request, CancellationToken cancellationToken);
    Task<SlotDto> UpdateSlotAsync(string id, SlotWriteRequest request, CancellationToken cancellationToken);
    Task<SlotDto> SetSlotOpenAsync(string id, bool isOpen, CancellationToken cancellationToken);
}
