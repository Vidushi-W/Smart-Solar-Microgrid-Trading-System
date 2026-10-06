// Removes only the exact station/slot fixture records created by
// seed-stations.js. Never use this against production data.
const databaseName = db.getName();
if (!/(?:_dev|_test)$/i.test(databaseName)) {
  throw new Error(`Refusing to clean '${databaseName}'. Use a database ending in _dev or _test.`);
}

const stationIds = [
  "seed-station-cmb-01",
  "seed-station-kdy-01",
  "seed-station-gal-01",
  "seed-station-jfn-01",
];
const slotIds = [
  "seed-slot-cmb-open-01",
  "seed-slot-cmb-full-01",
  "seed-slot-cmb-closed-01",
  "seed-slot-kdy-full-01",
  "seed-slot-kdy-full-02",
  "seed-slot-kdy-open-01",
];

const reservations = db.getCollection("EnergyReservation");
const hasReservations = reservations.findOne({
  $or: [
    { stationId: { $in: stationIds } },
    { slotId: { $in: slotIds } },
  ],
});
if (hasReservations) {
  throw new Error("Fixture cleanup stopped: an EnergyReservation references a fixture station or slot.");
}

const stationResult = db.getCollection("SolarStationInfo").deleteMany({ _id: { $in: stationIds } });
const slotResult = db.getCollection("EnergyBookingSlots").deleteMany({ _id: { $in: slotIds } });
print(`Removed ${stationResult.deletedCount} seeded stations and ${slotResult.deletedCount} seeded slots from ${databaseName}.`);
