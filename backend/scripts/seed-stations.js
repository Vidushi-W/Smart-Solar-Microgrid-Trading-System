// Development/test fixture only. Run against a database whose name ends in
// _dev or _test; the guard below intentionally refuses other database names.
const databaseName = db.getName();
if (!/(?:_dev|_test)$/i.test(databaseName)) {
  throw new Error(
    `Refusing to seed '${databaseName}'. Use a database ending in _dev or _test.`
  );
}

const stations = db.getCollection("SolarStationInfo");
const slots = db.getCollection("EnergyBookingSlots");

// Seed dates are relative to today (UTC), keeping upcoming examples useful
// whenever the fixture is rerun. Dates are stored at UTC midnight.
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
function onDay(offset) {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

const stationDocuments = [
  {
    _id: "seed-station-cmb-01",
    name: "Colombo Fort Solar Hub",
    latitude: 6.9344,
    longitude: 79.8428,
    capacityKwh: 120,
    totalBatterySlots: 10,
    availableBatterySlots: 4,
    operatingSchedule: { days: [1, 2, 3, 4, 5, 6], openTime: "06:00", closeTime: "18:00" },
    status: "Active",
  },
  {
    _id: "seed-station-kdy-01",
    name: "Kandy Lake Energy Station",
    latitude: 7.2906,
    longitude: 80.6337,
    capacityKwh: 90,
    totalBatterySlots: 8,
    availableBatterySlots: 0,
    operatingSchedule: { days: [1, 2, 3, 4, 5, 6], openTime: "06:30", closeTime: "17:30" },
    status: "Active",
  },
  {
    _id: "seed-station-gal-01",
    name: "Galle Fort Microgrid",
    latitude: 6.0329,
    longitude: 80.2168,
    capacityKwh: 72,
    totalBatterySlots: 6,
    availableBatterySlots: 6,
    operatingSchedule: { days: [1, 2, 3, 4, 5, 6, 0], openTime: "07:00", closeTime: "17:00" },
    status: "Active",
  },
  {
    _id: "seed-station-jfn-01",
    name: "Jaffna Peninsula Solar Point",
    latitude: 9.6615,
    longitude: 80.0255,
    capacityKwh: 50,
    totalBatterySlots: 4,
    availableBatterySlots: 2,
    operatingSchedule: { days: [1, 2, 3, 4, 5, 6], openTime: "07:00", closeTime: "16:30" },
    status: "Deactivated",
  },
];

const slotDocuments = [
  {
    _id: "seed-slot-cmb-open-01",
    stationId: "seed-station-cmb-01",
    date: onDay(1),
    startTime: "09:00",
    endTime: "10:00",
    totalCapacity: 4,
    remainingCapacity: 2,
    status: "Open",
  },
  {
    _id: "seed-slot-cmb-full-01",
    stationId: "seed-station-cmb-01",
    date: onDay(1),
    startTime: "14:00",
    endTime: "15:30",
    totalCapacity: 2,
    remainingCapacity: 0,
    status: "Full",
  },
  {
    _id: "seed-slot-cmb-closed-01",
    stationId: "seed-station-cmb-01",
    date: onDay(3),
    startTime: "11:00",
    endTime: "12:00",
    totalCapacity: 3,
    remainingCapacity: 3,
    status: "Closed",
  },
  {
    _id: "seed-slot-kdy-full-01",
    stationId: "seed-station-kdy-01",
    date: onDay(2),
    startTime: "08:30",
    endTime: "09:30",
    totalCapacity: 2,
    remainingCapacity: 0,
    status: "Full",
  },
  {
    _id: "seed-slot-kdy-full-02",
    stationId: "seed-station-kdy-01",
    date: onDay(2),
    startTime: "10:00",
    endTime: "11:00",
    totalCapacity: 3,
    remainingCapacity: 0,
    status: "Full",
  },
  {
    _id: "seed-slot-kdy-open-01",
    stationId: "seed-station-kdy-01",
    date: onDay(4),
    startTime: "13:00",
    endTime: "14:30",
    totalCapacity: 2,
    remainingCapacity: 1,
    status: "Open",
  },
];

// Upserts make reruns repeatable and only touch the explicitly namespaced
// seed records. The script never deletes collections or non-seed documents.
for (const station of stationDocuments) {
  stations.updateOne({ _id: station._id }, { $set: station }, { upsert: true });
}

for (const slot of slotDocuments) {
  slots.updateOne({ _id: slot._id }, { $set: slot }, { upsert: true });
}

slots.createIndex({ stationId: 1 }, { name: "station_id" });
slots.createIndex({ date: 1 }, { name: "slot_date" });
slots.createIndex({ stationId: 1, date: 1 }, { name: "station_date" });

print(`Seeded ${stationDocuments.length} stations and ${slotDocuments.length} slots into ${databaseName}.`);
print("Station fixtures: 3 active (Colombo has available capacity, Kandy has none, Galle has no slots), 1 deactivated (Jaffna).");
