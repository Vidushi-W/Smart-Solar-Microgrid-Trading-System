using MongoDB.Driver;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Services;

public sealed class ReservationStationChecker : IStationReservationChecker
{
    private static readonly ReservationStatus[] HoldingStatuses = [ReservationStatus.Pending, ReservationStatus.Approved];
    private readonly IReservationRepository _reservations;

    public ReservationStationChecker(IReservationRepository reservations)
    {
        _reservations = reservations;
    }

    public async Task<StationReservationCheck> CheckAsync(string stationId, CancellationToken cancellationToken)
    {
        try
        {
            var rows = await _reservations.ListByStationAndStatusesAsync(stationId, HoldingStatuses, cancellationToken);
            return rows.Count > 0
                ? StationReservationCheck.HasPendingOrApprovedReservations
                : StationReservationCheck.Clear;
        }
        catch (MongoException)
        {
            return StationReservationCheck.Unavailable;
        }
    }
}

public sealed class ReservationSlotChecker : ISlotReservationChecker
{
    private static readonly ReservationStatus[] HoldingStatuses = [ReservationStatus.Pending, ReservationStatus.Approved];
    private readonly IReservationRepository _reservations;

    public ReservationSlotChecker(IReservationRepository reservations)
    {
        _reservations = reservations;
    }

    public async Task<SlotReservationCheck> CheckDeletionAsync(string slotId, CancellationToken cancellationToken)
    {
        try
        {
            var rows = await _reservations.ListBySlotAndStatusesAsync(slotId, HoldingStatuses, cancellationToken);
            return rows.Count > 0
                ? SlotReservationCheck.HasDeletionBlockingReservations
                : SlotReservationCheck.Clear;
        }
        catch (MongoException)
        {
            return SlotReservationCheck.Unavailable;
        }
    }
}
