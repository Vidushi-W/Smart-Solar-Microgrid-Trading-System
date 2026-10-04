/**
 * Sample users, stations, reservations, and transfers. DataContext loads this when the browser has no saved session.
 */
const DATA_VERSION = 2;

function at(dayOffset, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function ago(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function history(items) {
  return items.map(([hoursAgo, action, by, note]) => ({
    at: ago(hoursAgo),
    action,
    by,
    note,
  }));
}

export function createSeed() {
  const soonStart = hoursFromNow(6);
  const soonEnd = hoursFromNow(7);
  const laterStart = hoursFromNow(20);
  const laterEnd = hoursFromNow(21);

  return {
    version: DATA_VERSION,
    users: [
      {
        id: "u-amaya",
        name: "Amaya Fernando",
        email: "backoffice@solarmicrogrid.lk",
        password: "demo1234",
        role: "Backoffice",
        status: "Active",
      },
      {
        id: "u-nimal",
        name: "Nimal Perera",
        email: "operator@solarmicrogrid.lk",
        password: "demo1234",
        role: "GridOperator",
        status: "Active",
      },
      {
        id: "u-saman",
        name: "Saman Dias",
        email: "saman@solarmicrogrid.lk",
        password: "demo1234",
        role: "GridOperator",
        status: "Deactivated",
      },
      {
        id: "p-ishara",
        name: "Ishara Jayawardena",
        email: "ishara@example.com",
        password: "demo1234",
        role: "Prosumer",
        status: "Active",
      },
      {
        id: "p-fathima",
        name: "Fathima Rizwan",
        email: "fathima@example.com",
        password: "demo1234",
        role: "Prosumer",
        status: "Active",
      },
      {
        id: "p-nuwan",
        name: "Nuwan Bandara",
        email: "nuwan@example.com",
        password: "demo1234",
        role: "Prosumer",
        status: "Active",
      },
    ],
    prosumers: [
      {
        id: "p-ishara",
        name: "Ishara Jayawardena",
        nic: "199800001V",
        email: "ishara@example.com",
        phone: "+94 71 000 1001",
        status: "Active",
        registeredAt: ago(240),
      },
      {
        id: "p-fathima",
        name: "Fathima Rizwan",
        nic: "200100002V",
        email: "fathima@example.com",
        phone: "+94 77 000 1002",
        status: "Active",
        registeredAt: ago(180),
      },
      {
        id: "p-kavindu",
        name: "Kavindu Silva",
        nic: "199500003V",
        email: "kavindu@example.com",
        phone: "+94 76 000 1003",
        status: "Pending",
        registeredAt: ago(20),
      },
      {
        id: "p-mei",
        name: "Mei Chen",
        nic: "198800004V",
        email: "mei@example.com",
        phone: "+94 75 000 1004",
        status: "Deactivated",
        registeredAt: ago(400),
      },
      {
        id: "p-nuwan",
        name: "Nuwan Bandara",
        nic: "200200005V",
        email: "nuwan@example.com",
        phone: "+94 70 000 1005",
        status: "Active",
        registeredAt: ago(90),
      },
      {
        id: "p-sanduni",
        name: "Sanduni Perera",
        nic: "199900006V",
        email: "sanduni@example.com",
        phone: "+94 78 000 1006",
        status: "Pending",
        registeredAt: ago(6),
      },
    ],
    stations: [
      {
        id: "st-cmb",
        code: "CMB-01",
        name: "Colombo Fort Microgrid",
        address: "York Street, Colombo 01",
        latitude: 6.9344,
        longitude: 79.8428,
        capacityKwh: 120,
        hours: "06:00–18:00",
        status: "Active",
      },
      {
        id: "st-kdy",
        code: "KDY-01",
        name: "Kandy Lake Station",
        address: "Lake Road, Kandy",
        latitude: 7.2906,
        longitude: 80.6337,
        capacityKwh: 80,
        hours: "06:30–17:30",
        status: "Active",
      },
      {
        id: "st-gal",
        code: "GAL-01",
        name: "Galle Fort Station",
        address: "Church Street, Galle Fort",
        latitude: 6.026,
        longitude: 80.217,
        capacityKwh: 60,
        hours: "07:00–17:00",
        status: "Active",
      },
      {
        id: "st-neg",
        code: "NEG-01",
        name: "Negombo Lagoon Node",
        address: "Lagoon Road, Negombo",
        latitude: 7.2083,
        longitude: 79.8358,
        capacityKwh: 40,
        hours: "07:00–16:00",
        status: "Inactive",
      },
    ],
    slots: [
      { id: "sl-cmb-1", stationId: "st-cmb", label: "Morning drop-off", start: at(1, 9), end: at(1, 10), capacity: 2, isOpen: true },
      { id: "sl-cmb-2", stationId: "st-cmb", label: "Afternoon charging", start: at(1, 14), end: at(1, 15), capacity: 1, isOpen: true },
      { id: "sl-cmb-3", stationId: "st-cmb", label: "Evening drop-off", start: soonStart, end: soonEnd, capacity: 1, isOpen: true },
      { id: "sl-cmb-4", stationId: "st-cmb", label: "Night charging", start: laterStart, end: laterEnd, capacity: 2, isOpen: true },
      { id: "sl-kdy-1", stationId: "st-kdy", label: "Late morning drop-off", start: at(2, 10), end: at(2, 11, 30), capacity: 2, isOpen: true },
      { id: "sl-kdy-2", stationId: "st-kdy", label: "Midday charging", start: at(6, 11), end: at(6, 12), capacity: 2, isOpen: true },
      { id: "sl-gal-1", stationId: "st-gal", label: "Yesterday drop-off", start: at(-1, 9), end: at(-1, 10), capacity: 1, isOpen: false },
      { id: "sl-gal-2", stationId: "st-gal", label: "Fort morning window", start: at(3, 8, 30), end: at(3, 9, 30), capacity: 1, isOpen: true },
      { id: "sl-cmb-edge", stationId: "st-cmb", label: "Seventh-day boundary", start: at(7, 11), end: at(7, 12), capacity: 1, isOpen: true },
      { id: "sl-cmb-beyond", stationId: "st-cmb", label: "Beyond seven days", start: at(8, 11), end: at(8, 12), capacity: 1, isOpen: true },
      { id: "sl-neg-1", stationId: "st-neg", label: "Lagoon morning window", start: at(4, 9), end: at(4, 10), capacity: 1, isOpen: true },
    ],
    reservations: [
      {
        id: "rs-2401",
        code: "RS-2401",
        prosumerId: "p-ishara",
        stationId: "st-cmb",
        slotId: "sl-cmb-1",
        start: at(1, 9),
        end: at(1, 10),
        status: "Requested",
        serviceType: "Drop-off",
        energyKwh: 18,
        history: history([[5, "Requested", "Ishara Jayawardena", "Reservation submitted from the prosumer app."]]),
      },
      {
        id: "rs-2402",
        code: "RS-2402",
        prosumerId: "p-fathima",
        stationId: "st-kdy",
        slotId: "sl-kdy-1",
        start: at(2, 10),
        end: at(2, 11, 30),
        status: "Requested",
        serviceType: "Drop-off",
        energyKwh: 22,
        history: history([[8, "Requested", "Fathima Rizwan", "Reservation submitted from the prosumer app."]]),
      },
      {
        id: "rs-2403",
        code: "RS-2403",
        prosumerId: "p-nuwan",
        stationId: "st-cmb",
        slotId: "sl-cmb-2",
        start: at(1, 14),
        end: at(1, 15),
        status: "Approved",
        serviceType: "Charging",
        energyKwh: 15,
        history: history([
          [30, "Requested", "Nuwan Bandara", "Reservation submitted from the prosumer app."],
          [26, "Approved", "Amaya Fernando", "Approved by the Backoffice Officer. QR generation is still waiting."],
        ]),
      },
      {
        id: "rs-2404",
        code: "RS-2404",
        prosumerId: "p-ishara",
        stationId: "st-cmb",
        slotId: "sl-cmb-3",
        start: soonStart,
        end: soonEnd,
        status: "Scheduled",
        serviceType: "Drop-off",
        energyKwh: 12,
        history: history([
          [10, "Requested", "Ishara Jayawardena", "Reservation submitted from the prosumer app."],
          [8, "Approved", "Amaya Fernando", "Approved by the Backoffice Officer."],
          [7, "Scheduled", "Nimal Perera", "Grid Operator confirmed the schedule."],
          [6, "QR issued", "QR service", "A single-use token was issued."],
        ]),
      },
      {
        id: "rs-2405",
        code: "RS-2405",
        prosumerId: "p-fathima",
        stationId: "st-kdy",
        slotId: "sl-kdy-2",
        start: at(6, 11),
        end: at(6, 12),
        status: "Scheduled",
        serviceType: "Charging",
        energyKwh: 20,
        history: history([
          [40, "Requested", "Fathima Rizwan", "Reservation submitted from the prosumer app."],
          [36, "Approved", "Amaya Fernando", "Approved by the Backoffice Officer."],
          [30, "Scheduled", "Nimal Perera", "Grid Operator confirmed the schedule."],
          [28, "QR issued", "QR service", "A single-use token was issued."],
          [2, "QR verified", "Nimal Perera", "Token checked. The physical transfer has not been finalised."],
        ]),
      },
      {
        id: "rs-2406",
        code: "RS-2406",
        prosumerId: "p-nuwan",
        stationId: "st-gal",
        slotId: "sl-gal-1",
        start: at(-1, 9),
        end: at(-1, 10),
        status: "Completed",
        serviceType: "Drop-off",
        energyKwh: 16,
        history: history([
          [50, "Requested", "Nuwan Bandara", "Reservation submitted from the prosumer app."],
          [46, "Approved", "Amaya Fernando", "Approved by the Backoffice Officer."],
          [44, "Scheduled", "Nimal Perera", "Grid Operator confirmed the schedule."],
          [40, "QR issued", "QR service", "A single-use token was issued."],
          [26, "QR verified", "Nimal Perera", "Token checked at the station."],
          [25, "Completed", "Nimal Perera", "Energy transfer finalised. The token is now used."],
        ]),
      },
      {
        id: "rs-2407",
        code: "RS-2407",
        prosumerId: "p-nuwan",
        stationId: "st-cmb",
        slotId: "sl-cmb-1",
        start: at(1, 9),
        end: at(1, 10),
        status: "Cancelled",
        serviceType: "Charging",
        energyKwh: 10,
        history: history([
          [18, "Requested", "Nuwan Bandara", "Reservation submitted from the prosumer app."],
          [16, "Cancelled", "Nuwan Bandara", "Cancelled with more than 12 hours' notice. The capacity hold was released."],
        ]),
      },
      {
        id: "rs-2408",
        code: "RS-2408",
        prosumerId: "p-fathima",
        stationId: "st-gal",
        slotId: "sl-gal-2",
        start: at(3, 8, 30),
        end: at(3, 9, 30),
        status: "Rejected",
        serviceType: "Drop-off",
        energyKwh: 14,
        history: history([
          [22, "Requested", "Fathima Rizwan", "Reservation submitted from the prosumer app."],
          [20, "Rejected", "Amaya Fernando", "Rejected because the requested energy exceeded the slot plan for that window."],
        ]),
      },
      {
        id: "rs-2409",
        code: "RS-2409",
        prosumerId: "p-ishara",
        stationId: "st-cmb",
        slotId: "sl-cmb-4",
        start: laterStart,
        end: laterEnd,
        status: "Scheduled",
        serviceType: "Charging",
        energyKwh: 11,
        history: history([
          [12, "Requested", "Ishara Jayawardena", "Reservation submitted from the prosumer app."],
          [11, "Approved", "Amaya Fernando", "Approved by the Backoffice Officer."],
          [10, "Scheduled", "Nimal Perera", "Grid Operator confirmed the schedule."],
          [9, "QR issued", "QR service", "A single-use token was issued."],
        ]),
      },
    ],
    transactions: [
      { id: "tx-2403", code: "TX-2403", reservationId: "rs-2403", tokenStatus: "AwaitingQR", updatedAt: ago(26) },
      { id: "tx-2404", code: "TX-2404", reservationId: "rs-2404", tokenStatus: "Issued", updatedAt: ago(6) },
      { id: "tx-2405", code: "TX-2405", reservationId: "rs-2405", tokenStatus: "Verified", updatedAt: ago(2) },
      { id: "tx-2406", code: "TX-2406", reservationId: "rs-2406", tokenStatus: "Used", updatedAt: ago(25) },
      { id: "tx-2409", code: "TX-2409", reservationId: "rs-2409", tokenStatus: "Issued", updatedAt: ago(9) },
    ],
  };
}

export { DATA_VERSION };
