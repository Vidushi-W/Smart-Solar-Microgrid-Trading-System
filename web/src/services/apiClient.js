import { API_BASE } from "./contracts";

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Could not reach the backend. Check that the API is running and try again.", 0);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("json") ? await response.json().catch(() => null) : null;
  if (!response.ok) {
    const validation = payload?.errors
      ? Object.values(payload.errors).flat().join(" ")
      : "";
    throw new ApiError(
      payload?.detail || validation || payload?.title || `Request failed (${response.status}).`,
      response.status,
      payload
    );
  }

  return payload;
}

export const stationsApi = {
  list: () => apiRequest("/stations"),
  create: (body) => apiRequest("/stations", { method: "POST", body }),
  update: (id, body) => apiRequest(`/stations/${encodeURIComponent(id)}`, { method: "PUT", body }),
  deactivate: (id) => apiRequest(`/stations/${encodeURIComponent(id)}/deactivate`, { method: "PUT" }),
  slots: (stationId, date) => apiRequest(`/stations/${encodeURIComponent(stationId)}/slots?date=${encodeURIComponent(date)}`),
  createSlot: (stationId, body) => apiRequest(`/stations/${encodeURIComponent(stationId)}/slots`, { method: "POST", body }),
  updateSlot: (id, body) => apiRequest(`/slots/${encodeURIComponent(id)}`, { method: "PUT", body }),
  deleteSlot: (id) => apiRequest(`/slots/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
