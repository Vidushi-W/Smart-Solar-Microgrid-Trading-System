using SmartSolar.Microgrid.DTOs;

namespace SmartSolar.Microgrid.Interfaces;

/// <summary>Caller taken from the authenticated account. The service does not trust a role sent by the client.</summary>
public sealed record ReservationActor(string UserId, string Role);

public enum ReservationFailure
{
    None,
    NotFound,
    Forbidden,
    Invalid,
}

public sealed record ReservationOutcome<T>(T? Value, ReservationFailure Failure = ReservationFailure.None, string? Message = null);

public interface IReservationService
{
    Task<ReservationOutcome<ReservationResponse>> CreateAsync(
        ReservationActor actor,
        CreateReservationRequest request,
        CancellationToken cancellationToken);

    Task<ReservationOutcome<ReservationResponse>> UpdateAsync(
        ReservationActor actor,
        string reservationId,
        UpdateReservationRequest request,
        CancellationToken cancellationToken);

    Task<ReservationOutcome<ReservationResponse>> CancelAsync(
        ReservationActor actor,
        string reservationId,
        CancellationToken cancellationToken);

    Task<ReservationOutcome<ReservationResponse>> GetAsync(
        ReservationActor actor,
        string reservationId,
        CancellationToken cancellationToken);

    Task<ReservationOutcome<IReadOnlyList<ReservationResponse>>> GetForProsumerAsync(
        ReservationActor actor,
        string prosumerId,
        CancellationToken cancellationToken);

    Task<ReservationOutcome<IReadOnlyList<ReservationResponse>>> GetAllForStaffAsync(
        ReservationActor actor,
        CancellationToken cancellationToken);

    Task<ReservationOutcome<ReservationResponse>> ApproveAsync(
        ReservationActor actor,
        string reservationId,
        CancellationToken cancellationToken);
}
