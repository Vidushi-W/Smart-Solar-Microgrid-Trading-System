/**
 * Temporary display names for live stations that currently have an empty name.
 * A name already returned by the API is kept.
 */
const DETAILS = {
  "st-cmb": {
    name: "Colombo Fort Solar Hub",
    latitude: 6.9344,
    longitude: 79.8428,
    capacityKwh: 120,
    totalBatterySlots: 8,
    availableBatterySlots: 5,
  },
  "st-neg": {
    name: "Negombo Coast Node",
    latitude: 7.2083,
    longitude: 79.8358,
    capacityKwh: 80,
    totalBatterySlots: 6,
    availableBatterySlots: 4,
  },
  "st-7d9de2cb": {
    name: "Kandy Grid Point",
    latitude: 7.2906,
    longitude: 80.6337,
    capacityKwh: 60,
    totalBatterySlots: 4,
    availableBatterySlots: 2,
  },
};

export function enrichStations(stations) {
  return (Array.isArray(stations) ? stations : []).map((station) => {
    const mock = DETAILS[station.stationId];
    if (!mock) return station;
    return {
      ...station,
      name: station.name?.trim() ? station.name : mock.name,
      latitude: station.latitude || mock.latitude,
      longitude: station.longitude || mock.longitude,
      capacityKwh: station.capacityKwh || mock.capacityKwh,
      totalBatterySlots: station.totalBatterySlots || mock.totalBatterySlots,
      availableBatterySlots: station.availableBatterySlots || mock.availableBatterySlots,
    };
  });
}
