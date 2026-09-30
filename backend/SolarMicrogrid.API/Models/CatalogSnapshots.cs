namespace SolarMicrogrid.API.Models;

public record StationSnapshot(string Id, string Name, string Status, double CapacityKwh);

public record SlotSnapshot(string Id, string StationId, string Label, DateTime Start, DateTime End, int Capacity, bool IsOpen);

public record ProsumerSnapshot(string Id, string Name, string Status);
