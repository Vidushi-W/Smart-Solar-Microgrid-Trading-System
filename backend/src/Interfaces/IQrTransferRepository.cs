/*
 * Persistence boundary for QR state on an existing reservation.
 * Conditional writes must atomically compare the snapshot and preserve other fields.
 */
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Interfaces;

public interface IQrTransferRepository
{
    /// <summary>Read the authoritative reservation, without creating sample data.</summary>
    Task<EnergyReservation?> GetAsync(string reservationId, CancellationToken cancellationToken);

    /// <summary>Update QR state only if the read snapshot still matches; optionally complete it atomically.</summary>
    Task<bool> TryUpdateAsync(EnergyReservation expected, QrTransferState next,
        bool complete, CancellationToken cancellationToken);
}
