import { RESERVATION_API_BASE } from "./apiTargets";
import { ApiError } from "./apiClient";

export async function reservationRequest(user, path, { method = "GET", body, signal } = {}) {
  const headers = new Headers({ Accept: "application/json" });
  const token = localStorage.getItem("authToken");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Existing reservation host accepts these only in Development.
  // Production remains blocked until that host validates JWTs.
  if (import.meta.env.DEV) {
    headers.set("X-User-Id", user.id);
    headers.set("X-User-Role", user.role);
  }
  if (body !== undefined) headers.set("Content-Type", "application/json");
  let response;
  try {
    response = await fetch(`${RESERVATION_API_BASE}${path}`, {
      method, headers, signal, body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Could not reach the reservation API. Check the connection and try again.", 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const validation = data?.errors ? Object.values(data.errors).flat().join(" ") : "";
    throw new ApiError(data?.message || data?.detail || validation || data?.title || `Request failed (${response.status}).`, response.status, data);
  }
  if (data == null) throw new ApiError("The reservation API returned an unreadable response.", response.status);
  return data;
}
