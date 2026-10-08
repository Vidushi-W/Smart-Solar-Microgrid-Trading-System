/**
 * QR and transfer calls on the account API through apiRequest, not the reservation host. issueQr posts /reservations/{id}/qr, verifyQr posts /transactions/verify, and completeTransfer posts /transactions/{id}/complete.
 */
import { apiRequest } from "./apiClient";

export const issueQr = (id) => apiRequest(`/reservations/${encodeURIComponent(id)}/qr`, { method: "POST" });
export const verifyQr = (body) => apiRequest("/transactions/verify", { method: "POST", body });
export const completeTransfer = (id, body) => apiRequest(`/transactions/${encodeURIComponent(id)}/complete`, { method: "POST", body });
