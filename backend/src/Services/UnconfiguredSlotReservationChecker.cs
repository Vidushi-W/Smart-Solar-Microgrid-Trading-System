using SmartSolar.Microgrid.Interfaces;

namespace SmartSolar.Microgrid.Services;

/// <summary>Fails closed until Member 3 defines and implements the reservation query.</summary>
public sealed class UnconfiguredSlotReservationChecker : ISlotReservationChecker
{
    public Task<SlotReservationCheck> CheckDeletionAsync(string slotId, CancellationToken cancellationToken) =>
        Task.FromResult(SlotReservationCheck.Unavailable);
}
