using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.Interfaces;
using SmartSolar.Microgrid.Repositories;
using SmartSolar.Microgrid.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();

builder.Services.AddOptions<MongoDbSettings>()
    .Bind(builder.Configuration.GetSection(MongoDbSettings.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddOptions<StationOptions>()
    .Bind(builder.Configuration.GetSection(StationOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddSingleton<IMongoClient>(services =>
{
    var settings = services.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    return new MongoClient(settings.ConnectionString);
});
builder.Services.AddSingleton(services =>
{
    var settings = services.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    return services.GetRequiredService<IMongoClient>().GetDatabase(settings.DatabaseName);
});

builder.Services.AddScoped<IStationRepository, MongoStationRepository>();
builder.Services.AddScoped<IStationReservationChecker, UnconfiguredStationReservationChecker>();
builder.Services.AddScoped<IStationService, StationService>();
builder.Services.AddScoped<IEnergyBookingSlotRepository, MongoEnergyBookingSlotRepository>();
builder.Services.AddScoped<ISlotReservationChecker, UnconfiguredSlotReservationChecker>();
builder.Services.AddScoped<IEnergyBookingSlotService, EnergyBookingSlotService>();

var app = builder.Build();
app.UseExceptionHandler();
app.MapControllers();
app.Run();

public partial class Program { }
