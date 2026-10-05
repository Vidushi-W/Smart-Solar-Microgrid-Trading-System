import { reservationRequest } from "./reservationClient";

export function fetchReservationOptions(user, prosumerId) {
  const query = prosumerId ? `?prosumerId=${encodeURIComponent(prosumerId)}` : "";
  return reservationRequest(user, `/reservations/options${query}`);
}
export const createReservation = (user, body) => reservationRequest(user, "/reservations", { method: "POST", body });
export const fetchReservation = (user, id, signal) => reservationRequest(user, `/reservations/${encodeURIComponent(id)}`, { signal });
export const modifyReservation = (user, id, slotId) => reservationRequest(user, `/reservations/${encodeURIComponent(id)}`, { method: "PATCH", body: { slotId } });
export function fetchReservations(user, params = {}, signal) {
  const query = new URLSearchParams();
  for (const key of ["status", "stationId", "date", "q"]) {
    if (params[key] && params[key] !== "All") query.set(key, params[key]);
  }
  return reservationRequest(user, `/reservations${query.size ? `?${query}` : ""}`, { signal });
}
export const fetchReservationDashboard = (user) => reservationRequest(user, "/dashboard/reservations");
export const postReservationAction = (user, id, action, body = {}) => reservationRequest(user,
  `/reservations/${encodeURIComponent(id)}/${action}`, { method: "POST", body });
