// Station and slot payloads. HoldingCount is Requested, Approved, and Scheduled reservations.
namespace SolarMicrogrid.API.DTOs;

public class StationDto
{
    public string Id { get; set; } = "";
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Address { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double CapacityKwh { get; set; }
    public int BatterySlots { get; set; }
    public string Hours { get; set; } = "";
    public string Status { get; set; } = "";
    public int HoldingCount { get; set; }
}

// DistanceKm is the great-circle distance from the caller's search point.
public class NearbyStationDto : StationDto
{
    public double DistanceKm { get; set; }
}

public class StationWriteRequest
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Address { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double CapacityKwh { get; set; }
    public int BatterySlots { get; set; }
    public string Hours { get; set; } = "";
}

// Status must be Active or Inactive.
public class StationStatusRequest
{
    public string Status { get; set; } = "";
}

public class SlotDto
{
    public string Id { get; set; } = "";
    public string StationId { get; set; } = "";
    public string StationName { get; set; } = "";
    public string Label { get; set; } = "";
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public int Capacity { get; set; }
    public bool IsOpen { get; set; }
    public int HoldingCount { get; set; }
}

// IsOpen defaults to true when the client omits it.
public class SlotWriteRequest
{
    public string StationId { get; set; } = "";
    public string Label { get; set; } = "";
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public int Capacity { get; set; }
    public bool IsOpen { get; set; } = true;
}

public class SlotAvailabilityRequest
{
    public bool IsOpen { get; set; }
}
