using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SolarMicrogridTrading.Api.Models;

public sealed class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;
    public string Nic { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
