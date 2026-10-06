export const UPCOMING_STATUSES = ["Pending", "Approved"];
export const HISTORY_STATUSES = ["Completed", "Cancelled"];

export function stationTitle(station, stationId) {
  return station?.name?.trim() || stationId || "Station";
}

export function utcDateLabel(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function utcTimeLabel(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function utcDateInput(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function slotInstant(slot) {
  const date = String(slot.date).slice(0, 10);
  const start = String(slot.startTime).slice(0, 5);
  return `${date}T${start}:00.000Z`;
}
