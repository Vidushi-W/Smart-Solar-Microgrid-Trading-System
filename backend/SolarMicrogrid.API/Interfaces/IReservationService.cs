// Reservation workflow behind the controllers. Role checks and booking rules are enforced by the implementation.
using SolarMicrogrid.API.DTOs;

namespace SolarMicrogrid.API.Interfaces;

public interface IReservationService
{
    // Prosumer or Backoffice. Closed, full, past, out-of-window, and overlapping slots are left out.
    Task<ReservationOptionsDto> GetOptionsAsync(string? prosumerId, CancellationToken cancellationToken);
    // Starts as Requested. Fails when the slot is full, energy exceeds station capacity, or the prosumer is not active.
    Task<ReservationDto> CreateAsync(CreateReservationRequest request, CancellationToken cancellationToken);
    // Prosumers only see their own rows. ApprovedFuture and DueSoon are filters, and a date must be yyyy-MM-dd.
    Task<IReadOnlyList<ReservationDto>> SearchAsync(string? status, string? stationId, string? date, string? query, CancellationToken cancellationToken);
    // Another prosumer's reservation is reported as not found.
    Task<ReservationDto> GetAsync(string id, CancellationToken cancellationToken);
    // Only Requested or Approved. The replacement slot must be different and start at least 12 hours from now.
    Task<ReservationDto> ModifyAsync(string id, ModifyReservationRequest request, CancellationToken cancellationToken);
    // Only a capacity-holding reservation, and only with 12 hours' notice. Cancelling releases the hold.
    Task<ReservationDto> CancelAsync(string id, CancellationToken cancellationToken);
    // Backoffice only, and only a Requested reservation whose station is active, slot is open, and start is still ahead.
    Task<ReservationDto> ApproveAsync(string id, CancellationToken cancellationToken);
    // Backoffice only. A reason is required, and only a Requested reservation can be rejected.
    Task<ReservationDto> RejectAsync(string id, RejectReservationRequest request, CancellationToken cancellationToken);
    // Grid Operator only, and only an Approved reservation whose start is still ahead.
    Task<ReservationDto> ScheduleAsync(string id, CancellationToken cancellationToken);
    // Prosumers get counts for their own reservations. Due soon means a hold starting in under 12 hours.
    Task<ReservationDashboardDto> GetDashboardAsync(CancellationToken cancellationToken);
}
