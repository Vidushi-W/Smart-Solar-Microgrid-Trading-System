/**
 * Prosumer home filled with sample stations and bookings so the layout can be reviewed.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import { utcDateLabel, utcTimeLabel } from "../reservations/reservationTime";

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

const BOOKINGS = [
  { id: "cmb-1", station: "Colombo Fort Microgrid", scheduledAtUtc: "2026-10-07T08:00:00Z", status: "Pending", createdAtUtc: "2026-10-05T04:10:00Z" },
  { id: "kdy-1", station: "Kandy Lake Station", scheduledAtUtc: "2026-10-08T10:00:00Z", status: "Approved", createdAtUtc: "2026-10-04T06:00:00Z" },
  { id: "cmb-2", station: "Colombo Fort Microgrid", scheduledAtUtc: "2026-10-06T14:00:00Z", status: "Approved", createdAtUtc: "2026-10-04T02:20:00Z" },
  { id: "gal-1", station: "Galle Fort Station", scheduledAtUtc: "2026-10-09T07:00:00Z", status: "Pending", createdAtUtc: "2026-10-05T01:00:00Z" },
  { id: "neg-1", station: "Negombo Lagoon Node", scheduledAtUtc: "2026-10-03T07:00:00Z", status: "Completed", createdAtUtc: "2026-10-01T03:00:00Z" },
  { id: "gal-2", station: "Galle Fort Station", scheduledAtUtc: "2026-10-02T16:00:00Z", status: "Cancelled", createdAtUtc: "2026-09-29T08:40:00Z" },
];

function utcDayStart(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function daysUntil(iso) {
  return Math.round((utcDayStart(new Date(iso)) - utcDayStart(new Date())) / 86400000);
}

function remainingCopy(days) {
  if (days > 1) return { value: String(days), unit: "days remaining" };
  if (days === 1) return { value: "1", unit: "day remaining" };
  if (days === 0) return { value: "Today", unit: "your slot is today" };
  if (days === -1) return { value: "1", unit: "day ago" };
  return { value: String(Math.abs(days)), unit: "days ago" };
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
  const upcoming = BOOKINGS
    .filter((row) => row.status === "Pending" || row.status === "Approved")
    .slice()
    .sort((left, right) => new Date(left.scheduledAtUtc) - new Date(right.scheduledAtUtc));
  const completed = BOOKINGS.filter((row) => row.status === "Completed").length;
  const cancelled = BOOKINGS.filter((row) => row.status === "Cancelled").length;

  const week = useMemo(() => {
    const start = weekStart(new Date());
    return WEEKDAYS.map((label, index) => {
      const day = new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10);
      const value = BOOKINGS.filter((row) => row.scheduledAtUtc.slice(0, 10) === day).length;
      return { label, value };
    });
  }, []);

  const statusParts = ["Pending", "Approved", "Completed", "Cancelled"]
    .map((status) => ({ status, count: BOOKINGS.filter((row) => row.status === status).length }))
    .filter((part) => part.count > 0);
  const statusTotal = statusParts.reduce((sum, part) => sum + part.count, 0);
  let cursor = 0;
  const donut = statusParts.map((part) => {
    const start = cursor;
    cursor += (part.count / statusTotal) * 100;
    return `${STATUS_COLORS[part.status]} ${start}% ${cursor}%`;
  }).join(", ");

  const recent = BOOKINGS.slice().sort((left, right) => new Date(right.createdAtUtc) - new Date(left.createdAtUtc));

  return (
    <div className="prosumer-dash">
      <header className="pd-head">
        <div>
          <p className="eyebrow">Prosumer overview</p>
          <h1>Good day, {name}.</h1>
          <p>Sample stations and bookings, shown on this dashboard only.</p>
        </div>
        <Link className="pd-reserve" to="/reservations/new">Reserve Energy Slot</Link>
      </header>

      <section className="pd-slots" aria-label="Reserved slots">
        {upcoming.map((row, index) => {
          const copy = remainingCopy(daysUntil(row.scheduledAtUtc));
          return (
            <article key={row.id} className="pd-slot">
              <span>{index === 0 ? "Next slot" : "Reserved slot"}</span>
              <strong>{copy.value}</strong>
              <em>{copy.unit}</em>
              <small>
                {row.station}
                {" · "}
                {utcDateLabel(row.scheduledAtUtc)}
                {" · "}
                {utcTimeLabel(row.scheduledAtUtc)} UTC
              </small>
              <StatusBadge value={row.status} />
            </article>
          );
        })}
      </section>

      <section className="pd-metrics" aria-label="Reservation totals">
        <article><span>Upcoming</span><strong>{upcoming.length}</strong><small>Pending and approved</small></article>
        <article><span>Completed</span><strong>{completed}</strong><small>Finished bookings</small></article>
        <article><span>Cancelled</span><strong>{cancelled}</strong><small>Released slots</small></article>
        <article><span>This week</span><strong>{week.reduce((sum, day) => sum + day.value, 0)}</strong><small>Scheduled this week</small></article>
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

      <section className="pd-grid">
        <article className="pd-panel">
          <header>
            <div>
              <h2>This week</h2>
              <p>Sample reservations scheduled on each day.</p>
            </div>
          </header>
          <WeekChart points={week} />
        </article>
        <article className="pd-panel">
          <header>
            <div>
              <h2>By status</h2>
              <p>How the sample bookings are split.</p>
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
            <p>Sample reservations for this dashboard.</p>
          </div>
          <Link to="/reservations">My reservations</Link>
        </header>
        <ul className="pd-activity">
          {recent.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.station}</strong>
                <span>{utcDateLabel(row.scheduledAtUtc)} · {utcTimeLabel(row.scheduledAtUtc)} UTC</span>
              </div>
              <StatusBadge value={row.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
