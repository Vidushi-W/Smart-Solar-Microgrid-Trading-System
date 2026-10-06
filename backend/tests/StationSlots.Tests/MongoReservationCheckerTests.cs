using MongoDB.Bson;
using SmartSolar.Microgrid.Services;
using Xunit;

namespace StationSlots.Tests;

public sealed class MongoReservationCheckerTests
{
    private static readonly string[] BlockingStatuses = ["Requested", "Pending", "Approved", "Scheduled"];

    [Fact]
    public void Station_query_matches_current_and_legacy_field_casing_and_blocking_statuses()
    {
        AssertHoldQuery(MongoReservationChecker.BuildStationHoldFilter("station-1"), "stationId", "StationId", "station-1");
    }

    [Fact]
    public void Slot_query_matches_current_and_legacy_field_casing_and_blocking_statuses()
    {
        AssertHoldQuery(MongoReservationChecker.BuildSlotHoldFilter("slot-1"), "slotId", "SlotId", "slot-1");
    }

    private static void AssertHoldQuery(BsonDocument query, string lowerId, string upperId, string id)
    {
        var branches = query["$or"].AsBsonArray;
        Assert.Equal(2, branches.Count);
        AssertBranch(branches[0].AsBsonDocument, lowerId, "status", id);
        AssertBranch(branches[1].AsBsonDocument, upperId, "Status", id);
    }

    private static void AssertBranch(BsonDocument branch, string idField, string statusField, string id)
    {
        Assert.Equal(id, branch[idField].AsString);
        Assert.Equal(BlockingStatuses, branch[statusField]["$in"].AsBsonArray.Select(value => value.AsString));
    }
}
