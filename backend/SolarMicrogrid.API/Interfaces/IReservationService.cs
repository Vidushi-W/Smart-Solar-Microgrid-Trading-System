using SolarMicrogrid.API.DTOs;

namespace SolarMicrogrid.API.Interfaces;

public interface IReservationService
{
    Task<ReservationOptionsDto> GetOptionsAsync(string? prosumerId, CancellationToken cancellationToken);
    Task<ReservationDto> CreateAsync(CreateReservationRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReservationDto>> SearchAsync(string? status, string? stationId, string? date, string? query, CancellationToken cancellationToken);
    Task<ReservationDto> GetAsync(string id, CancellationToken cancellationToken);
    Task<ReservationDto> ModifyAsync(string id, ModifyReservationRequest request, CancellationToken cancellationToken);
    Task<ReservationDto> CancelAsync(string id, CancellationToken cancellationToken);
    Task<ReservationDto> ApproveAsync(string id, CancellationToken cancellationToken);
    Task<ReservationDto> RejectAsync(string id, RejectReservationRequest request, CancellationToken cancellationToken);
    Task<ReservationDto> ScheduleAsync(string id, CancellationToken cancellationToken);
    Task<ReservationDashboardDto> GetDashboardAsync(CancellationToken cancellationToken);
}
