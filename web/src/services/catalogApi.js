/**
 * Station and slot calls through reservationRequest. Nearby search uses /stations/nearby. A missing id creates with POST; an id updates with PATCH. Opening or closing a slot uses PATCH /slots/{id}/availability.
 */
import { reservationRequest } from "./reservationClient";

export const fetchStations = (user) => reservationRequest(user, "/stations");
export function fetchNearbyStations(user, latitude, longitude, radiusKm) {
  const query = new URLSearchParams({ latitude, longitude, radiusKm });
  return reservationRequest(user, `/stations/nearby?${query}`);
}
// Create with POST when id is absent; otherwise PATCH the existing station.
export const saveStation = (user, id, body) => reservationRequest(user, id ? `/stations/${encodeURIComponent(id)}` : "/stations", { method: id ? "PATCH" : "POST", body });
export const setStationStatus = (user, id, status) => reservationRequest(user, `/stations/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } });
// Leave off the stationId query when it is missing or All.
export function fetchSlots(user, stationId) {
  const query = stationId && stationId !== "All" ? `?stationId=${encodeURIComponent(stationId)}` : "";
  return reservationRequest(user, `/slots${query}`);
}
// Create with POST when id is absent; otherwise PATCH the existing slot.
export const saveSlot = (user, id, body) => reservationRequest(user, id ? `/slots/${encodeURIComponent(id)}` : "/slots", { method: id ? "PATCH" : "POST", body });
export const setSlotOpen = (user, id, isOpen) => reservationRequest(user, `/slots/${encodeURIComponent(id)}/availability`, { method: "PATCH", body: { isOpen } });
