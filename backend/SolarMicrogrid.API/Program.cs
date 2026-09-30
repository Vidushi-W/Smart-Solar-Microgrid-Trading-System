using SolarMicrogrid.API.Configuration;
using SolarMicrogrid.API.Helpers;
using SolarMicrogrid.API.Interfaces;
using SolarMicrogrid.API.Middleware;
using SolarMicrogrid.API.Repositories;
using SolarMicrogrid.API.Services;

DevelopmentEnvironment.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddPolicy("web", policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
            .AllowAnyHeader()
            .AllowAnyMethod());
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddMongoDb();
builder.Services.AddSingleton<IMongoConnectionService, MongoConnectionService>();
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<IReservationRepository, MongoReservationRepository>();
builder.Services.AddSingleton<IEnergyCatalog, MongoEnergyCatalog>();
builder.Services.AddSingleton<ICatalogStore, MongoCatalogStore>();
builder.Services.AddScoped<IStationService, StationService>();
builder.Services.AddSingleton<IProsumerLookup, MongoProsumerLookup>();
builder.Services.AddScoped<ICurrentUser, HeaderCurrentUser>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddHostedService<MongoIndexInitializer>();
builder.Services.AddHostedService<DevelopmentCatalogSeeder>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("web");
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

var mongoConnected = false;
string? databaseName = null;
try
{
    var mongo = app.Services.GetRequiredService<IMongoConnectionService>();
    databaseName = mongo.DatabaseName;
    mongoConnected = await mongo.PingAsync(CancellationToken.None);
}
catch (Exception exception)
{
    app.Logger.LogWarning("MongoDB ping failed with {ExceptionType}.", exception.GetType().Name);
}

app.Lifetime.ApplicationStarted.Register(() =>
{
    var addresses = app.Urls.Count > 0 ? string.Join(", ", app.Urls) : "the configured address";
    if (mongoConnected)
    {
        Console.WriteLine($"MongoDB is connected ({databaseName}). Running on {addresses}.");
    }
    else
    {
        Console.WriteLine($"MongoDB is not connected. Running on {addresses}.");
    }
});

app.Run();
