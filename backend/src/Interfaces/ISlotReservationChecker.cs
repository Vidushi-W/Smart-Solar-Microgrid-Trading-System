namespace SmartSolar.Microgrid.Interfaces;

public enum SlotReservationCheck
{
    Clear,
    HasDeletionBlockingReservations,
    Unavailable,
}

/// <summary>
/// Member 3 integration point. Implement against the agreed reservation model
/// to determine whether a slot has reservations that prevent deletion.
/// </summary>
public interface ISlotReservationChecker
{
    Task<SlotReservationCheck> CheckDeletionAsync(string slotId, CancellationToken cancellationToken);
}
