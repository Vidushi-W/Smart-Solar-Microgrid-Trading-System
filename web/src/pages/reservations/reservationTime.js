/**
 * UTC labels and the Colombo booking window used by reservation screens. A slot instant is the slot date plus start time, stored as UTC. A slot can be booked only if it has not started and its start falls inside the next 7 Colombo days.
 */
export const UPCOMING_STATUSES = ["Pending", "Approved"];
export const HISTORY_STATUSES = ["Completed", "Cancelled"];

export function stationTitle(station, stationId) {
  return station?.name?.trim() || stationId || "Station";
}

// Format the calendar date in UTC so the viewer's timezone does not move the day.
export function utcDateLabel(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

// Format the clock in UTC on a 24-hour cycle.
export function utcTimeLabel(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(iso));
}

// UTC date portion, YYYY-MM-DD, for a date input.
export function utcDateInput(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

// Join the slot date and start time into a UTC instant. Seconds are fixed at :00.000Z.
export function slotInstant(slot) {
  const date = String(slot.date).slice(0, 10);
  const start = String(slot.startTime).slice(0, 5);
  return `${date}T${start}:00.000Z`;
}

const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Colombo is UTC+5:30. Return that calendar date, shifted by dayOffset, as YYYY-MM-DD.
export function colomboDateInput(now = new Date(), dayOffset = 0) {
  const shifted = new Date(now.getTime() + COLOMBO_OFFSET_MS);
  const date = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + dayOffset));
  return date.toISOString().slice(0, 10);
}

// Refuse a slot that has already started or whose start is after the end of the seventh Colombo day.
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
