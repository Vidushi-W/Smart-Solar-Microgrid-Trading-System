// Rules for the account reservation API used by the web and Android clients.
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;
using SmartSolar.Microgrid.Services;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.Interfaces;
using SolarMicrogridTrading.Api.Models;
using Xunit;

namespace SmartSolar.Microgrid.Tests;

public class AccountReservationServiceTests
{
    [Fact]
    public async Task Create_StoresPendingReservationAndHoldsTheSlot()
    {
        var world = World();
        var slot = world.AddSlot(hoursAhead: 30);

        var created = await world.Service.CreateAsync(world.Prosumer, Request(slot), CancellationToken.None);

        Assert.Equal(ReservationFailure.None, created.Failure);
        Assert.Equal(ReservationStatus.Pending, created.Value!.Status);
        Assert.Equal(slot.SlotId, created.Value.SlotId);
        Assert.Equal(0, slot.RemainingCapacity);
        var stored = await world.Reservations.GetByIdAsync(created.Value.ReservationId, CancellationToken.None);
        Assert.Equal(ReservationStatus.Pending, stored!.Status);
        Assert.Equal(slot.SlotId, stored.SlotId);
    }

    [Fact]
    public async Task Create_RejectsASlotBeyondSevenDays()
    {
        var world = World();
        var slot = world.AddSlot(hoursAhead: 24 * 9);

        var created = await world.Service.CreateAsync(world.Prosumer, Request(slot), CancellationToken.None);

        Assert.Equal(ReservationFailure.Invalid, created.Failure);
        Assert.Contains("7 days", created.Message);
        Assert.Empty(world.Reservations.Items);
    }

    [Fact]
    public async Task Create_RejectsASecondBookingOfTheSameSlot()
    {
        var world = World();
        var slot = world.AddSlot(hoursAhead: 30, capacity: 2);
        Assert.Equal(ReservationFailure.None, (await world.Service.CreateAsync(world.Prosumer, Request(slot), CancellationToken.None)).Failure);

        var again = await world.Service.CreateAsync(world.Prosumer, Request(slot), CancellationToken.None);

        Assert.Equal(ReservationFailure.Invalid, again.Failure);
        Assert.Contains("already has a reservation", again.Message);
    }

    [Fact]
    public async Task Create_RejectsABackofficeCaller()
    {
        var world = World();
        var slot = world.AddSlot(hoursAhead: 30);
        var staff = new ReservationActor(world.Prosumer.UserId, "Backoffice");

        var created = await world.Service.CreateAsync(staff, Request(slot), CancellationToken.None);

        Assert.Equal(ReservationFailure.Invalid, created.Failure);
        Assert.Contains("Prosumer", created.Message);
        Assert.Empty(world.Reservations.Items);
    }

