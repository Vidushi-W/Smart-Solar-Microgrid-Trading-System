using SmartSolar.Microgrid.DTOs;

namespace SmartSolar.Microgrid.Interfaces;

public enum DeleteEnergyBookingSlotResult
{
    Deleted,
    NotFound,
    HasReservations,
    ReservationCheckUnavailable,
}

public interface IEnergyBookingSlotService
{
    Task<CreateEnergyBookingSlotResult> CreateAsync(
        string stationId,
        CreateEnergyBookingSlotRequest request,
        CancellationToken cancellationToken);
    Task<EnergyBookingSlotResponse?> UpdateAsync(
        string slotId,
        UpdateEnergyBookingSlotRequest request,
        CancellationToken cancellationToken);
    Task<DeleteEnergyBookingSlotResult> DeleteAsync(string slotId, CancellationToken cancellationToken);
    Task<GetStationSlotsResult> GetByStationAndDateAsync(
        string stationId,
        string date,
        CancellationToken cancellationToken);
}

public sealed record CreateEnergyBookingSlotResult(
    EnergyBookingSlotResponse? Slot,
    bool StationNotFound,
    bool StationInactive,
    bool Overlap);

public sealed record GetStationSlotsResult(
    IReadOnlyList<EnergyBookingSlotResponse>? Slots,
    bool StationNotFound,
    bool InvalidDate);
