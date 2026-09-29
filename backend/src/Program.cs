using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SolarMicrogridTrading.Api.Configuration;
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
builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoSettings.ConnectionString));
builder.Services.AddSingleton(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(mongoSettings.DatabaseName));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? Environment.GetEnvironmentVariable("JWT_KEY")
    ?? throw new InvalidOperationException("JWT_KEY is not configured.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SolarMicrogridTrading.Api";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
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
    options.AddPolicy("BackofficeOnly", policy => policy.RequireRole("Backoffice"));
    options.AddPolicy("GridOperatorOnly", policy => policy.RequireRole("GridOperator"));
    options.AddPolicy("ProsumerOnly", policy => policy.RequireRole("Prosumer"));
});
builder.Services.AddControllers();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

public partial class Program;
