using System.Net.Mail;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var connectionString = Environment.GetEnvironmentVariable("MONGODB_CONNECTION_STRING")
    ?? configuration["MongoDb:ConnectionString"];
if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("MongoDB is not configured. Set MongoDb:ConnectionString in appsettings.json or MONGODB_CONNECTION_STRING.");
    return 1;
}

var databaseName = configuration["MongoDb:DatabaseName"] ?? "SolarMicrogridTrading";
var collectionName = configuration["MongoDb:UsersCollectionName"] ?? "Users";
var client = new MongoClient(connectionString);
var database = client.GetDatabase(databaseName);
var users = database.GetCollection<BootstrapUser>(collectionName);

try
{
    await database.RunCommandAsync<BsonDocument>(new BsonDocument("ping", 1));

    if (await users.Find(user => user.Role == "Backoffice").Limit(1).AnyAsync())
    {
        Console.Error.WriteLine("A Backoffice account already exists. Bootstrap stopped without changing the database.");
        return 1;
    }

    Console.WriteLine($"Target MongoDB database: {databaseName}");
    Console.WriteLine($"Users collection: {collectionName}");
    Console.Write("Type the database name to confirm: ");
    if (!string.Equals(Console.ReadLine()?.Trim(), databaseName, StringComparison.Ordinal))
    {
        Console.Error.WriteLine("Database confirmation did not match. No account was created.");
        return 1;
    }

    var name = ReadRequired("Full name: ");
    var username = ReadRequired("Username: ");
    var email = ReadRequired("Email: ");
    var phone = ReadRequired("Phone number: ");
    if (!MailAddress.TryCreate(email, out _))
    {
        Console.Error.WriteLine("Enter a valid email address.");
        return 1;
    }

    var digitCount = phone.Count(char.IsAsciiDigit);
    if (!Regex.IsMatch(phone.Trim(), @"^\+?[0-9\s().-]+$") || digitCount is < 7 or > 15)
    {
        Console.Error.WriteLine("Phone number must contain 7 to 15 digits and use a valid phone-number format.");
        return 1;
    }

    var password = ReadPassword("Password: ");
    var confirmation = ReadPassword("Confirm password: ");
    if (!string.Equals(password, confirmation, StringComparison.Ordinal))
    {
        Console.Error.WriteLine("Passwords do not match.");
        return 1;
    }

    var passwordError = ValidatePassword(password);
    if (passwordError is not null)
    {
        Console.Error.WriteLine(passwordError);
        return 1;
    }

    var duplicateFilter = Builders<BootstrapUser>.Filter.Or(
        Builders<BootstrapUser>.Filter.Eq(user => user.Username, username),
        Builders<BootstrapUser>.Filter.Eq(user => user.Nic, username),
        Builders<BootstrapUser>.Filter.Regex(
            user => user.Email,
            new BsonRegularExpression($"^{Regex.Escape(email)}$", "i")));
    if (await users.Find(duplicateFilter).Limit(1).AnyAsync())
    {
        Console.Error.WriteLine("That username or email is already in use. No account was created.");
        return 1;
    }

    var user = new BootstrapUser
    {
        Id = ObjectId.GenerateNewId().ToString(),
        Name = name,
        Username = username,
        Nic = username,
        Email = email,
        ContactNumber = phone,
        Role = "Backoffice",
        IsActive = true,
        AccountStatus = "Active",
        CreatedAtUtc = DateTime.UtcNow
    };
    user.PasswordHash = new PasswordHasher<BootstrapUser>().HashPassword(user, password);
    await users.InsertOneAsync(user);

    Console.WriteLine($"Created active Backoffice account for {email}.");
    Console.WriteLine("The password was stored as a hash. Sign in through the standard login page.");
    return 0;
}
catch (MongoException exception)
{
    Console.Error.WriteLine($"MongoDB operation failed ({exception.GetType().Name}). No account was confirmed as created.");
    return 1;
}
catch (TimeoutException)
{
    Console.Error.WriteLine("Cannot reach the configured MongoDB server. Start MongoDB and verify its connection settings; no account was created.");
    return 1;
}

static string? ValidatePassword(string password)
{
    if (password.Length < 8)
    {
        return "Password must be at least 8 characters long.";
    }

    if (!password.Any(char.IsUpper)
        || !password.Any(char.IsLower)
        || !password.Any(char.IsDigit)
        || !password.Any(character => !char.IsLetterOrDigit(character) && !char.IsWhiteSpace(character)))
    {
        return "Password must include an uppercase letter, a lowercase letter, a number, and a special character.";
    }

    return null;
}

static string ReadRequired(string prompt)
{
    while (true)
    {
        Console.Write(prompt);
        var value = Console.ReadLine()?.Trim();
        if (!string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        Console.WriteLine("This field is required.");
    }
}

static string ReadPassword(string prompt)
{
    Console.Write(prompt);
    if (Console.IsInputRedirected)
    {
        return Console.ReadLine() ?? string.Empty;
    }

    var password = new System.Text.StringBuilder();
    while (true)
    {
        var key = Console.ReadKey(intercept: true);
        if (key.Key == ConsoleKey.Enter)
        {
            Console.WriteLine();
            return password.ToString();
        }

        if (key.Key == ConsoleKey.Backspace)
        {
            if (password.Length > 0)
            {
                password.Length--;
            }
        }
        else if (!char.IsControl(key.KeyChar))
        {
            password.Append(key.KeyChar);
        }
    }
}

sealed class BootstrapUser
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("nic")]
    public string Nic { get; set; } = string.Empty;

    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [BsonElement("role")]
    public string Role { get; set; } = string.Empty;

    [BsonElement("isActive")]
    public bool IsActive { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("contactNumber")]
    public string ContactNumber { get; set; } = string.Empty;

    [BsonElement("address")]
    public string Address { get; set; } = string.Empty;

    [BsonElement("accountStatus")]
    public string AccountStatus { get; set; } = "Active";

    [BsonElement("createdAtUtc")]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
