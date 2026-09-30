export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "dashboard", roles: ["Backoffice", "GridOperator", "Prosumer"], end: true },
  { to: "/users", label: "Users", icon: "users", roles: ["Backoffice"] },
  { to: "/prosumers", label: "Prosumers", icon: "prosumers", roles: ["Backoffice"] },
  { to: "/stations", label: "Stations", icon: "stations", roles: ["Backoffice", "GridOperator"] },
  { to: "/slots", label: "Energy slots", icon: "slots", roles: ["Backoffice", "GridOperator"] },
  { to: "/reservations", label: "Reservations", icon: "reservations", roles: ["Backoffice", "GridOperator", "Prosumer"] },
  { to: "/transactions", label: "Transfers", icon: "transfers", roles: ["Backoffice", "GridOperator"] },
];

export function titleForPath(pathname) {
  if (pathname === "/reservations/new") return "New reservation";
  if (pathname.startsWith("/reservations/")) return "Reservation";
  if (pathname.startsWith("/transactions/")) return "Transfer";
  if (pathname.startsWith("/stations/") && pathname.endsWith("/slots")) return "Station slots";
  const match = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  return match?.label || "Smart Solar";
}
