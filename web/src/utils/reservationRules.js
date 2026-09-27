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

/**
 * Working interpretation for the seven-day rule:
 * the start must be in the future, and no later than 23:59:59
 * on the calendar day seven days from today, in the browser's local time.
 * The team still needs to confirm this against the assignment.
 */
export function isInsideSevenDayWindow(iso, now = new Date()) {
  const start = new Date(iso);
  if (start.getTime() <= now.getTime()) return false;
  const limit = new Date(now);
  limit.setHours(0, 0, 0, 0);
  limit.setDate(limit.getDate() + 7);
  limit.setHours(23, 59, 59, 999);
  return start.getTime() <= limit.getTime();
}

export function isApprovedFuture(reservation, now = new Date()) {
  return (
    (reservation.status === "Approved" || reservation.status === "Scheduled") &&
    new Date(reservation.start).getTime() > now.getTime()
  );
}

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

export function canSchedule(reservation) {
  if (!reservation || reservation.status !== "Approved") {
    return "Only an approved reservation can be marked scheduled.";
  }
  if (new Date(reservation.start).getTime() <= Date.now()) {
    return "The reserved start time has already passed.";
  }
  return "";
}

export function canCancel(reservation) {
  if (!reservation || !holdsCapacity(reservation.status)) {
    return "This reservation can no longer be cancelled.";
  }
  if (!hasTwelveHourNotice(reservation.start)) {
    return "Cancellation needs at least 12 hours before the reserved start.";
  }
  return "";
}

export function canModify(reservation) {
  if (!reservation || !["Requested", "Approved"].includes(reservation.status)) {
    return "Only a requested or approved reservation can be modified. A scheduled reservation stays locked until the team agrees otherwise.";
  }
  if (!hasTwelveHourNotice(reservation.start)) {
    return "Modification needs at least 12 hours before the current start.";
  }
  return "";
}

export function canCompleteTransfer(reservation, transaction) {
  if (!reservation || reservation.status !== "Scheduled") {
    return "The reservation must be scheduled before the energy transfer is completed.";
  }
  if (!transaction || transaction.tokenStatus !== "Verified") {
    return "The QR token must be verified before the transfer is completed.";
  }
  return "";
}
