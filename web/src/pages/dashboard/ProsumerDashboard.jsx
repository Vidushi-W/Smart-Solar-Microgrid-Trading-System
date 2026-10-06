/**
 * Prosumer home. Station cards stay as the sample directory.
 * Reservations come from the API, and a transfer QR opens only when the prosumer asks for it.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import TransferQr from "../../components/reservations/TransferQr";
import { fetchMyReservations, listStationsForReservations } from "../../services/apiClient";
import { stationTitle, utcDateLabel, utcTimeLabel } from "../reservations/reservationTime";

const STATUS_COLORS = {
  Pending: "#f2a246",
  Approved: "#2f9e8f",
  Completed: "#3dbe6e",
  Cancelled: "#c5c1bc",
};
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATIONS = [
  { code: "CMB-01", name: "Colombo Fort Microgrid", address: "4 York Street, Colombo 01", latitude: 6.9344, longitude: 79.8428, capacityKwh: 120, source: "solar + storage", hours: "06:00–18:00", status: "Active" },
  { code: "KDY-01", name: "Kandy Lake Station", address: "4 Lake Road, Kandy", latitude: 7.2906, longitude: 80.6337, capacityKwh: 80, source: "solar", hours: "06:30–17:30", status: "Active" },
  { code: "GAL-01", name: "Galle Fort Station", address: "4 Church Street, Galle Fort", latitude: 6.0266, longitude: 80.217, capacityKwh: 60, source: "solar", hours: "07:00–17:00", status: "Active" },
  { code: "NEG-01", name: "Negombo Lagoon Node", address: "4 Lagoon Road, Negombo", latitude: 7.2083, longitude: 79.8358, capacityKwh: 40, source: "solar", hours: "07:00–16:00", status: "Inactive" },
];

const QR_STATUSES = ["Pending", "Approved"];

function canShowQr(status) {
  return QR_STATUSES.includes(status);
}

function utcDayStart(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function weekStart(now) {
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(utcDayStart(now) + mondayOffset * 86400000);
}

function WeekChart({ points }) {
  const width = 640;
  const height = 220;
  const pad = 28;
  const max = Math.max(1, ...points.map((point) => point.value));
  const coords = points.map((point, index) => {
    const x = pad + (index * (width - pad * 2)) / (points.length - 1);
    const y = height - pad - (point.value / max) * (height - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y], index) => `${index ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${line} L${coords.at(-1)[0]},${height - pad} L${coords[0][0]},${height - pad} Z`;

  return (
    <svg className="pd-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Reservations scheduled this week">
      <defs>
        <linearGradient id="prosumer-week-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3dbe6e" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#3dbe6e" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#prosumer-week-fill)" />
      <path d={line} fill="none" stroke="#1f8f72" strokeWidth="3" strokeLinejoin="round" />
      {coords.map(([x, y], index) => (
        <g key={points[index].label}>
          <circle cx={x} cy={y} r="4.5" fill="#1f8f72" />
          <text x={x} y={height - 8} textAnchor="middle" className="pd-chart-label">{points[index].label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ProsumerDashboard({ name }) {
  const [rows, setRows] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [qrBooking, setQrBooking] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchMyReservations(), listStationsForReservations()])
      .then(([reservations, stationRows]) => {
        if (!active) return;
        setRows(Array.isArray(reservations) ? reservations : []);
        setStations(Array.isArray(stationRows) ? stationRows : []);
      })
      .catch((reason) => {
        if (!active) return;
        setRows([]);
        setError(reason.message || "Could not load your reservations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selected && !qrBooking) return undefined;
    function onKey(event) {
      if (event.key !== "Escape") return;
      if (qrBooking) setQrBooking(null);
      else setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, qrBooking]);

  const stationById = useMemo(() => {
    const map = new Map();
    stations.forEach((station) => map.set(station.stationId, station));
    return map;
  }, [stations]);

  const bookings = useMemo(() => rows.map((row) => ({
    id: row.reservationId,
    reservationId: row.reservationId,
    station: stationTitle(stationById.get(row.stationId), row.stationId),
    slotId: row.slotId,
    scheduledAtUtc: row.scheduledAtUtc,
    status: row.status,
    createdAtUtc: row.createdAtUtc,
    updatedAtUtc: row.updatedAtUtc,
  })), [rows, stationById]);

  const upcoming = bookings
    .filter((row) => row.status === "Pending" || row.status === "Approved")
    .slice()
    .sort((left, right) => new Date(left.scheduledAtUtc) - new Date(right.scheduledAtUtc));
  const completed = bookings.filter((row) => row.status === "Completed").length;
  const cancelled = bookings.filter((row) => row.status === "Cancelled").length;

  const week = useMemo(() => {
    const start = weekStart(new Date());
    return WEEKDAYS.map((label, index) => {
      const day = new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10);
      const value = bookings.filter((row) => String(row.scheduledAtUtc).slice(0, 10) === day).length;
      return { label, value };
    });
  }, [bookings]);

  const statusParts = ["Pending", "Approved", "Completed", "Cancelled"]
    .map((status) => ({ status, count: bookings.filter((row) => row.status === status).length }))
    .filter((part) => part.count > 0);
  const statusTotal = statusParts.reduce((sum, part) => sum + part.count, 0);
  let cursor = 0;
  const donut = statusTotal === 0
    ? "#ece7e2 0% 100%"
    : statusParts.map((part) => {
      const start = cursor;
      cursor += (part.count / statusTotal) * 100;
      return `${STATUS_COLORS[part.status]} ${start}% ${cursor}%`;
    }).join(", ");

  const recent = bookings.slice().sort((left, right) => new Date(right.createdAtUtc) - new Date(left.createdAtUtc));

  return (
    <div className="prosumer-dash">
      <header className="pd-head">
        <div>
          <p className="eyebrow">Prosumer overview</p>
          <h1>Good day, {name}.</h1>
          <p>Select a recent booking to open the full reservation.</p>
        </div>
        <Link className="pd-reserve" to="/reservations/new">Reserve Energy Slot</Link>
      </header>

      {error ? <p className="reserve-alert">{error}</p> : null}
      {loading ? <p className="reserve-status">Loading your reservations</p> : null}

      <section className="pd-metrics" aria-label="Reservation totals">
        <article><span>Upcoming</span><strong>{upcoming.length}</strong><small>Pending and approved</small></article>
        <article><span>Completed</span><strong>{completed}</strong><small>Finished bookings</small></article>
        <article><span>Cancelled</span><strong>{cancelled}</strong><small>Released slots</small></article>
        <article><span>This week</span><strong>{week.reduce((sum, day) => sum + day.value, 0)}</strong><small>Scheduled this week</small></article>
      </section>

      <section className="pd-grid">
        <article className="pd-panel">
          <header>
            <div>
              <h2>This week</h2>
              <p>Reservations scheduled on each day.</p>
            </div>
          </header>
          <WeekChart points={week} />
        </article>
        <article className="pd-panel">
          <header>
            <div>
              <h2>By status</h2>
              <p>How your reservations are split.</p>
            </div>
          </header>
          <div className="pd-status">
            <div className="pd-donut" style={{ background: `conic-gradient(${donut})` }} aria-hidden="true" />
            <ul>
              {statusParts.map((part) => (
                <li key={part.status}>
                  <i style={{ background: STATUS_COLORS[part.status] }} />
                  <span>{part.status}</span>
                  <strong>{Math.round((part.count / statusTotal) * 100)}%</strong>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className="pd-panel">
        <header>
          <div>
            <h2>Recent bookings</h2>
            <p>Station, time, and status. Select a row for the full reservation.</p>
          </div>
          <Link to="/reservations">My reservations</Link>
        </header>
        {!loading && recent.length === 0 ? <p className="pd-muted">No reservations yet.</p> : null}
        {recent.length > 0 ? (
          <div className="table-wrap">
            <table className="account-table history-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>QR</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${row.station}, ${utcDateLabel(row.scheduledAtUtc)}, ${row.status}`}
                    onClick={() => setSelected(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(row);
                      }
                    }}
                  >
                    <td>{row.station}</td>
                    <td>{utcDateLabel(row.scheduledAtUtc)}</td>
                    <td>{utcTimeLabel(row.scheduledAtUtc)} UTC</td>
                    <td><StatusBadge value={row.status} /></td>
                    <td>
                      {canShowQr(row.status) ? (
                        <button
                          type="button"
                          className="pd-qr"
                          onClick={(event) => {
                            event.stopPropagation();
                            setQrBooking(row);
                          }}
                        >
                          Show QR
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="pd-panel">
        <header>
          <div>
            <h2>Station directory</h2>
            <p>Sample network used on this dashboard.</p>
          </div>
        </header>
        <div className="table-wrap">
          <table className="account-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {STATIONS.map((station) => (
                <tr key={station.code}>
                  <td>
                    <strong>{station.name}</strong>
                    <small className="table-subtitle">{station.code}</small>
                  </td>
                  <td>
                    {station.address}
                    <small className="table-subtitle">{station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}</small>
                  </td>
                  <td>
                    {station.capacityKwh} kWh
                    <small className="table-subtitle">{station.source}</small>
                  </td>
                  <td>{station.hours}</td>
                  <td><StatusBadge value={station.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div className="confirmation-backdrop" onClick={() => setSelected(null)}>
          <section
            className="confirmation-dialog history-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-dialog-head">
              <div>
                <p className="eyebrow">Reservation</p>
                <h2 id="dashboard-detail-title">{selected.station}</h2>
              </div>
              <button className="btn ghost" type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="history-detail">
              <div className="history-when">
                <article>
                  <span className="history-kicker">Date</span>
                  <strong>{utcDateLabel(selected.scheduledAtUtc)}</strong>
                </article>
                <article>
                  <span className="history-kicker">Time</span>
                  <strong>{utcTimeLabel(selected.scheduledAtUtc)} UTC</strong>
                </article>
                <article className="history-when-status">
                  <span className="history-kicker">Status</span>
                  <StatusBadge value={selected.status} />
                </article>
              </div>
              <p className="history-place">
                <span className="history-kicker">Station</span>
                <strong>{selected.station}</strong>
              </p>
              <section className="history-refs" aria-label="Reference numbers">
                <div>
                  <span className="history-kicker">Reservation ID</span>
                  <code>{selected.reservationId}</code>
                </div>
                <div>
                  <span className="history-kicker">Slot</span>
                  <code>{selected.slotId}</code>
                </div>
              </section>
              <div className="history-meta">
                <div>
                  <span className="history-kicker">Created</span>
                  <strong>{utcDateLabel(selected.createdAtUtc)}</strong>
                  <em>{utcTimeLabel(selected.createdAtUtc)} UTC</em>
                </div>
                <div>
                  <span className="history-kicker">Updated</span>
                  <strong>{utcDateLabel(selected.updatedAtUtc)}</strong>
                  <em>{utcTimeLabel(selected.updatedAtUtc)} UTC</em>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {qrBooking ? (
        <div className="confirmation-backdrop" onClick={() => setQrBooking(null)}>
          <section
            className="confirmation-dialog history-dialog qr-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-qr-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-dialog-head">
              <div>
                <p className="eyebrow">Transfer QR</p>
                <h2 id="dashboard-qr-title">{qrBooking.station}</h2>
              </div>
              <button className="btn ghost" type="button" onClick={() => setQrBooking(null)}>Close</button>
            </div>
            <div className="history-detail qr-popup">
              <div className="history-when">
                <article>
                  <span className="history-kicker">Date</span>
                  <strong>{utcDateLabel(qrBooking.scheduledAtUtc)}</strong>
                </article>
                <article>
                  <span className="history-kicker">Time</span>
                  <strong>{utcTimeLabel(qrBooking.scheduledAtUtc)} UTC</strong>
                </article>
              </div>
              <TransferQr compact reservationId={qrBooking.reservationId} status={qrBooking.status} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
