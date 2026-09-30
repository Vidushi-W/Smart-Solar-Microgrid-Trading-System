using SolarMicrogrid.API.Constants;
using SolarMicrogrid.API.DTOs;
using SolarMicrogrid.API.Helpers;
using SolarMicrogrid.API.Interfaces;
using SolarMicrogrid.API.Models;
using SolarMicrogrid.API.Services;
using Xunit;

namespace SolarMicrogrid.API.Tests;

public class ReservationServiceTests
{
    private static readonly DateTime Now = new(2026, 9, 29, 2, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task Create_AcceptsOpenSlotInsideSevenDays()
    {
        var world = World();
        var created = await world.Service.CreateAsync(new CreateReservationRequest
        {
            SlotId = "sl-tomorrow",
            ServiceType = ServiceTypes.DropOff,
            EnergyKwh = 18,
        }, CancellationToken.None);

        Assert.Equal(ReservationStatus.Requested, created.Status);
        Assert.Equal("p-ishara", created.ProsumerId);
        Assert.StartsWith("RS-", created.Code);
    }

    [Fact]
    public async Task Create_RejectsSlotBeyondSevenDays()
    {
        var world = World();
        var error = await Assert.ThrowsAsync<ReservationRuleException>(() => world.Service.CreateAsync(new CreateReservationRequest
        {
            SlotId = "sl-day8",
            ServiceType = ServiceTypes.Charging,
            EnergyKwh = 10,
        }, CancellationToken.None));

        Assert.Equal(400, error.StatusCode);
        Assert.Contains("7 days", error.Message);
    }

    [Fact]
    public async Task Create_RejectsClosedSlot()
    {
        var error = await Assert.ThrowsAsync<ReservationRuleException>(() => World().Service.CreateAsync(new CreateReservationRequest
        {
            SlotId = "sl-closed",
            ServiceType = ServiceTypes.DropOff,
            EnergyKwh = 10,
        }, CancellationToken.None));

        Assert.Equal("The energy slot is not open.", error.Message);
    }

    [Fact]
    public async Task Create_RejectsInactiveStation()
    {
        var error = await Assert.ThrowsAsync<ReservationRuleException>(() => World().Service.CreateAsync(new CreateReservationRequest
        {
            SlotId = "sl-inactive",
            ServiceType = ServiceTypes.DropOff,
            EnergyKwh = 10,
        }, CancellationToken.None));

        Assert.Equal("The station is not active.", error.Message);
    }

    [Fact]
    public async Task Create_RejectsFullSlot()
    {
        var world = World();
        world.Reservations.Items.Add(Hold("other", "p-other", "sl-tomorrow", Hours(30), Hours(31)));
        world.Slots["sl-tomorrow"] = world.Slots["sl-tomorrow"] with { Capacity = 1 };

        var error = await Assert.ThrowsAsync<ReservationRuleException>(() => world.Service.CreateAsync(new CreateReservationRequest
        {
            SlotId = "sl-tomorrow",
            ServiceType = ServiceTypes.DropOff,
            EnergyKwh = 10,
        }, CancellationToken.None));

        Assert.Equal(409, error.StatusCode);
    }

    [Fact]
    public async Task Create_RejectsOverlappingHold()
    {
        var world = World();
        var slot = world.Slots["sl-tomorrow"];
        world.Reservations.Items.Add(Hold("mine", "p-ishara", "sl-later", slot.Start, slot.End));

        var error = await Assert.ThrowsAsync<ReservationRuleException>(() => world.Service.CreateAsync(new CreateReservationRequest
        {
            SlotId = "sl-tomorrow",
            ServiceType = ServiceTypes.DropOff,
            EnergyKwh = 10,
        }, CancellationToken.None));

        Assert.Equal(409, error.StatusCode);
        Assert.Contains("overlaps", error.Message);
    }

    [Fact]
    public async Task Cancel_RejectsInsideTwelveHours()
    {
        var world = World();
        world.User.Role = AppRoles.Backoffice;
        world.Reservations.Items.Add(Hold("rs-soon", "p-ishara", "sl-soon", Hours(6), Hours(7)));

        var error = await Assert.ThrowsAsync<ReservationRuleException>(() => world.Service.CancelAsync("rs-soon", CancellationToken.None));

        Assert.Contains("12 hours", error.Message);
    }

    [Fact]
    public async Task Cancel_ReleasesALaterReservation()
    {
        var world = World();
        world.Reservations.Items.Add(Hold("rs-later", "p-ishara", "sl-tomorrow", Hours(30), Hours(31)));

        var updated = await world.Service.CancelAsync("rs-later", CancellationToken.None);

        Assert.Equal(ReservationStatus.Cancelled, updated.Status);
        Assert.Equal(0, await world.Reservations.CountHoldingAsync("sl-tomorrow", null, CancellationToken.None));
    }

    [Fact]
    public async Task Approve_RequiresBackoffice_AndScheduleRequiresOperator()
    {
        var world = World();
        var created = await world.Service.CreateAsync(new CreateReservationRequest
        {
            SlotId = "sl-tomorrow",
            ServiceType = ServiceTypes.DropOff,
            EnergyKwh = 12,
        }, CancellationToken.None);

        var denied = await Assert.ThrowsAsync<ReservationRuleException>(() => world.Service.ApproveAsync(created.Id, CancellationToken.None));
        Assert.Equal(403, denied.StatusCode);

        world.User.Role = AppRoles.Backoffice;
        var approved = await world.Service.ApproveAsync(created.Id, CancellationToken.None);
        Assert.Equal(ReservationStatus.Approved, approved.Status);

        var operatorDenied = await Assert.ThrowsAsync<ReservationRuleException>(() => world.Service.ScheduleAsync(created.Id, CancellationToken.None));
        Assert.Equal(403, operatorDenied.StatusCode);

        world.User.Role = AppRoles.GridOperator;
        var scheduled = await world.Service.ScheduleAsync(created.Id, CancellationToken.None);
        Assert.Equal(ReservationStatus.Scheduled, scheduled.Status);
    }

    [Fact]
    public async Task ProsumerCannotReadAnotherReservation()
    {
        var world = World();
        world.Reservations.Items.Add(Hold("rs-other", "p-other", "sl-later", Hours(40), Hours(41)));

        var error = await Assert.ThrowsAsync<ReservationRuleException>(() => world.Service.GetAsync("rs-other", CancellationToken.None));

        Assert.Equal(404, error.StatusCode);
    }

    [Fact]
    public async Task Options_HideSlotsTheProsumerCannotBook()
    {
        var world = World();
        world.User.Role = AppRoles.Backoffice;
        world.Slots["sl-tomorrow"] = world.Slots["sl-tomorrow"] with { Capacity = 1 };
        world.Reservations.Items.Add(Hold("taken", "p-other", "sl-tomorrow", Hours(30), Hours(31)));

        var options = await world.Service.GetOptionsAsync("p-ishara", CancellationToken.None);
        var slotIds = options.Stations.SelectMany(station => station.Slots).Select(slot => slot.Id).ToList();

        Assert.DoesNotContain("sl-day8", slotIds);
        Assert.DoesNotContain("sl-closed", slotIds);
        Assert.DoesNotContain("sl-inactive", slotIds);
        Assert.DoesNotContain("sl-tomorrow", slotIds);
        Assert.Contains("sl-later", slotIds);
    }

    [Fact]
    public async Task Dashboard_CountsPendingAndFuture()
    {
        var world = World();
        world.User.Role = AppRoles.Backoffice;
        world.Reservations.Items.Add(Hold("rs-1", "p-ishara", "sl-tomorrow", Hours(30), Hours(31)));
        world.Reservations.Items.Add(Hold("rs-2", "p-ishara", "sl-later", Hours(50), Hours(51), ReservationStatus.Approved));

        var counts = await world.Service.GetDashboardAsync(CancellationToken.None);

        Assert.Equal(1, counts.Pending);
        Assert.Equal(1, counts.ApprovedFuture);
    }

    private static DateTime Hours(int hours) => Now.AddHours(hours);

    private static EnergyReservation Hold(string id, string prosumerId, string slotId, DateTime start, DateTime end, string status = ReservationStatus.Requested)
    {
        return new EnergyReservation
        {
            Id = id,
            Code = id,
            ProsumerId = prosumerId,
            StationId = "st-cmb",
            SlotId = slotId,
            Start = start,
            End = end,
            Status = status,
            ServiceType = ServiceTypes.DropOff,
            EnergyKwh = 10,
        };
    }

    private static TestWorld World()
    {
        var today = ColomboTime.LocalDate(Now);
        var reservations = new FakeReservationRepository();
        var slots = new Dictionary<string, SlotSnapshot>
        {
            ["sl-tomorrow"] = new("sl-tomorrow", "st-cmb", "Tomorrow", ColomboTime.ToUtc(today.AddDays(1), new TimeOnly(9, 0)), ColomboTime.ToUtc(today.AddDays(1), new TimeOnly(10, 0)), 2, true),
            ["sl-later"] = new("sl-later", "st-cmb", "Later", ColomboTime.ToUtc(today.AddDays(2), new TimeOnly(10, 0)), ColomboTime.ToUtc(today.AddDays(2), new TimeOnly(11, 30)), 2, true),
            ["sl-day8"] = new("sl-day8", "st-cmb", "Day 8", ColomboTime.ToUtc(today.AddDays(8), new TimeOnly(11, 0)), ColomboTime.ToUtc(today.AddDays(8), new TimeOnly(12, 0)), 1, true),
            ["sl-closed"] = new("sl-closed", "st-cmb", "Closed", ColomboTime.ToUtc(today.AddDays(1), new TimeOnly(14, 0)), ColomboTime.ToUtc(today.AddDays(1), new TimeOnly(15, 0)), 1, false),
            ["sl-inactive"] = new("sl-inactive", "st-neg", "Inactive", ColomboTime.ToUtc(today.AddDays(1), new TimeOnly(9, 0)), ColomboTime.ToUtc(today.AddDays(1), new TimeOnly(10, 0)), 1, true),
            ["sl-soon"] = new("sl-soon", "st-cmb", "Soon", Now.AddHours(6), Now.AddHours(7), 1, true),
        };
        var stations = new Dictionary<string, StationSnapshot>
        {
            ["st-cmb"] = new("st-cmb", "Colombo Fort Microgrid", "Active", 120),
            ["st-neg"] = new("st-neg", "Negombo Lagoon Node", "Inactive", 40),
        };
        var people = new Dictionary<string, ProsumerSnapshot>
        {
            ["p-ishara"] = new("p-ishara", "Ishara Jayawardena", "Active"),
            ["p-kavindu"] = new("p-kavindu", "Kavindu Silva", "Pending"),
            ["p-other"] = new("p-other", "Other Person", "Active"),
        };
        var user = new FakeUser();
        var service = new ReservationService(
            reservations,
            new FakeCatalog(stations, slots),
            new FakeProsumers(people),
            user,
            new FixedClock(Now));
        return new TestWorld(service, reservations, slots, user);
    }

    private sealed record TestWorld(ReservationService Service, FakeReservationRepository Reservations, Dictionary<string, SlotSnapshot> Slots, FakeUser User);

    private sealed class FixedClock(DateTime utc) : IClock
    {
        public DateTime UtcNow => utc;
    }

    private sealed class FakeUser : ICurrentUser
    {
        public bool IsAuthenticated { get; set; } = true;
        public string UserId { get; set; } = "p-ishara";
        public string Role { get; set; } = AppRoles.Prosumer;
        public string? ProsumerId => Role == AppRoles.Prosumer ? UserId : null;
    }

    private sealed class FakeCatalog(Dictionary<string, StationSnapshot> stations, Dictionary<string, SlotSnapshot> slots) : IEnergyCatalog
    {
        public Task<StationSnapshot?> GetStationAsync(string id, CancellationToken cancellationToken)
            => Task.FromResult(stations.TryGetValue(id, out var station) ? station : null);

        public Task<SlotSnapshot?> GetSlotAsync(string id, CancellationToken cancellationToken)
            => Task.FromResult(slots.TryGetValue(id, out var slot) ? slot : null);

        public Task<IReadOnlyList<StationSnapshot>> ListStationsAsync(CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<StationSnapshot>>(stations.Values.ToList());

        public Task<IReadOnlyList<SlotSnapshot>> ListSlotsAsync(CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<SlotSnapshot>>(slots.Values.ToList());
    }

    private sealed class FakeProsumers(Dictionary<string, ProsumerSnapshot> people) : IProsumerLookup
    {
        public Task<ProsumerSnapshot?> FindAsync(string id, CancellationToken cancellationToken)
            => Task.FromResult(people.TryGetValue(id, out var person) ? person : null);

        public Task<IReadOnlyList<ProsumerSnapshot>> ListAsync(CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<ProsumerSnapshot>>(people.Values.ToList());
    }

    private sealed class FakeReservationRepository : IReservationRepository
    {
        public List<EnergyReservation> Items { get; } = [];

        public Task InsertAsync(EnergyReservation reservation, CancellationToken cancellationToken)
        {
            Items.Add(reservation);
            return Task.CompletedTask;
        }

        public Task<EnergyReservation?> GetAsync(string id, CancellationToken cancellationToken)
            => Task.FromResult(Items.FirstOrDefault(item => item.Id == id));

        public Task ReplaceAsync(EnergyReservation reservation, CancellationToken cancellationToken)
        {
            var index = Items.FindIndex(item => item.Id == reservation.Id);
            Items[index] = reservation;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<EnergyReservation>> SearchAsync(ReservationSearch search, CancellationToken cancellationToken)
        {
            IEnumerable<EnergyReservation> rows = Items;
            if (search.Status is not null) rows = rows.Where(item => item.Status == search.Status);
            if (search.StationId is not null) rows = rows.Where(item => item.StationId == search.StationId);
            if (search.ProsumerId is not null) rows = rows.Where(item => item.ProsumerId == search.ProsumerId);
            return Task.FromResult<IReadOnlyList<EnergyReservation>>(rows.ToList());
        }

        public Task<int> CountHoldingAsync(string slotId, string? ignoreId, CancellationToken cancellationToken)
            => Task.FromResult(Items.Count(item => item.SlotId == slotId && item.Id != ignoreId && ReservationStatus.Holding.Contains(item.Status)));

        public Task<int> CountHoldingForStationAsync(string stationId, CancellationToken cancellationToken)
            => Task.FromResult(Items.Count(item => item.StationId == stationId && ReservationStatus.Holding.Contains(item.Status)));

        public Task<IReadOnlyList<EnergyReservation>> ListHoldingForProsumerAsync(string prosumerId, string? ignoreId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<EnergyReservation>>(Items.Where(item => item.ProsumerId == prosumerId && item.Id != ignoreId && ReservationStatus.Holding.Contains(item.Status)).ToList());

        public Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken)
            => Task.FromResult(Items.Any(item => item.Code == code));
    }
}
