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

const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function colomboDateInput(now = new Date(), dayOffset = 0) {
  const shifted = new Date(now.getTime() + COLOMBO_OFFSET_MS);
  const date = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + dayOffset));
  return date.toISOString().slice(0, 10);
}

export function slotBookingState(slot, now = new Date()) {
  const start = new Date(slotInstant(slot));
  if (Number.isNaN(start.getTime())) {
    return { ok: false, reason: "This slot is not available." };
  }
  if (start <= now) {
    return { ok: false, reason: "Already started" };
  }
  const shifted = new Date(now.getTime() + COLOMBO_OFFSET_MS);
  const limit = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 7, 23, 59, 59, 999) - COLOMBO_OFFSET_MS;
  if (start.getTime() > limit) {
    return { ok: false, reason: "Outside the next 7 days" };
  }
  return { ok: true, reason: "" };
}
