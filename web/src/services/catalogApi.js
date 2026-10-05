import { reservationRequest } from "./reservationClient";

export const fetchStations = (user) => reservationRequest(user, "/stations");
export function fetchNearbyStations(user, latitude, longitude, radiusKm) {
  const query = new URLSearchParams({ latitude, longitude, radiusKm });
  return reservationRequest(user, `/stations/nearby?${query}`);
}
export const saveStation = (user, id, body) => reservationRequest(user, id ? `/stations/${encodeURIComponent(id)}` : "/stations", { method: id ? "PATCH" : "POST", body });
export const setStationStatus = (user, id, status) => reservationRequest(user, `/stations/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } });
export function fetchSlots(user, stationId) {
  const query = stationId && stationId !== "All" ? `?stationId=${encodeURIComponent(stationId)}` : "";
  return reservationRequest(user, `/slots${query}`);
}
export const saveSlot = (user, id, body) => reservationRequest(user, id ? `/slots/${encodeURIComponent(id)}` : "/slots", { method: id ? "PATCH" : "POST", body });
export const setSlotOpen = (user, id, isOpen) => reservationRequest(user, `/slots/${encodeURIComponent(id)}/availability`, { method: "PATCH", body: { isOpen } });
