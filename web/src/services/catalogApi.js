/**
 * Station and energy-slot calls for the reservation API (default http://localhost:5251/api). Identity is sent as X-User-Id and X-User-Role because that API does not read the JWT.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5251/api";

// The reservation API on port 5251 trusts these headers in Development. It does not read the JWT.
function authHeaders(user) {
  return {
    "X-User-Id": user.id,
    "X-User-Role": user.role,
  };
}

async function read(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "The station request could not be completed.");
  }
  return data;
}

function send(user, path, method, body) {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...authHeaders(user), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(read);
}

export function fetchStations(user) {
  return fetch(`${API_BASE}/stations`, { headers: authHeaders(user) }).then(read);
}

export function fetchNearbyStations(user, latitude, longitude, radiusKm) {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radiusKm: String(radiusKm),
  });
  return fetch(`${API_BASE}/stations/nearby?${query}`, { headers: authHeaders(user) }).then(read);
}

export function saveStation(user, id, body) {
  return send(user, id ? `/stations/${id}` : "/stations", id ? "PATCH" : "POST", body);
}

export function setStationStatus(user, id, status) {
  return send(user, `/stations/${id}/status`, "PATCH", { status });
}

export function fetchSlots(user, stationId) {
  const query = stationId && stationId !== "All" ? `?stationId=${encodeURIComponent(stationId)}` : "";
  return fetch(`${API_BASE}/slots${query}`, { headers: authHeaders(user) }).then(read);
}

export function saveSlot(user, id, body) {
  return send(user, id ? `/slots/${id}` : "/slots", id ? "PATCH" : "POST", body);
}

export function setSlotOpen(user, id, isOpen) {
  return send(user, `/slots/${id}/availability`, "PATCH", { isOpen });
}
