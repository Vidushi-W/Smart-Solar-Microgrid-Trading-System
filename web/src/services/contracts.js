export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * Proposed contracts only. Confirm the paths, payloads, and role split
 * before anyone builds the C# controllers around them.
 */
export const contractGroups = [
  {
    owner: "Member 1",
    area: "Authentication & Accounts",
    items: [
      { method: "POST", path: "/auth/login", role: "Public", purpose: "Sign in with email and password. Response carries the user id, name, and role. Clients must not choose their own user id." },
      { method: "GET", path: "/users", role: "Backoffice", purpose: "List Backoffice and Grid Operator accounts." },
      { method: "POST", path: "/users", role: "Backoffice", purpose: "Create a staff account." },
      { method: "PATCH", path: "/users/{id}/status", role: "Backoffice", purpose: "Activate or deactivate a staff account." },
      { method: "GET", path: "/prosumers", role: "Backoffice", purpose: "List prosumer accounts, including pending activations." },
      { method: "PATCH", path: "/prosumers/{id}/status", role: "Backoffice", purpose: "Activate, deactivate, or reactivate a prosumer." },
    ],
  },
  {
    owner: "Member 2",
    area: "Stations & Energy Slots",
    items: [
      { method: "GET", path: "/stations", role: "Authenticated", purpose: "List microgrid stations, including coordinates, capacity, and status." },
      { method: "POST", path: "/stations", role: "Backoffice", purpose: "Register a station." },
      { method: "PATCH", path: "/stations/{id}", role: "Backoffice", purpose: "Update station details." },
      { method: "PATCH", path: "/stations/{id}/status", role: "Backoffice", purpose: "Activate or deactivate a station. Deactivation must fail while requested, approved, or scheduled reservations exist." },
      { method: "GET", path: "/slots", role: "Authenticated", purpose: "List energy slots. Query by stationId." },
      { method: "PATCH", path: "/slots/{id}/availability", role: "Backoffice, Grid Operator", purpose: "Open or close a slot. Closing must fail while the slot still has a capacity hold." },
    ],
  },
  {
    owner: "Member 3",
    area: "Reservation & Energy Trading Lifecycle",
    items: [
      { method: "GET", path: "/reservations", role: "Backoffice, Grid Operator, owning Prosumer", purpose: "Search by status, station, date, and text. A prosumer receives only their own rows." },
      { method: "GET", path: "/reservations/{id}", role: "Backoffice, Grid Operator, owner", purpose: "Reservation detail, including status history." },
      { method: "POST", path: "/reservations", role: "Prosumer", purpose: "Create a reservation inside the seven-day window. The API binds it to the authenticated prosumer and rejects double booking." },
      { method: "PATCH", path: "/reservations/{id}", role: "Prosumer, Backoffice", purpose: "Modify date, time, or slot when at least 12 hours' notice remains." },
      { method: "POST", path: "/reservations/{id}/cancel", role: "Prosumer, Backoffice", purpose: "Cancel an eligible reservation and release the capacity hold." },
      { method: "POST", path: "/reservations/{id}/approve", role: "Backoffice", purpose: "Approve a requested reservation and hand off QR generation to Member 4." },
      { method: "POST", path: "/reservations/{id}/reject", role: "Backoffice", purpose: "Reject a requested reservation and release the hold." },
      { method: "POST", path: "/reservations/{id}/schedule", role: "Grid Operator", purpose: "Move an approved reservation to Scheduled. This is separate from approval and from QR verification." },
      { method: "GET", path: "/dashboard/reservations", role: "Backoffice, Grid Operator, Prosumer", purpose: "Pending count, and the count of approved or scheduled reservations whose start is still in the future." },
    ],
  },
  {
    owner: "Member 4",
    area: "QR & Transactions",
    items: [
      { method: "POST", path: "/reservations/{id}/qr", role: "System, after approval", purpose: "Issue a single-use QR token for an approved reservation." },
      { method: "POST", path: "/transactions/verify", role: "Grid Operator", purpose: "Verify a scanned token. A used token must be rejected." },
      { method: "POST", path: "/transactions/{id}/complete", role: "Grid Operator", purpose: "Finalise the energy transfer and move the reservation to Completed." },
      { method: "GET", path: "/transactions", role: "Backoffice, Grid Operator", purpose: "List QR token states for operational monitoring." },
    ],
  },
];
