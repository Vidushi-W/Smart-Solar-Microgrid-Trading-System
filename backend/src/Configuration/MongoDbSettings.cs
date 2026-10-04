using System.ComponentModel.DataAnnotations;

namespace SolarMicrogridTrading.Api.Configuration
{
    public sealed class MongoDbSettings
    {
        public string ConnectionString { get; init; } = string.Empty;
        public string DatabaseName { get; init; } = "SolarMicrogridDB";
        public string UsersCollectionName { get; init; } = "UserDetails";
    }
}

namespace SmartSolar.Microgrid.Configuration
{
    public sealed class MongoDbSettings
    {
        public const string SectionName = "MongoDB";

        [Required]
        public string ConnectionString { get; init; } = string.Empty;

        [Required]
        public string DatabaseName { get; init; } = string.Empty;

        [Required]
        public string StationsCollectionName { get; init; } = "SolarStationInfo";

        [Required]
        public string SlotsCollectionName { get; init; } = "EnergyBookingSlots";

        [Required]
        public string ReservationsCollectionName { get; init; } = "EnergyReservation";
    }
}