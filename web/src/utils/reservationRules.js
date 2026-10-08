/**
 * Display helpers for the reservation screens.
 * The account API decides: a booking must be scheduled within the next 7 Colombo days,
 * and only update and cancel require at least 12 hours' notice. Create does not.
 */
export const HOLDING_STATUSES = ["Requested", "Approved", "Scheduled"];

export function holdsCapacity(status) {
  return HOLDING_STATUSES.includes(status);
}

export function hoursUntil(iso, now = new Date()) {
  return (new Date(iso).getTime() - now.getTime()) / 36e5;
}

export function hasTwelveHourNotice(iso, now = new Date()) {
  return hoursUntil(iso, now) >= 12;
}

export const TWELVE_HOUR_MESSAGE = "The remaining time must be at least 12 hours.";

const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Same 7-day Colombo window the API enforces. Used only to label a row; the API still accepts or rejects the booking. */
export function isInsideSevenDayWindow(iso, now = new Date()) {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime()) || start.getTime() <= now.getTime()) return false;
  const colomboNow = new Date(now.getTime() + COLOMBO_OFFSET_MS);
  const startOfToday = Date.UTC(colomboNow.getUTCFullYear(), colomboNow.getUTCMonth(), colomboNow.getUTCDate());
  const limit = startOfToday + 8 * 24 * 60 * 60 * 1000 - 1 - COLOMBO_OFFSET_MS;
  return start.getTime() <= limit;
}

export function isApprovedFuture(reservation, now = new Date()) {
  return (
    (reservation.status === "Approved" || reservation.status === "Scheduled") &&
    new Date(reservation.start).getTime() > now.getTime()
  );
}

// Due soon is a holding reservation whose start is still ahead and less than 12 hours away.
export function summarizeReservations(reservations, now = new Date()) {
  return {
    pending: reservations.filter((item) => item.status === "Requested").length,
    approvedFuture: reservations.filter((item) => isApprovedFuture(item, now)).length,
    dueSoon: reservations.filter((item) => {
      const lead = hoursUntil(item.start, now);
      return holdsCapacity(item.status) && lead > 0 && lead < 12;
    }).length,
    completed: reservations.filter((item) => item.status === "Completed").length,
    cancelled: reservations.filter((item) => item.status === "Cancelled").length,
    rejected: reservations.filter((item) => item.status === "Rejected").length,
  };
}

// Count other holding reservations on this slot. ignoreId is left out, so the reservation being edited is not counted against itself.
export function slotHoldCount(reservations, slotId, ignoreId) {
  return reservations.filter(
    (item) =>
      item.slotId === slotId &&
      item.id !== ignoreId &&
      holdsCapacity(item.status)
  ).length;
}

export function describeLead(iso, now = new Date()) {
  const hours = hoursUntil(iso, now);
  if (hours < 0) return "already started";
  if (hours < 1) return "under 1 hour ahead";
  if (hours < 48) return `${Math.round(hours)} hours ahead`;
  return `${Math.round(hours / 24)} days ahead`;
}

// Approve only a Requested reservation on an active station with an open slot that has not started.
export function canApprove(reservation, slot, station) {
  if (!reservation || reservation.status !== "Requested") {
    return "Only a requested reservation can be approved.";
  }
  if (!station || station.status !== "Active") {
    return "The station is not active.";
  }
  if (!slot || !slot.isOpen) {
    return "The energy slot is not open.";
  }
  if (new Date(reservation.start).getTime() <= Date.now()) {
    return "The reserved start time has already passed.";
  }
  return "";
}

export function canReject(reservation) {
  if (!reservation || reservation.status !== "Requested") {
    return "Only a requested reservation can be rejected.";
  }
  return "";
}

// Schedule only an Approved reservation whose start is still in the future.
export function canSchedule(reservation) {
  if (!reservation || reservation.status !== "Approved") {
    return "Only an approved reservation can be marked scheduled.";
  }
  if (new Date(reservation.start).getTime() <= Date.now()) {
    return "The reserved start time has already passed.";
  }
  return "";
}

// Cancel only while the reservation still holds capacity and the start is at least 12 hours away.
export function canCancel(reservation) {
  if (!reservation || !holdsCapacity(reservation.status)) {
    return "This reservation can no longer be cancelled.";
  }
  if (!hasTwelveHourNotice(reservation.start)) {
    return "Cancellation needs at least 12 hours before the reserved start.";
  }
  return "";
}

// Modify only Requested or Approved, and only with at least 12 hours before the current start. Scheduled stays locked.
export function canModify(reservation) {
  if (!reservation || !["Requested", "Approved"].includes(reservation.status)) {
    return "Only a requested or approved reservation can be modified. A scheduled reservation stays locked until the team agrees otherwise.";
  }
  if (!hasTwelveHourNotice(reservation.start)) {
    return "Modification needs at least 12 hours before the current start.";
  }
  return "";
}

// Complete a transfer only when the reservation is Scheduled and the QR token is already Verified.
export function canCompleteTransfer(reservation, transaction) {
  if (!reservation || reservation.status !== "Scheduled") {
    return "The reservation must be scheduled before the energy transfer is completed.";
  }
  if (!transaction || transaction.tokenStatus !== "Verified") {
    return "The QR token must be verified before the transfer is completed.";
  }
  return "";
}
