namespace SolarMicrogrid.API.Constants;

public static class AppRoles
{
    public const string Backoffice = "Backoffice";
    public const string GridOperator = "GridOperator";
    public const string Prosumer = "Prosumer";
}

public static class ReservationStatus
{
    public const string Requested = "Requested";
    public const string Approved = "Approved";
    public const string Scheduled = "Scheduled";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public const string Rejected = "Rejected";

    public static readonly string[] Holding = [Requested, Approved, Scheduled];
    public static readonly string[] Known = [Requested, Approved, Scheduled, Completed, Cancelled, Rejected];
    public const string ApprovedFuture = "ApprovedFuture";
    public const string DueSoon = "DueSoon";
}

public static class ServiceTypes
{
    public const string DropOff = "Drop-off";
    public const string Charging = "Charging";

    public static bool IsKnown(string? value) => value is DropOff or Charging;
}

public static class MongoCollections
{
    public const string Reservations = "EnergyReservation";
    public const string Stations = "SolarStationInfo";
    public const string Slots = "EnergyBookingSlots";
    public const string Prosumers = "Prosumers";
}
