using MongoDB.Bson.Serialization.Attributes;

namespace SolarMicrogrid.API.Models;

public class EnergyReservation
{
    [BsonId]
    public string Id { get; set; } = "";
    public string Code { get; set; } = "";
    public string ProsumerId { get; set; } = "";
    public string StationId { get; set; } = "";
    public string SlotId { get; set; } = "";
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public string Status { get; set; } = "";
    public string ServiceType { get; set; } = "";
    public double EnergyKwh { get; set; }
    public List<ReservationHistoryEntry> History { get; set; } = [];
}

public class ReservationHistoryEntry
{
    public DateTime At { get; set; }
    public string Action { get; set; } = "";
    public string ActorId { get; set; } = "";
    public string ActorRole { get; set; } = "";
    public string Note { get; set; } = "";
}
