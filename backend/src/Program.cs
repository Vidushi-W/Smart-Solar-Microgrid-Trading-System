// Account and station API host.
// Login uses JWT.
// MongoDB holds users, stations, and slots.
// The reservation API in SolarMicrogrid.API is a separate process.
using System.Security.Authentication;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson;
using MongoDB.Driver;
using SolarMicrogridTrading.Api.Configuration;
using SolarMicrogridTrading.Api.Constants;
using SolarMicrogridTrading.Api.Interfaces;
using SolarMicrogridTrading.Api.Models;
using SolarMicrogridTrading.Api.Repositories;
using SolarMicrogridTrading.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var mongoSettings = new MongoDbSettings
{
    ConnectionString = builder.Configuration["MongoDb:ConnectionString"]
        ?? Environment.GetEnvironmentVariable("MONGODB_CONNECTION_STRING")
        ?? throw new InvalidOperationException("MONGODB_CONNECTION_STRING is not configured."),
    DatabaseName = builder.Configuration["MongoDb:DatabaseName"] ?? "SolarMicrogridTrading",
    UsersCollectionName = builder.Configuration["MongoDb:UsersCollectionName"] ?? "Users"
};

builder.Services.AddSingleton(mongoSettings);
builder.Services.AddSingleton<IMongoClient>(_ =>
{
    var clientSettings = MongoClientSettings.FromConnectionString(mongoSettings.ConnectionString);
    clientSettings.SslSettings = new SslSettings
    {
        EnabledSslProtocols = SslProtocols.Tls12
    };
    return new MongoClient(clientSettings);
});
builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<IMongoClient>().GetDatabase(mongoSettings.DatabaseName));

builder.Services.AddOptions<SmartSolar.Microgrid.Configuration.MongoDbSettings>()
    .Bind(builder.Configuration.GetSection(SmartSolar.Microgrid.Configuration.MongoDbSettings.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddOptions<SmartSolar.Microgrid.Configuration.StationOptions>()
    .Bind(builder.Configuration.GetSection(SmartSolar.Microgrid.Configuration.StationOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IProsumerRegistrationService, ProsumerRegistrationService>();
builder.Services.AddScoped<IProsumerStatusService, ProsumerStatusService>();
builder.Services.AddScoped<IProsumerProfileService, ProsumerProfileService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services.AddScoped<
    SmartSolar.Microgrid.Interfaces.IStationRepository,
    SmartSolar.Microgrid.Repositories.MongoStationRepository>();

builder.Services.AddScoped<
    SmartSolar.Microgrid.Interfaces.IStationReservationChecker,
    SmartSolar.Microgrid.Services.UnconfiguredStationReservationChecker>();

builder.Services.AddScoped<
    SmartSolar.Microgrid.Interfaces.IStationService,
    SmartSolar.Microgrid.Services.StationService>();

builder.Services.AddScoped<
    SmartSolar.Microgrid.Interfaces.IEnergyBookingSlotRepository,
    SmartSolar.Microgrid.Repositories.MongoEnergyBookingSlotRepository>();

builder.Services.AddScoped<
    SmartSolar.Microgrid.Interfaces.ISlotReservationChecker,
    SmartSolar.Microgrid.Services.UnconfiguredSlotReservationChecker>();

builder.Services.AddScoped<
    SmartSolar.Microgrid.Interfaces.IEnergyBookingSlotService,
    SmartSolar.Microgrid.Services.EnergyBookingSlotService>();

builder.Services.AddScoped<
    SmartSolar.Microgrid.Interfaces.IQrTransferRepository,
    SmartSolar.Microgrid.Repositories.MongoQrTransferRepository>();

builder.Services.AddScoped<
    SmartSolar.Microgrid.Interfaces.IQrTransferService,
    SmartSolar.Microgrid.Services.QrTransferService>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? Environment.GetEnvironmentVariable("JWT_KEY")
    ?? throw new InvalidOperationException("JWT_KEY is not configured.");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException("JWT_KEY must be at least 32 bytes long.");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SolarMicrogridTrading.Api";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtIssuer,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        AuthorizationPolicies.BackofficeOnly,
        policy => policy.RequireRole("Backoffice"));

    options.AddPolicy(
        AuthorizationPolicies.GridOperatorOnly,
        policy => policy.RequireRole("GridOperator"));

    options.AddPolicy(
        AuthorizationPolicies.ProsumerOnly,
        policy => policy.RequireRole("Prosumer"));
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod()));

var app = builder.Build();

app.UseExceptionHandler();

var database = app.Services.GetRequiredService<IMongoDatabase>();

database.RunCommand<BsonDocument>(
    new BsonDocument("ping", 1));

app.Logger.LogInformation(
    "Connected to MongoDB database {DatabaseName}, collection {CollectionName}",
    mongoSettings.DatabaseName,
    mongoSettings.UsersCollectionName);

var usersCollection =
    database.GetCollection<User>(mongoSettings.UsersCollectionName);

usersCollection.Indexes.CreateOne(
    new CreateIndexModel<User>(
        Builders<User>.IndexKeys.Ascending(user => user.Nic),
        new CreateIndexOptions<User>
        {
            Name = "unique_non_empty_nic",
            Unique = true
        }));

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;