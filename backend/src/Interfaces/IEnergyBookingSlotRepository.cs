using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Interfaces;

public interface IEnergyBookingSlotRepository
{
    Task InsertAsync(EnergyBookingSlots slot, CancellationToken cancellationToken);
    Task<EnergyBookingSlots?> GetByIdAsync(string slotId, CancellationToken cancellationToken);
    Task<IReadOnlyList<EnergyBookingSlots>> GetByStationAndDateAsync(
        string stationId,
        DateTime date,
        CancellationToken cancellationToken);
    Task<bool> HasOverlapAsync(
        string stationId,
        DateTime date,
        string startTime,
        string endTime,
        string? exceptSlotId,
        CancellationToken cancellationToken);
    Task<bool> ReplaceAsync(EnergyBookingSlots slot, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string slotId, CancellationToken cancellationToken);
}
