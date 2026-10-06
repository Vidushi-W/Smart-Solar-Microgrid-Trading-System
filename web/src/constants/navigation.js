/**
 * Sidebar links and the title shown in the top bar. Dashboard uses an exact match so it is not highlighted on every other page.
 */
export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["Backoffice", "GridOperator", "Prosumer"], end: true },
  { to: "/users", label: "User Management", icon: "users", roles: ["Backoffice"] },
  { to: "/prosumers", label: "Prosumer Management", icon: "prosumers", roles: ["Backoffice"], end: true },
  { to: "/prosumers/pending", label: "Pending Activations", icon: "prosumers", roles: ["Backoffice"], end: true },
  { to: "/prosumers/deactivated", label: "Deactivated Accounts", icon: "prosumers", roles: ["Backoffice"] },
  { to: "/stations", label: "Stations", roleLabels: { GridOperator: "Microgrid Nodes" }, icon: "stations", roles: ["Backoffice", "GridOperator"] },
  { to: "/slots", label: "Energy slots", icon: "slots", roles: ["Backoffice", "GridOperator"] },
  { to: "/reservations", label: "Reservations", roleLabels: { GridOperator: "Bookings", Prosumer: "My Reservations" }, icon: "reservations", roles: ["Backoffice", "GridOperator", "Prosumer"] },
  { to: "/member2", label: "Stations", icon: "stations", roles: ["Prosumer"], end: true },
  { to: "/reservation-history", label: "Reservation History", icon: "history", roles: ["Prosumer"], end: true },
  { to: "/transactions", label: "Transfers", roleLabels: { GridOperator: "Energy Transfer" }, icon: "transfers", roles: ["Backoffice", "GridOperator"] },
  { to: "/profile", label: "Profile", icon: "profile", roles: ["Backoffice", "GridOperator", "Prosumer"], end: true },
];

export function titleForPath(pathname) {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/profile") return "My profile";
  if (pathname === "/users/new") return "Create user";
  if (pathname.startsWith("/users/") && (pathname.endsWith("/view") || pathname.endsWith("/profile"))) return "User details";
  if (pathname.startsWith("/users/") && !pathname.endsWith("/edit")) return "User details";
  if (pathname.startsWith("/users/") && pathname.endsWith("/edit")) return "Edit user";
  if (pathname.startsWith("/prosumers/") && pathname.endsWith("/edit")) return "Edit prosumer";
  if (pathname === "/prosumers") return "Prosumer Management";
  if (pathname.startsWith("/prosumers/") && pathname !== "/prosumers/pending" && pathname !== "/prosumers/deactivated") return "Prosumer details";
  if (pathname.startsWith("/prosumers")) return "Prosumers";
  if (pathname === "/member2") return "Stations & energy slots";
  if (pathname === "/reservation-history") return "Reservation History";
  if (pathname === "/reservations/new") return "New reservation";
  if (pathname.endsWith("/modify")) return "Modify reservation";
  if (pathname.startsWith("/reservations/")) return "Reservation";
  if (pathname.startsWith("/transactions/")) return "Transfer";
  if (pathname.startsWith("/stations/") && pathname.endsWith("/slots")) return "Station slots";
  const match = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  return match?.label || "Smart Solar";
}
