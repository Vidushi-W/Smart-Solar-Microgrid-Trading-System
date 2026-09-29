const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5251/api";

function authHeaders(user) {
  return {
    "X-User-Id": user.id,
    "X-User-Role": user.role,
  };
}

async function read(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "The reservation request could not be completed.");
  }
  return data;
}

export function fetchReservationOptions(user, prosumerId) {
  const query = prosumerId ? `?prosumerId=${encodeURIComponent(prosumerId)}` : "";
  return fetch(`${API_BASE}/reservations/options${query}`, { headers: authHeaders(user) }).then(read);
}

export function createReservation(user, body) {
  return fetch(`${API_BASE}/reservations`, {
    method: "POST",
    headers: { ...authHeaders(user), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(read);
}

export function fetchReservations(user, params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== "All") query.set("status", params.status);
  if (params.stationId && params.stationId !== "All") query.set("stationId", params.stationId);
  if (params.date) query.set("date", params.date);
  if (params.q) query.set("q", params.q);
  const suffix = query.toString() ? `?${query}` : "";
  return fetch(`${API_BASE}/reservations${suffix}`, { headers: authHeaders(user) }).then(read);
}

export function fetchReservationDashboard(user) {
  return fetch(`${API_BASE}/dashboard/reservations`, { headers: authHeaders(user) }).then(read);
}

export function postReservationAction(user, id, action, body) {
  return fetch(`${API_BASE}/reservations/${id}/${action}`, {
    method: "POST",
    headers: { ...authHeaders(user), "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  }).then(read);
}
