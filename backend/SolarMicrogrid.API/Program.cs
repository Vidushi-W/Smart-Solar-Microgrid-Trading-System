using SolarMicrogrid.API.Configuration;
using SolarMicrogrid.API.Interfaces;
using SolarMicrogrid.API.Services;

DevelopmentEnvironment.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddMongoDb();
builder.Services.AddSingleton<IMongoConnectionService, MongoConnectionService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

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