    [Fact]
    public async Task UpdateAndCancel_RejectABackofficeCaller()
    {
        var world = World();
        var current = world.AddSlot(hoursAhead: 30);
        var next = world.AddSlot(hoursAhead: 50);
        var created = (await world.Service.CreateAsync(world.Prosumer, Request(current), CancellationToken.None)).Value!;
        var staff = new ReservationActor(world.Prosumer.UserId, "Backoffice");

        var updated = await world.Service.UpdateAsync(staff, created.ReservationId, new UpdateReservationRequest
        {
            ProsumerId = world.Prosumer.UserId,
            StationId = next.StationId,
            SlotId = next.SlotId,
            ScheduledAtUtc = StartOf(next),
            Status = ReservationStatus.Pending,
        }, CancellationToken.None);
        var cancelled = await world.Service.CancelAsync(staff, created.ReservationId, CancellationToken.None);

        Assert.Equal(ReservationFailure.Forbidden, updated.Failure);
        Assert.Contains("prosumer", updated.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(ReservationFailure.Forbidden, cancelled.Failure);
        Assert.Equal(current.SlotId, (await world.Reservations.GetByIdAsync(created.ReservationId, CancellationToken.None))!.SlotId);
        Assert.Equal(ReservationStatus.Pending, (await world.Reservations.GetByIdAsync(created.ReservationId, CancellationToken.None))!.Status);
    }

    [Fact]
    public async Task Update_PersistsTheNewSlotWhenTwelveHoursRemain()
    {
        var world = World();
        var current = world.AddSlot(hoursAhead: 30);
        var next = world.AddSlot(hoursAhead: 50);
        var created = (await world.Service.CreateAsync(world.Prosumer, Request(current), CancellationToken.None)).Value!;

        var updated = await world.Service.UpdateAsync(world.Prosumer, created.ReservationId, new UpdateReservationRequest
        {
            ProsumerId = world.Prosumer.UserId,
            StationId = next.StationId,
            SlotId = next.SlotId,
            ScheduledAtUtc = StartOf(next),
            Status = ReservationStatus.Pending,
        }, CancellationToken.None);

        Assert.Equal(ReservationFailure.None, updated.Failure);
        Assert.Equal(next.SlotId, updated.Value!.SlotId);
        var stored = await world.Reservations.GetByIdAsync(created.ReservationId, CancellationToken.None);
        Assert.Equal(next.SlotId, stored!.SlotId);
        Assert.Equal(StartOf(next), stored.ScheduledDateTime);
        Assert.Equal(1, current.RemainingCapacity);
        Assert.Equal(0, next.RemainingCapacity);
    }

    [Fact]
    public async Task Update_RejectsWhenFewerThanTwelveHoursRemain()
    {
        var world = World();
        var soon = world.AddSlot(hoursAhead: 3);
        var later = world.AddSlot(hoursAhead: 40);
        var created = (await world.Service.CreateAsync(world.Prosumer, Request(soon), CancellationToken.None)).Value!;

        var updated = await world.Service.UpdateAsync(world.Prosumer, created.ReservationId, new UpdateReservationRequest
        {
            ProsumerId = world.Prosumer.UserId,
            StationId = later.StationId,
            SlotId = later.SlotId,
            ScheduledAtUtc = StartOf(later),
            Status = ReservationStatus.Pending,
        }, CancellationToken.None);

        Assert.Equal(ReservationFailure.Invalid, updated.Failure);
        Assert.Contains("12 hours", updated.Message);
        Assert.Equal(soon.SlotId, (await world.Reservations.GetByIdAsync(created.ReservationId, CancellationToken.None))!.SlotId);
    }

    [Fact]
    public async Task Update_RejectsANewSlotInsideTwelveHours()
    {
        var world = World();
        var current = world.AddSlot(hoursAhead: 30);
        var soon = world.AddSlot(hoursAhead: 4);
        var created = (await world.Service.CreateAsync(world.Prosumer, Request(current), CancellationToken.None)).Value!;

        var updated = await world.Service.UpdateAsync(world.Prosumer, created.ReservationId, new UpdateReservationRequest
        {
            ProsumerId = world.Prosumer.UserId,
            StationId = soon.StationId,
            SlotId = soon.SlotId,
            ScheduledAtUtc = StartOf(soon),
            Status = ReservationStatus.Pending,
        }, CancellationToken.None);

        Assert.Equal(ReservationFailure.Invalid, updated.Failure);
        Assert.Contains("12 hours", updated.Message);
        Assert.Equal(0, current.RemainingCapacity);
        Assert.Equal(1, soon.RemainingCapacity);
    }

    [Fact]
    public async Task Cancel_RejectsWhenFewerThanTwelveHoursRemain()
    {
        var world = World();
        var soon = world.AddSlot(hoursAhead: 3);
        var created = (await world.Service.CreateAsync(world.Prosumer, Request(soon), CancellationToken.None)).Value!;

        var cancelled = await world.Service.CancelAsync(world.Prosumer, created.ReservationId, CancellationToken.None);

        Assert.Equal(ReservationFailure.Invalid, cancelled.Failure);
        Assert.Contains("12 hours", cancelled.Message);
        Assert.Equal(ReservationStatus.Pending, (await world.Reservations.GetByIdAsync(created.ReservationId, CancellationToken.None))!.Status);
    }

    [Fact]
    public async Task Cancel_KeepsTheDocumentAndReleasesTheSlot()
    {
        var world = World();
        var slot = world.AddSlot(hoursAhead: 30);
        var created = (await world.Service.CreateAsync(world.Prosumer, Request(slot), CancellationToken.None)).Value!;

        var cancelled = await world.Service.CancelAsync(world.Prosumer, created.ReservationId, CancellationToken.None);

        Assert.Equal(ReservationFailure.None, cancelled.Failure);
        Assert.Equal(ReservationStatus.Cancelled, cancelled.Value!.Status);
        var stored = await world.Reservations.GetByIdAsync(created.ReservationId, CancellationToken.None);
        Assert.NotNull(stored);
        Assert.Equal(ReservationStatus.Cancelled, stored!.Status);
        Assert.Equal(1, slot.RemainingCapacity);
    }

    private static CreateReservationRequest Request(EnergyBookingSlots slot) => new()
    {
        ProsumerId = "prosumer-1",
        StationId = slot.StationId,
        SlotId = slot.SlotId,
        ScheduledAtUtc = StartOf(slot),
    };

    private static DateTime StartOf(EnergyBookingSlots slot)
    {
        var date = DateOnly.FromDateTime(DateTime.SpecifyKind(slot.Date, DateTimeKind.Utc));
        var start = TimeOnly.ParseExact(slot.StartTime, "HH:mm");
        return date.ToDateTime(start, DateTimeKind.Utc);
    }

    private static WorldState World() => new();

    private sealed class WorldState
    {
        public ReservationActor Prosumer { get; } = new("prosumer-1", "Prosumer");
        public ReservationRepository Reservations { get; } = new();
        public SlotRepository Slots { get; } = new();
        public ReservationService Service { get; }

        public WorldState()
        {
            Service = new ReservationService(Reservations, new UserRepository(), new StationRepository(), Slots);
        }

        public EnergyBookingSlots AddSlot(int hoursAhead, int capacity = 1)
        {
            var start = DateTime.UtcNow.AddHours(hoursAhead);
            start = new DateTime(start.Year, start.Month, start.Day, start.Hour, 0, 0, DateTimeKind.Utc);
            var slot = new EnergyBookingSlots
            {
                SlotId = $"slot-{hoursAhead}-{Guid.NewGuid():N}",
                StationId = "station-1",
                Date = DateTime.SpecifyKind(start.Date, DateTimeKind.Utc),
                StartTime = start.ToString("HH:mm"),
                EndTime = start.AddHours(1).ToString("HH:mm"),
                TotalCapacity = capacity,
                RemainingCapacity = capacity,
                Status = EnergyBookingSlotStatus.Open,
            };
            if (start.AddHours(1).Date != start.Date)
            {
                slot.EndTime = "23:59";
            }

            Slots.Items.Add(slot);
            return slot;
        }
    }

    private sealed class ReservationRepository : IReservationRepository
    {
        public List<EnergyReservation> Items { get; } = [];

        public Task InsertAsync(EnergyReservation reservation, CancellationToken cancellationToken)
        {
            Items.Add(reservation);
            return Task.CompletedTask;
        }

        public Task<EnergyReservation?> GetByIdAsync(string reservationId, CancellationToken cancellationToken)
            => Task.FromResult(Items.FirstOrDefault(item => item.ReservationId == reservationId));

        public Task<bool> ReplaceAsync(EnergyReservation reservation, CancellationToken cancellationToken)
            => Task.FromResult(Items.Any(item => item.ReservationId == reservation.ReservationId));

        public Task<IReadOnlyList<EnergyReservation>> ListByProsumerAsync(string prosumerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<EnergyReservation>>(Items.Where(item => item.ProsumerId == prosumerId).ToList());

        public Task<IReadOnlyList<EnergyReservation>> ListAllAsync(CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<EnergyReservation>>(Items.ToList());

        public Task<IReadOnlyList<EnergyReservation>> ListByProsumerAndStatusesAsync(string prosumerId, IReadOnlyCollection<ReservationStatus> statuses, string? exceptReservationId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<EnergyReservation>>(Items.Where(item =>
                item.ProsumerId == prosumerId
                && statuses.Contains(item.Status)
                && item.ReservationId != exceptReservationId).ToList());

        public Task<IReadOnlyList<EnergyReservation>> ListBySlotAndStatusesAsync(string slotId, IReadOnlyCollection<ReservationStatus> statuses, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<EnergyReservation>>(Items.Where(item => item.SlotId == slotId && statuses.Contains(item.Status)).ToList());

        public Task<IReadOnlyList<EnergyReservation>> ListByStationAndStatusesAsync(string stationId, IReadOnlyCollection<ReservationStatus> statuses, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<EnergyReservation>>(Items.Where(item => item.StationId == stationId && statuses.Contains(item.Status)).ToList());
    }

    private sealed class SlotRepository : IEnergyBookingSlotRepository
    {
        public List<EnergyBookingSlots> Items { get; } = [];

        public Task InsertAsync(EnergyBookingSlots slot, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<EnergyBookingSlots?> GetByIdAsync(string slotId, CancellationToken cancellationToken)
            => Task.FromResult(Items.FirstOrDefault(item => item.SlotId == slotId));
        public Task<IReadOnlyList<EnergyBookingSlots>> GetByStationAndDateAsync(string stationId, DateTime date, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<EnergyBookingSlots>>(Items);
        public Task<bool> HasOverlapAsync(string stationId, DateTime date, string startTime, string endTime, string? exceptSlotId, CancellationToken cancellationToken)
            => Task.FromResult(false);
        public Task<bool> ReplaceAsync(EnergyBookingSlots slot, CancellationToken cancellationToken) => Task.FromResult(true);
        public Task<bool> DeleteAsync(string slotId, CancellationToken cancellationToken) => Task.FromResult(true);
    }

    private sealed class StationRepository : IStationRepository
    {
        private readonly SolarStationInfo _station = new()
        {
            StationId = "station-1",
            Name = "Colombo",
            Status = StationStatus.Active,
        };

        public Task InsertAsync(SolarStationInfo station, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IReadOnlyList<SolarStationInfo>> GetAllAsync(CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<SolarStationInfo>>([_station]);
        public Task<SolarStationInfo?> GetByIdAsync(string stationId, CancellationToken cancellationToken)
            => Task.FromResult<SolarStationInfo?>(stationId == _station.StationId ? _station : null);
        public Task<bool> ReplaceAsync(SolarStationInfo station, CancellationToken cancellationToken) => Task.FromResult(true);
        public Task<bool> DeactivateAsync(string stationId, CancellationToken cancellationToken) => Task.FromResult(true);
    }

    private sealed class UserRepository : IUserRepository
    {
        private readonly User _user = new()
        {
            Id = "prosumer-1",
            Role = "Prosumer",
            IsActive = true,
            AccountStatus = AccountStatuses.Active,
            Name = "Prosumer",
        };

        public Task<User?> FindByIdentifierAsync(string identifier, CancellationToken cancellationToken) => Task.FromResult<User?>(_user);
        public Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<User>>([_user]);
        public Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken) => Task.FromResult<User?>(id == _user.Id ? _user : null);
        public Task<User?> GetByNicAsync(string nic, CancellationToken cancellationToken) => Task.FromResult<User?>(null);
        public Task<bool> ExistsByUsernameEmailOrNicAsync(string username, string email, string nic, string? excludedId, CancellationToken cancellationToken) => Task.FromResult(false);
        public Task<bool> ExistsByNicAsync(string nic, CancellationToken cancellationToken) => Task.FromResult(false);
        public Task<IReadOnlyList<User>> GetByRoleAndStatusesAsync(string role, IReadOnlyCollection<string> statuses, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<User>>([]);
        public Task CreateAsync(User user, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<bool> UpdateAsync(User user, CancellationToken cancellationToken) => Task.FromResult(true);
    }
}
