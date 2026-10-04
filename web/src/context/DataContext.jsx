/**
 * Browser session for reservations and QR transfers that those screens still edit locally. If the saved version does not match seed.js, the old session is discarded and the sample data is loaded again.
 */
import { createContext, useContext, useState } from "react";
import { createSeed, DATA_VERSION } from "../data/seed";
import {
  canApprove,
  canCancel,
  canCompleteTransfer,
  canModify,
  canReject,
  canSchedule,
  hasTwelveHourNotice,
  holdsCapacity,
  isInsideSevenDayWindow,
  slotHoldCount,
} from "../utils/reservationRules";

const DataContext = createContext(null);
const DATA_KEY = "solar-grid-demo-v1";

function loadState() {
  try {
    const raw = sessionStorage.getItem(DATA_KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw);
    // Drop a session saved by an older seed shape so the screens do not read missing fields.
    if (parsed?.version !== DATA_VERSION || !Array.isArray(parsed.reservations)) {
      return createSeed();
    }
    return parsed;
  } catch {
    return createSeed();
  }
}

function withHistory(record, action, by, note) {
  return {
    ...record,
    history: [
      ...(record.history || []),
      { at: new Date().toISOString(), action, by, note },
    ],
  };
}

export function DataProvider({ children }) {
  const [data, setData] = useState(loadState);
  const [notice, setNotice] = useState(null);

  function commit(next, text, tone = "ok") {
    setData(next);
    sessionStorage.setItem(DATA_KEY, JSON.stringify(next));
    if (text) setNotice({ tone, text });
  }

  function warn(text) {
    setNotice({ tone: "warn", text });
  }

  function dismissNotice() {
    setNotice(null);
  }

  function resetDemo() {
    sessionStorage.removeItem(DATA_KEY);
    setData(createSeed());
    setNotice({ tone: "ok", text: "Demonstration data has been reset." });
  }

  function addStaffUser({ name, email, role }) {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail.includes("@")) {
      warn("Enter a name and a valid email.");
      return;
    }
    if (data.users.some((user) => user.email.toLowerCase() === trimmedEmail)) {
      warn("An account with that email already exists.");
      return;
    }
    const user = {
      id: `u-${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      password: "demo1234",
      role,
      status: "Active",
    };
    commit(
      { ...data, users: [...data.users, user] },
      `${user.name} was added. Until the API exists, the demonstration password is demo1234.`
    );
  }

  function setUserStatus(id, status, actor) {
    const target = data.users.find((user) => user.id === id);
    if (!target) return;
    if (actor?.id === id && status !== "Active") {
      warn("You cannot deactivate the account you are signed in with.");
      return;
    }
    if (status !== "Active" && target.role === "Backoffice") {
      const remaining = data.users.filter(
        (user) => user.role === "Backoffice" && user.status === "Active" && user.id !== id
      );
      if (remaining.length === 0) {
        warn("The last active Backoffice Officer cannot be deactivated.");
        return;
      }
    }
    commit(
      {
        ...data,
        users: data.users.map((user) => (user.id === id ? { ...user, status } : user)),
      },
      `${target.name} is now ${status.toLowerCase()}.`
    );
  }

  function setProsumerStatus(id, status) {
    const target = data.prosumers.find((person) => person.id === id);
    if (!target) return;
    commit(
      {
        ...data,
        prosumers: data.prosumers.map((person) =>
          person.id === id ? { ...person, status } : person
        ),
      },
      `${target.name} is now ${status.toLowerCase()}.`
    );
  }

  function setStationStatus(id, status) {
    const station = data.stations.find((item) => item.id === id);
    if (!station) return;
    if (status !== "Active") {
      const holding = data.reservations.some(
        (item) => item.stationId === id && holdsCapacity(item.status)
      );
      if (holding) {
        warn(
          "This station still has requested, approved, or scheduled reservations, so it cannot be deactivated."
        );
        return;
      }
    }
    commit(
      {
        ...data,
        stations: data.stations.map((item) => (item.id === id ? { ...item, status } : item)),
      },
      `${station.name} is now ${status.toLowerCase()}.`
    );
  }

  function setSlotOpen(id, isOpen) {
    const slot = data.slots.find((item) => item.id === id);
    if (!slot) return;
    if (!isOpen && slotHoldCount(data.reservations, id) > 0) {
      warn("This slot still has a capacity hold, so it cannot be closed.");
      return;
    }
    commit(
      {
        ...data,
        slots: data.slots.map((item) => (item.id === id ? { ...item, isOpen } : item)),
      },
      `${slot.label} is now ${isOpen ? "open" : "closed"}.`
    );
  }

  function replaceReservation(id, updater) {
    return data.reservations.map((item) => (item.id === id ? updater(item) : item));
  }

  function approveReservation(id, actor) {
    if (actor.role !== "Backoffice") {
      warn("Only a Backoffice Officer can approve a reservation in this console.");
      return;
    }
    const reservation = data.reservations.find((item) => item.id === id);
    const slot = data.slots.find((item) => item.id === reservation?.slotId);
    const station = data.stations.find((item) => item.id === reservation?.stationId);
    const reason = canApprove(reservation, slot, station);
    if (reason) {
      warn(reason);
      return;
    }
    const reservations = replaceReservation(id, (item) =>
      withHistory(
        { ...item, status: "Approved" },
        "Approved",
        actor.name,
        "Approved by the Backoffice Officer. QR generation is now waiting on Member 4."
      )
    );
    const transactions = data.transactions.some((item) => item.reservationId === id)
      ? data.transactions
      : [
          ...data.transactions,
          {
            id: `tx-${id}`,
            code: `TX-${reservation.code.slice(3)}`,
            reservationId: id,
            tokenStatus: "AwaitingQR",
            updatedAt: new Date().toISOString(),
          },
        ];
    commit(
      { ...data, reservations, transactions },
      `${reservation.code} approved. The QR handoff is waiting.`
    );
  }

  function rejectReservation(id, actor, note) {
    if (actor.role !== "Backoffice") {
      warn("Only a Backoffice Officer can reject a reservation in this console.");
      return;
    }
    const reservation = data.reservations.find((item) => item.id === id);
    const reason = canReject(reservation);
    if (reason) {
      warn(reason);
      return;
    }
    const reservations = replaceReservation(id, (item) =>
      withHistory(
        { ...item, status: "Rejected" },
        "Rejected",
        actor.name,
        note?.trim() || "Rejected by the Backoffice Officer."
      )
    );
    commit(
      { ...data, reservations },
      `${reservation.code} rejected. The capacity hold has been released.`
    );
  }

  function scheduleReservation(id, actor) {
    if (actor.role !== "GridOperator") {
      warn("Only a Grid Operator can mark a reservation as scheduled in this console.");
      return;
    }
    const reservation = data.reservations.find((item) => item.id === id);
    const reason = canSchedule(reservation);
    if (reason) {
      warn(reason);
      return;
    }
    const reservations = replaceReservation(id, (item) =>
      withHistory(
        { ...item, status: "Scheduled" },
        "Scheduled",
        actor.name,
        "Grid Operator confirmed the schedule. This does not verify the QR token."
      )
    );
    commit({ ...data, reservations }, `${reservation.code} is now scheduled.`);
  }

  function cancelReservation(id, actor) {
    if (actor.role !== "Backoffice") {
      warn("Only a Backoffice Officer can cancel on a prosumer's behalf in this console.");
      return;
    }
    const reservation = data.reservations.find((item) => item.id === id);
    const reason = canCancel(reservation);
    if (reason) {
      warn(reason);
      return;
    }
    const reservations = replaceReservation(id, (item) =>
      withHistory(
        { ...item, status: "Cancelled" },
        "Cancelled",
        actor.name,
        "Cancelled on the prosumer's behalf. The capacity hold has been released."
      )
    );
    commit({ ...data, reservations }, `${reservation.code} was cancelled and kept in history.`);
  }

  function modifyReservation(id, slotId, actor) {
    if (actor.role !== "Backoffice") {
      warn("Only a Backoffice Officer can modify a reservation in this console.");
      return;
    }
    const reservation = data.reservations.find((item) => item.id === id);
    const blocked = canModify(reservation);
    if (blocked) {
      warn(blocked);
      return;
    }
    const slot = data.slots.find((item) => item.id === slotId);
    const station = data.stations.find((item) => item.id === slot?.stationId);
    if (!slot || !station || station.status !== "Active" || !slot.isOpen) {
      warn("Choose an open slot on an active station.");
      return;
    }
    if (!isInsideSevenDayWindow(slot.start) || !hasTwelveHourNotice(slot.start)) {
      warn("The new time must sit inside the 7-day window and at least 12 hours ahead.");
      return;
    }
    if (slotHoldCount(data.reservations, slot.id, id) >= slot.capacity) {
      warn("That slot has no remaining capacity.");
      return;
    }
    const reservations = replaceReservation(id, (item) =>
      withHistory(
        {
          ...item,
          slotId: slot.id,
          stationId: station.id,
          start: slot.start,
          end: slot.end,
        },
        "Rescheduled",
        actor.name,
        `Moved to ${station.name}, ${slot.label}. Approval state was left unchanged.`
      )
    );
    commit({ ...data, reservations }, `${reservation.code} was rescheduled.`);
  }

  function markQrIssued(transactionId, actor) {
    if (actor.role !== "GridOperator") {
      warn("QR issuance in this console is a Grid Operator stand-in for Member 4.");
      return;
    }
    const transaction = data.transactions.find((item) => item.id === transactionId);
    if (!transaction || transaction.tokenStatus !== "AwaitingQR") {
      warn("A token can be marked issued only while it is awaiting QR generation.");
      return;
    }
    const reservation = data.reservations.find((item) => item.id === transaction.reservationId);
    if (!reservation || !["Approved", "Scheduled"].includes(reservation.status)) {
      warn("QR issuance follows an approved reservation.");
      return;
    }
    commit(
      {
        ...data,
        transactions: data.transactions.map((item) =>
          item.id === transactionId
            ? { ...item, tokenStatus: "Issued", updatedAt: new Date().toISOString() }
            : item
        ),
        reservations: replaceReservation(reservation.id, (item) =>
          withHistory(
            item,
            "QR issued",
            actor.name,
            "Stand-in for Member 4 token generation. Replace this with the API."
          )
        ),
      },
      `${transaction.code} marked as issued. This does not create a real QR payload.`
    );
  }

  function verifyTransaction(transactionId, actor) {
    if (actor.role !== "GridOperator") {
      warn("Only a Grid Operator can verify a QR token.");
      return;
    }
    const transaction = data.transactions.find((item) => item.id === transactionId);
    if (!transaction || transaction.tokenStatus !== "Issued") {
      warn("Only an issued token can be verified. A used token cannot be reused.");
      return;
    }
    const reservation = data.reservations.find((item) => item.id === transaction.reservationId);
    commit(
      {
        ...data,
        transactions: data.transactions.map((item) =>
          item.id === transactionId
            ? { ...item, tokenStatus: "Verified", updatedAt: new Date().toISOString() }
            : item
        ),
        reservations: replaceReservation(reservation.id, (item) =>
          withHistory(
            item,
            "QR verified",
            actor.name,
            "Stand-in for the Android scan. The reservation status is unchanged."
          )
        ),
      },
      `${transaction.code} verified. The reservation is not completed yet.`
    );
  }

  function completeTransfer(transactionId, actor) {
    if (actor.role !== "GridOperator") {
      warn("Only a Grid Operator can finalise an energy transfer.");
      return;
    }
    const transaction = data.transactions.find((item) => item.id === transactionId);
    const reservation = data.reservations.find((item) => item.id === transaction?.reservationId);
    const reason = canCompleteTransfer(reservation, transaction);
    if (reason) {
      warn(reason);
      return;
    }
    commit(
      {
        ...data,
        transactions: data.transactions.map((item) =>
          item.id === transactionId
            ? { ...item, tokenStatus: "Used", updatedAt: new Date().toISOString() }
            : item
        ),
        reservations: replaceReservation(reservation.id, (item) =>
          withHistory(
            { ...item, status: "Completed" },
            "Completed",
            actor.name,
            "Energy transfer finalised. The QR token can no longer be reused."
          )
        ),
      },
      `${reservation.code} completed. The token is now used.`
    );
  }

  const value = {
    ...data,
    notice,
    dismissNotice,
    resetDemo,
    addStaffUser,
    setUserStatus,
    setProsumerStatus,
    setStationStatus,
    setSlotOpen,
    approveReservation,
    rejectReservation,
    scheduleReservation,
    cancelReservation,
    modifyReservation,
    markQrIssued,
    verifyTransaction,
    completeTransfer,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used inside DataProvider");
  }
  return context;
}
