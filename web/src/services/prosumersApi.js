const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5251/api";

export async function fetchProsumers(user) {
  const response = await fetch(`${API_BASE}/prosumers`, {
    headers: {
      "X-User-Id": user.id,
      "X-User-Role": user.role,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "The prosumer list could not be loaded.");
  }
  return data;
}
