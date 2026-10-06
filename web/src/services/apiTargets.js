// Bases include /api. QR issuance belongs to accounts, not reservations.
const env = import.meta.env;
export const ACCOUNT_API_BASE = (env.VITE_ACCOUNT_API_BASE_URL || env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
export const RESERVATION_API_BASE = (env.VITE_RESERVATION_API_BASE_URL || "/reservation-api").replace(/\/$/, "");
