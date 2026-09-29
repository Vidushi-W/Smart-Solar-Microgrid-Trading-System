using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SolarMicrogridTrading.Api.Models;

public sealed class User
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
