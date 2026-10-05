using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Interfaces;

public interface IReservationRepository
{
    Task InsertAsync(EnergyReservation reservation, CancellationToken cancellationToken);
    Task<EnergyReservation?> GetByIdAsync(string reservationId, CancellationToken cancellationToken);
    Task<bool> ReplaceAsync(EnergyReservation reservation, CancellationToken cancellationToken);
    Task<IReadOnlyList<EnergyReservation>> ListByProsumerAsync(string prosumerId, CancellationToken cancellationToken);
    Task<IReadOnlyList<EnergyReservation>> ListAllAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<EnergyReservation>> ListByProsumerAndStatusesAsync(
        string prosumerId,
        IReadOnlyCollection<ReservationStatus> statuses,
        string? exceptReservationId,
        CancellationToken cancellationToken);
    Task<IReadOnlyList<EnergyReservation>> ListBySlotAndStatusesAsync(
        string slotId,
        IReadOnlyCollection<ReservationStatus> statuses,
        CancellationToken cancellationToken);
    Task<IReadOnlyList<EnergyReservation>> ListByStationAndStatusesAsync(
        string stationId,
        IReadOnlyCollection<ReservationStatus> statuses,
        CancellationToken cancellationToken);
}
