namespace SmartSolar.Microgrid.Interfaces;

public enum StationReservationCheck
{
    Clear,
    HasPendingOrApprovedReservations,
    Unavailable,
}

/// <summary>
/// Member 3 integration point: check the agreed reservations collection/model
/// for this station's Pending or Approved reservations.
/// </summary>
public interface IStationReservationChecker
{
    Task<StationReservationCheck> CheckAsync(string stationId, CancellationToken cancellationToken);
}
