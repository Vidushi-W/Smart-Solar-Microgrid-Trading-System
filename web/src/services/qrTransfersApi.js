import { apiRequest } from "./apiClient";

export const issueQr = (id) => apiRequest(`/reservations/${encodeURIComponent(id)}/qr`, { method: "POST" });
export const verifyQr = (body) => apiRequest("/transactions/verify", { method: "POST", body });
export const completeTransfer = (id, body) => apiRequest(`/transactions/${encodeURIComponent(id)}/complete`, { method: "POST", body });
