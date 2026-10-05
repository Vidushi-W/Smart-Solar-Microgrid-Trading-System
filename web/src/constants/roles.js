/**
 * Role ids must match the strings the APIs expect. ROLE_LABELS are display text only.
 */
export const ROLES = {
  BACKOFFICE: "Backoffice",
  OPERATOR: "GridOperator",
  PROSUMER: "Prosumer",
};

export const SIGN_IN_ROLES = [
  { value: ROLES.BACKOFFICE, label: "Backoffice", icon: "users" },
  { value: ROLES.OPERATOR, label: "Grid Operator", icon: "stations" },
  { value: ROLES.PROSUMER, label: "Solar Prosumer", icon: "prosumers" },
];

export function homeForVerifiedRole(role) {
  if (role === ROLES.BACKOFFICE || role === ROLES.OPERATOR || role === ROLES.PROSUMER) {
    return "/dashboard";
  }
  return "/login";
}

export const ROLE_LABELS = {
  Backoffice: "Backoffice Officer",
  GridOperator: "Grid Operator",
  Prosumer: "Solar Prosumer",
};

export const OWNERS = {
  accounts: "Member 1 — Authentication & Accounts",
  stations: "Member 2 — Stations & Energy Slots",
  reservations: "Member 3 — Reservation & Energy Trading Lifecycle",
  transactions: "Member 4 — QR & Transactions",
  shared: "Shared console",
};
