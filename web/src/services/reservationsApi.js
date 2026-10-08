/**
 * Reservation reads and writes through reservationRequest. List, options, create, fetch, modify, the dashboard summary, and status actions all stay on the reservation host.
 */
import { reservationRequest } from "./reservationClient";

export function fetchReservationOptions(user, prosumerId) {
  const query = prosumerId ? `?prosumerId=${encodeURIComponent(prosumerId)}` : "";
  return reservationRequest(user, `/reservations/options${query}`);
}
export const createReservation = (user, body) => reservationRequest(user, "/reservations", { method: "POST", body });
export const fetchReservation = (user, id, signal) => reservationRequest(user, `/reservations/${encodeURIComponent(id)}`, { signal });
export const modifyReservation = (user, id, slotId) => reservationRequest(user, `/reservations/${encodeURIComponent(id)}`, { method: "PATCH", body: { slotId } });
// Skip empty filters and the value All so they are not sent as query parameters.
export function fetchReservations(user, params = {}, signal) {
  const query = new URLSearchParams();
  for (const key of ["status", "stationId", "date", "q"]) {
    if (params[key] && params[key] !== "All") query.set(key, params[key]);
  }
  return reservationRequest(user, `/reservations${query.size ? `?${query}` : ""}`, { signal });
}
export const fetchReservationDashboard = (user) => reservationRequest(user, "/dashboard/reservations");
// POST /reservations/{id}/{action}. The body stays empty unless the caller passes one.
export const postReservationAction = (user, id, action, body = {}) => reservationRequest(user,
  `/reservations/${encodeURIComponent(id)}/${action}`, { method: "POST", body });
