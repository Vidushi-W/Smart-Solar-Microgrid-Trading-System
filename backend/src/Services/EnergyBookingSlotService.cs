using System.Globalization;
using Microsoft.Extensions.Options;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;

namespace SmartSolar.Microgrid.Services;

public sealed class EnergyBookingSlotService : IEnergyBookingSlotService
{
    private readonly IStationRepository _stations;
    private readonly IEnergyBookingSlotRepository _slots;
    private readonly ISlotReservationChecker _reservationChecker;

    public EnergyBookingSlotService(
        IStationRepository stations,
        IEnergyBookingSlotRepository slots,
        ISlotReservationChecker reservationChecker)
    {
        _stations = stations;
        _slots = slots;
        _reservationChecker = reservationChecker;
    }

    public async Task<CreateEnergyBookingSlotResult> CreateAsync(
        string stationId,
        CreateEnergyBookingSlotRequest request,
        CancellationToken cancellationToken)
    {
        var station = await _stations.GetByIdAsync(stationId, cancellationToken);
        if (station is null)
        {
            return new(null, StationNotFound: true, StationInactive: false, Overlap: false);
        }
        if (station.Status != StationStatus.Active)
        {
            return new(null, StationNotFound: false, StationInactive: true, Overlap: false);
        }

        var date = ParseDate(request.Date);
        if (await _slots.HasOverlapAsync(stationId, date, request.StartTime, request.EndTime, null, cancellationToken))
        {
            return new(null, StationNotFound: false, StationInactive: false, Overlap: true);
        }

        var status = request.RemainingCapacity == 0
            ? EnergyBookingSlotStatus.Full
            : EnergyBookingSlotStatus.Open;
        var slot = new EnergyBookingSlots
        {
            SlotId = $"slot-{Guid.NewGuid():N}",
            StationId = stationId,
            Date = date,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            TotalCapacity = request.TotalCapacity,
            RemainingCapacity = request.RemainingCapacity,
            Status = status,
        };

        await _slots.InsertAsync(slot, cancellationToken);
        return new(ToResponse(slot), StationNotFound: false, StationInactive: false, Overlap: false);
    }

    public async Task<EnergyBookingSlotResponse?> UpdateAsync(
        string slotId,
        UpdateEnergyBookingSlotRequest request,
        CancellationToken cancellationToken)
    {
        var slot = await _slots.GetByIdAsync(slotId, cancellationToken);
        if (slot is null)
        {
            return null;
        }

        var date = ParseDate(request.Date);
        if (await _slots.HasOverlapAsync(
                slot.StationId,
                date,
                request.StartTime,
                request.EndTime,
                slotId,
                cancellationToken))
        {
            throw new SlotOverlapException("The slot overlaps another slot for this station and date.");
        }

        slot.Date = date;
        slot.StartTime = request.StartTime;
        slot.EndTime = request.EndTime;
        slot.TotalCapacity = request.TotalCapacity;
        slot.RemainingCapacity = request.RemainingCapacity;
        slot.Status = request.Status == EnergyBookingSlotStatus.Closed
            || (!request.Status.HasValue && slot.Status == EnergyBookingSlotStatus.Closed)
            ? EnergyBookingSlotStatus.Closed
            : request.RemainingCapacity == 0
                ? EnergyBookingSlotStatus.Full
                : EnergyBookingSlotStatus.Open;

        return await _slots.ReplaceAsync(slot, cancellationToken) ? ToResponse(slot) : null;
    }

    public async Task<DeleteEnergyBookingSlotResult> DeleteAsync(string slotId, CancellationToken cancellationToken)
    {
        if (await _slots.GetByIdAsync(slotId, cancellationToken) is null)
        {
            return DeleteEnergyBookingSlotResult.NotFound;
        }

        var check = await _reservationChecker.CheckDeletionAsync(slotId, cancellationToken);
        if (check == SlotReservationCheck.HasDeletionBlockingReservations)
        {
            return DeleteEnergyBookingSlotResult.HasReservations;
        }
        if (check != SlotReservationCheck.Clear)
        {
            return DeleteEnergyBookingSlotResult.ReservationCheckUnavailable;
        }

        return await _slots.DeleteAsync(slotId, cancellationToken)
            ? DeleteEnergyBookingSlotResult.Deleted
            : DeleteEnergyBookingSlotResult.NotFound;
    }

    public async Task<GetStationSlotsResult> GetByStationAndDateAsync(
        string stationId,
        string date,
        CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        {
            return new(null, StationNotFound: false, InvalidDate: true);
        }

        if (await _stations.GetByIdAsync(stationId, cancellationToken) is null)
        {
            return new(null, StationNotFound: true, InvalidDate: false);
        }

        var dateValue = ToUtcDate(parsedDate);
        var slots = await _slots.GetByStationAndDateAsync(stationId, dateValue, cancellationToken);
        return new(slots.Select(ToResponse).ToArray(), StationNotFound: false, InvalidDate: false);
    }

    private static DateTime ParseDate(string date)
    {
        DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed);
        return ToUtcDate(parsed);
    }

    private static DateTime ToUtcDate(DateOnly date) =>
        DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

    private static EnergyBookingSlotResponse ToResponse(EnergyBookingSlots slot) => new()
    {
        SlotId = slot.SlotId,
        StationId = slot.StationId,
        Date = DateOnly.FromDateTime(slot.Date),
        StartTime = slot.StartTime,
        EndTime = slot.EndTime,
        TotalCapacity = slot.TotalCapacity,
        RemainingCapacity = slot.RemainingCapacity,
        Status = slot.Status == EnergyBookingSlotStatus.Closed
            ? EnergyBookingSlotStatus.Closed
            : slot.RemainingCapacity == 0
                ? EnergyBookingSlotStatus.Full
                : EnergyBookingSlotStatus.Open,
    };
}

public sealed class SlotOverlapException(string message) : Exception(message) { }
