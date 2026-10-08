// Role names, reservation statuses, service types, and MongoDB collection names shared by this API.
namespace SolarMicrogrid.API.Constants;

// These strings are the only values accepted from X-User-Role.
public static class AppRoles
{
    public const string Backoffice = "Backoffice";
    public const string GridOperator = "GridOperator";
    public const string Prosumer = "Prosumer";
}

// Holding statuses keep a slot reserved. ApprovedFuture and DueSoon are search labels, not stored statuses.
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

// Drop-off and Charging are the only service types a reservation accepts.
public static class ServiceTypes
{
    public const string DropOff = "Drop-off";
    public const string Charging = "Charging";

    public static bool IsKnown(string? value) => value is DropOff or Charging;
}

// Collection names in the shared database. Reservations are not stored in the account API's EnergyReservation collection.
public static class MongoCollections
{
    // Kept apart from EnergyReservation, which the account reservation API owns.
    public const string Reservations = "OperationalEnergyReservation";
    public const string Stations = "SolarStationInfo";
    public const string Slots = "EnergyBookingSlots";
    public const string Prosumers = "Prosumers";
}
