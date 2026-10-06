/*
 * Executable MongoDB/HTTP integration checks for the QR foundation and existing routes.
 * Test identities exist ONLY in this test host. The application has no test-auth bypass.
 * Each run creates a uniquely named test database and drops only that database on exit.
 */
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.Controllers;
using SmartSolar.Microgrid.DTOs;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Models;
using SmartSolar.Microgrid.Repositories;
using SmartSolar.Microgrid.Services;

internal static class IntegrationChecks
{
    private static int _passed;

    // Run real HTTP requests against real MongoDB; no fixture touches the development database.
    public static async Task Main()
    {
        var connection = Environment.GetEnvironmentVariable("QR_TEST_MONGO") ?? "mongodb://127.0.0.1:27017";
        var settings = MongoClientSettings.FromConnectionString(connection);
        settings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
        var mongo = new MongoClient(settings);
        var databaseName = $"qr_transfer_{Guid.NewGuid():N}_test";
        var database = mongo.GetDatabase(databaseName);
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(QrTransfersController).Assembly.GetName().Name,
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "Integration-test-signing-key-only-0123456789",
        });
        builder.Services.AddProblemDetails();
        builder.Services.AddControllers().AddApplicationPart(typeof(QrTransfersController).Assembly)
            .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
        builder.Services.AddSingleton<IMongoDatabase>(database);
        builder.Services.AddSingleton(new SolarMicrogridTrading.Api.Configuration.MongoDbSettings
        {
            DatabaseName = databaseName,
            UsersCollectionName = "UserDetails",
        });
        builder.Services.AddScoped<SolarMicrogridTrading.Api.Interfaces.IUserRepository, SolarMicrogridTrading.Api.Repositories.UserRepository>();
        builder.Services.AddScoped<SolarMicrogridTrading.Api.Interfaces.IProsumerRegistrationService, SolarMicrogridTrading.Api.Services.ProsumerRegistrationService>();
        builder.Services.AddScoped<SolarMicrogridTrading.Api.Interfaces.IAuthService, SolarMicrogridTrading.Api.Services.AuthService>();
        builder.Services.AddScoped<Microsoft.AspNetCore.Identity.IPasswordHasher<SolarMicrogridTrading.Api.Models.User>, Microsoft.AspNetCore.Identity.PasswordHasher<SolarMicrogridTrading.Api.Models.User>>();
        builder.Services.AddSingleton(Options.Create(new MongoDbSettings()));
        builder.Services.AddSingleton(Options.Create(new StationOptions()));
        builder.Services.AddScoped<IQrTransferRepository, MongoQrTransferRepository>();
        builder.Services.AddScoped<IQrTransferService, QrTransferService>();
        builder.Services.AddScoped<IStationRepository, MongoStationRepository>();
        builder.Services.AddScoped<IStationService, StationService>();
        builder.Services.AddScoped<IStationReservationChecker, UnconfiguredStationReservationChecker>();
        builder.Services.AddScoped<IEnergyBookingSlotRepository, MongoEnergyBookingSlotRepository>();
        builder.Services.AddScoped<IEnergyBookingSlotService, EnergyBookingSlotService>();
        builder.Services.AddScoped<ISlotReservationChecker, UnconfiguredSlotReservationChecker>();
        await using var app = builder.Build();
        app.UseExceptionHandler();
        app.Use(async (context, next) =>
        {
            // Fixed fixture accounts, accepted only by this loopback test process.
            var actor = context.Request.Headers["X-Test-Actor"].ToString();
            var role = actor switch
            {
                "owner" or "other-owner" => "Prosumer",
                "operator" or "other-operator" => "GridOperator",
                "staff" => "Backoffice",
                _ => null,
            };
            if (role is not null)
                context.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, actor), new Claim(ClaimTypes.Role, role),
                }, "IntegrationFixture"));
            await next(context);
        });
        app.MapControllers();
        await app.StartAsync();
        using var http = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
        var reservations = database.GetCollection<EnergyReservation>("EnergyReservation");
        var raw = database.GetCollection<BsonDocument>("EnergyReservation");
        try
        {
            await database.RunCommandAsync<BsonDocument>(new BsonDocument("ping", 1));
            var registration = new
            {
                nic = "200012345678", fullName = "Registration Test", email = "registration@example.test",
                phoneNumber = "+94111234567", address = "Isolated test fixture",
                password = "FixturePassword1!", confirmPassword = "FixturePassword1!",
            };
            var registered = await Check(http, "POST", "/api/prosumers/register", registration, null, 202);
            Assert(registered.GetProperty("accountStatus").GetString() == "Active", "Registration returns an active Prosumer account");
            var users = database.GetCollection<SolarMicrogridTrading.Api.Models.User>("UserDetails");
            var registeredUser = await users.Find(user => user.Nic == registration.nic).SingleAsync();
            Assert(registeredUser.IsActive && registeredUser.AccountStatus == "Active" && registeredUser.Role == "Prosumer",
                "New Prosumer is persisted active without Backoffice approval");
            Assert(registeredUser.PasswordHash != registration.password
                && new Microsoft.AspNetCore.Identity.PasswordHasher<SolarMicrogridTrading.Api.Models.User>()
                    .VerifyHashedPassword(registeredUser, registeredUser.PasswordHash, registration.password)
                    != Microsoft.AspNetCore.Identity.PasswordVerificationResult.Failed,
                "Registration stores a valid password hash");
            foreach (var identifier in new[] { registration.nic, registration.email })
            {
                var loggedIn = await Check(http, "POST", "/api/auth/login",
                    new { identifier, registration.password, role = "Prosumer" }, null, 200);
                Assert(loggedIn.GetProperty("role").GetString() == "Prosumer"
                    && !string.IsNullOrWhiteSpace(loggedIn.GetProperty("token").GetString()),
                    "New Prosumer can immediately log in with NIC or email and receives a JWT");
            }
            await Check(http, "POST", "/api/prosumers/register", registration, null, 409);
            await Check(http, "POST", "/api/auth/login",
                new { identifier = registration.nic, password = "WrongPassword1!", role = "Prosumer" }, null, 401);
            await Check(http, "POST", "/api/auth/login",
                new { identifier = registration.nic, registration.password, role = "Backoffice" }, null, 401);
            var nativeLogin = await Check(http, "POST", "/api/auth/login",
                new { identifier = registration.nic, registration.password }, null, 200);
            Assert(nativeLogin.GetProperty("role").GetString() == "Prosumer",
                "Native login retains the stored role when the optional role is omitted");
            var userUpdates = Builders<SolarMicrogridTrading.Api.Models.User>.Update;
            await users.UpdateOneAsync(user => user.Id == registeredUser.Id, userUpdates.Set(user => user.IsActive, false));
            await Check(http, "POST", "/api/auth/login",
                new { identifier = registration.nic, registration.password, role = "Prosumer" }, null, 401);
            await users.UpdateOneAsync(user => user.Id == registeredUser.Id,
                userUpdates.Set(user => user.IsActive, true).Set(user => user.AccountStatus, "Deactivated"));
            await Check(http, "POST", "/api/auth/login",
                new { identifier = registration.nic, registration.password, role = "Prosumer" }, null, 401);
            await Check(http, "POST", "/api/transactions/verify", new { version = 1, reservationId = "missing", token = new string('A', 64) }, null, 403);
            await Check(http, "POST", "/api/reservations/missing/qr", null, "owner", 404);
            await Check(http, "POST", "/api/transactions/verify", new { version = 2, reservationId = "x", token = "bad" }, "operator", 400);

            // Smoke-test existing routes with persisted station/slot records.
            var stationBody = new
            {
                name = "QR integration station", latitude = 6.9, longitude = 79.8, capacityKwh = 40,
                totalBatterySlots = 4, availableBatterySlots = 3,
                operatingSchedule = new { days = new[] { "Monday" }, openTime = "06:00", closeTime = "18:00" },
            };
            var station = await Check(http, "POST", "/api/stations", stationBody, null, 201);
            var stationId = station.GetProperty("stationId").GetString()!;
            await Check(http, "GET", "/api/stations", null, null, 200);
            await Check(http, "GET", "/api/stations/nearby?lat=6.9&lng=79.8", null, null, 200);
            await Check(http, "PUT", $"/api/stations/{stationId}", stationBody, null, 200);
            await Check(http, "PUT", $"/api/stations/{stationId}/deactivate", null, null, 503);
            var slotBody = new { date = "2030-01-01", startTime = "09:00", endTime = "10:00", totalCapacity = 4, remainingCapacity = 3 };
            var slot = await Check(http, "POST", $"/api/stations/{stationId}/slots", slotBody, null, 201);
            var slotId = slot.GetProperty("slotId").GetString()!;
            await Check(http, "POST", $"/api/stations/{stationId}/slots", slotBody, null, 409);
            await Check(http, "GET", $"/api/stations/{stationId}/slots?date=2030-01-01", null, null, 200);
            await Check(http, "PUT", $"/api/slots/{slotId}", slotBody, null, 200);
            await Check(http, "DELETE", $"/api/slots/{slotId}", null, null, 503);

            // Sample records exist only in this isolated test database.
            foreach (var status in new[] { "Approved", "Scheduled", "Requested", "Pending", "Cancelled", "Rejected", "Completed" })
            {
                await raw.InsertOneAsync(new BsonDocument
                {
                    { "_id", status }, { "prosumerId", "owner" }, { "stationId", stationId },
                    { "slotId", slotId }, { "energyKwh", 12.5 }, { "status", status },
                });
            }
            await raw.UpdateOneAsync(new BsonDocument("_id", "Scheduled"),
                new BsonDocument("$set", new BsonDocument("teammateField", "preserved")));
            foreach (var status in new[] { "Requested", "Pending", "Cancelled", "Rejected", "Completed" })
                await Check(http, "POST", $"/api/reservations/{status}/qr", null, "owner", 409);
            await Check(http, "POST", "/api/reservations/Scheduled/qr", null, "other-owner", 403);
            await Check(http, "POST", "/api/reservations/Scheduled/qr", null, "operator", 403);
            var issued = await Check(http, "POST", "/api/reservations/Scheduled/qr", null, "owner", 200);
            var payload = issued.GetProperty("qrPayload");
            var token = payload.GetProperty("token").GetString()!;
            var persisted = await raw.Find(new BsonDocument("_id", "Scheduled")).SingleAsync();
            Assert(!persisted.ToJson().Contains(token), "Raw QR token is not stored");
            await Check(http, "POST", "/api/transactions/verify", payload, "owner", 403);
            await Check(http, "POST", "/api/transactions/verify", new { version = 1, reservationId = "Approved", token }, "operator", 403);
            await Check(http, "POST", "/api/transactions/verify", new { version = 1, reservationId = "missing", token }, "operator", 404);
            await Check(http, "POST", "/api/transactions/Scheduled/complete", new { token, verificationToken = new string('B', 64) }, "operator", 409);
            var verified = await Check(http, "POST", "/api/transactions/verify", payload, "operator", 200);
            Assert(verified.GetProperty("reservationStatus").GetString() == "Scheduled", "Verification does not complete the reservation");
            var receipt = verified.GetProperty("verificationToken").GetString()!;
            var completion = new { token, verificationToken = receipt };
            await Check(http, "POST", "/api/transactions/Scheduled/complete", completion, "other-operator", 409);
            await raw.UpdateOneAsync(new BsonDocument("_id", "Scheduled"), new BsonDocument("$set", new BsonDocument("energyKwh", 13)));
            await Check(http, "POST", "/api/transactions/Scheduled/complete", completion, "operator", 409);
            verified = await Check(http, "POST", "/api/transactions/verify", payload, "operator", 200);
            receipt = verified.GetProperty("verificationToken").GetString()!;
            completion = new { token, verificationToken = receipt };
            var races = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => Send(http,
                "POST", "/api/transactions/Scheduled/complete", completion, "operator")));
            Assert(races.Count(r => (int)r.StatusCode == 200) == 1 && races.Count(r => (int)r.StatusCode == 409) == 7,
                "Concurrent completion: exactly one 200 and seven 409 responses");
            var completed = await races.Single(r => (int)r.StatusCode == 200).Content.ReadFromJsonAsync<QrTransferResponse>();
            Assert(completed is { ReservationStatus: "Completed", TokenStatus: "Used", CompletedBy: "operator", VerificationToken: null }
                && completed.CompletedAtUtc.HasValue, "Completion response contains server audit data and no receipt");
            foreach (var response in races) response.Dispose();
            await Check(http, "POST", "/api/transactions/Scheduled/complete", completion, "operator", 409);
            await Check(http, "POST", "/api/transactions/verify", payload, "operator", 409);
            await Check(http, "POST", "/api/reservations/Scheduled/qr", null, "owner", 409);
            persisted = await raw.Find(new BsonDocument("_id", "Scheduled")).SingleAsync();
            Assert(persisted["status"] == "Completed" && persisted["qrTransfer"]["tokenStatus"] == "Used", "Completion and token consumption persist together");
            Assert(persisted["teammateField"] == "preserved", "Unknown teammate fields survive updates");
            Assert(persisted["qrTransfer"]["completedBy"] == "operator", "Server identity is recorded as completing operator");
            Assert(!persisted.ToJson().Contains(receipt), "Raw verification receipt is not stored");

            issued = await Check(http, "POST", "/api/reservations/Approved/qr", null, "staff", 200);
            var oldPayload = issued.GetProperty("qrPayload");
            issued = await Check(http, "POST", "/api/reservations/Approved/qr", null, "owner", 200);
            payload = issued.GetProperty("qrPayload");
            await Check(http, "POST", "/api/transactions/verify", oldPayload, "operator", 403);
            verified = await Check(http, "POST", "/api/transactions/verify", payload, "operator", 200);
            completion = new { token = payload.GetProperty("token").GetString()!, verificationToken = verified.GetProperty("verificationToken").GetString()! };
            await Check(http, "POST", "/api/transactions/Approved/complete", completion, "operator", 409);
            await raw.UpdateOneAsync(new BsonDocument("_id", "Approved"), new BsonDocument("$set", new BsonDocument("status", "Scheduled")));
            await Check(http, "POST", "/api/transactions/Approved/complete", completion, "operator", 409);
            verified = await Check(http, "POST", "/api/transactions/verify", payload, "operator", 200);
            completion = new { token = payload.GetProperty("token").GetString()!, verificationToken = verified.GetProperty("verificationToken").GetString()! };
            await raw.UpdateOneAsync(new BsonDocument("_id", "Approved"), new BsonDocument("$set", new BsonDocument("status", "Cancelled")));
            await Check(http, "POST", "/api/transactions/Approved/complete", completion, "operator", 409);
            await Check(http, "POST", "/api/transactions/verify", payload, "operator", 409);

            // Both main's ObjectId records and the operational API's string/PascalCase records remain usable.
            var accountId = ObjectId.GenerateNewId().ToString();
            await reservations.InsertOneAsync(new EnergyReservation
            {
                ReservationId = accountId, ProsumerId = "owner", StationId = stationId,
                SlotId = slotId, EnergyKwh = 12.5, Status = ReservationStatus.Scheduled,
            });
            var operationalId = $"rs-{Guid.NewGuid():N}";
            await raw.InsertOneAsync(new BsonDocument
            {
                { "_id", operationalId }, { "ProsumerId", "owner" }, { "StationId", stationId },
                { "SlotId", slotId }, { "EnergyKwh", 12.5 }, { "Status", "Scheduled" },
                { "History", new BsonArray { "preserve teammate history" } },
            });
            foreach (var id in new[] { accountId, operationalId })
            {
                issued = await Check(http, "POST", $"/api/reservations/{id}/qr", null, "owner", 200);
                payload = issued.GetProperty("qrPayload");
                verified = await Check(http, "POST", "/api/transactions/verify", payload, "operator", 200);
                completion = new { token = payload.GetProperty("token").GetString()!, verificationToken = verified.GetProperty("verificationToken").GetString()! };
                await Check(http, "POST", $"/api/transactions/{id}/complete", completion, "operator", 200);
            }
            persisted = await raw.Find(new BsonDocument("_id", operationalId)).SingleAsync();
            Assert(persisted["Status"] == "Completed" && !persisted.Contains("status")
                && persisted["History"][0] == "preserve teammate history",
                "Operational completion preserves status casing and teammate history");

            Console.WriteLine($"PASS: {_passed} HTTP and persistence checks. Database: {databaseName}");
        }
        finally
        {
            await app.StopAsync();
            await mongo.DropDatabaseAsync(databaseName);
            Console.WriteLine("Removed this run's isolated test database.");
        }
    }

    // Create a per-request identity so concurrent tests do not mutate shared client headers.
    private static async Task<HttpResponseMessage> Send(HttpClient http, string method, string path, object? body, string? actor)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), path);
        if (body is not null) request.Content = JsonContent.Create(body);
        if (actor is not null) request.Headers.Add("X-Test-Actor", actor);
        return await http.SendAsync(request);
    }

    // Verify actual HTTP status and return a detached JSON response for subsequent calls.
    private static async Task<JsonElement> Check(HttpClient http, string method, string path, object? body, string? actor, int expected)
    {
        using var response = await Send(http, method, path, body, actor);
        var text = await response.Content.ReadAsStringAsync();
        Assert((int)response.StatusCode == expected, $"{method} {path} => {(int)response.StatusCode}, expected {expected}" +
            ((int)response.StatusCode == expected ? "" : $"; {text}"));
        using var document = JsonDocument.Parse(text);
        return document.RootElement.Clone();
    }

    // Fail the executable with a nonzero exit code when any invariant is violated.
    private static void Assert(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
        _passed++;
        Console.WriteLine($"PASS: {message}");
    }
}
