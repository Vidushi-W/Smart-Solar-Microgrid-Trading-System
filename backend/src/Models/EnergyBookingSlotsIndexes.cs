using MongoDB.Driver;

namespace SmartSolar.Microgrid.Models;

/// <summary>
/// Index definitions to apply when initializing the EnergyBookingSlots collection.
/// </summary>
public static class EnergyBookingSlotsIndexes
{
    public static CreateIndexModel<EnergyBookingSlots>[] All => new[]
    {
        new CreateIndexModel<EnergyBookingSlots>(Builders<EnergyBookingSlots>.IndexKeys.Ascending(slot => slot.StationId)),
        new CreateIndexModel<EnergyBookingSlots>(Builders<EnergyBookingSlots>.IndexKeys.Ascending(slot => slot.Date)),
        new CreateIndexModel<EnergyBookingSlots>(Builders<EnergyBookingSlots>.IndexKeys
            .Ascending(slot => slot.StationId)
            .Ascending(slot => slot.Date)),
    };
}
