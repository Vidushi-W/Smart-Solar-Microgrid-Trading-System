using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartSolar.Microgrid.Configuration;
using SmartSolar.Microgrid.Interfaces;

namespace SmartSolar.Microgrid.Services;

/// <summary>
/// Reads Member 3's EnergyReservation collection without taking ownership of its
/// reservation document. Supports both the original PascalCase fields and the
/// lower-camel QR projection already used by this API.
/// </summary>
public sealed class MongoReservationChecker : IStationReservationChecker, ISlotReservationChecker
{
    // Requested is Member 3's Pending state in the live reservation workflow.
    // Pending remains accepted for databases created against the earlier contract.
    private static readonly string[] ReservationHoldStatuses = ["Requested", "Pending", "Approved", "Scheduled"];

    private readonly IMongoCollection<BsonDocument> _reservations;
    private readonly ILogger<MongoReservationChecker> _logger;

    public MongoReservationChecker(
        IMongoDatabase database,
        IOptions<MongoDbSettings> options,
        ILogger<MongoReservationChecker> logger)
    {
        _reservations = database.GetCollection<BsonDocument>(options.Value.ReservationsCollectionName);
        _logger = logger;
    }

    public async Task<StationReservationCheck> CheckAsync(string stationId, CancellationToken cancellationToken)
    {
        try
        {
            var exists = await _reservations.Find(BuildStationHoldFilter(stationId))
                .Limit(1)
                .AnyAsync(cancellationToken);
            return exists
                ? StationReservationCheck.HasPendingOrApprovedReservations
                : StationReservationCheck.Clear;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Could not check active reservations for station {StationId}.", stationId);
            return StationReservationCheck.Unavailable;
        }
    }

    public async Task<SlotReservationCheck> CheckDeletionAsync(string slotId, CancellationToken cancellationToken)
    {
        try
        {
            var exists = await _reservations.Find(BuildSlotHoldFilter(slotId))
                .Limit(1)
                .AnyAsync(cancellationToken);
            return exists
                ? SlotReservationCheck.HasDeletionBlockingReservations
                : SlotReservationCheck.Clear;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Could not check active reservations for slot {SlotId}.", slotId);
            return SlotReservationCheck.Unavailable;
        }
    }

    public static BsonDocument BuildStationHoldFilter(string stationId) => new("$or", new BsonArray
    {
        BuildHoldMatch("stationId", stationId, "status"),
        BuildHoldMatch("StationId", stationId, "Status"),
    });

    public static BsonDocument BuildSlotHoldFilter(string slotId) => new("$or", new BsonArray
    {
        BuildHoldMatch("slotId", slotId, "status"),
        BuildHoldMatch("SlotId", slotId, "Status"),
    });

    private static BsonDocument BuildHoldMatch(string idField, string id, string statusField) => new()
    {
        { idField, id },
        { statusField, new BsonDocument("$in", new BsonArray(ReservationHoldStatuses)) },
    };
}
