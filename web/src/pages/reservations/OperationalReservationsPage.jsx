/**
 * Reservation search. Station names come from catalogApi. Reservation rows come from reservationsApi.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { fetchStations } from "../../services/catalogApi";
import {
  fetchReservationDashboard,
  fetchReservations,
  postReservationAction,
} from "../../services/reservationsApi";

const STATUSES = ["All", "Requested", "Approved", "Scheduled", "Completed", "Cancelled", "Rejected"];
const AVATAR_TONES = ["peach", "blue", "amber", "green"];

function initials(name) {
  return (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function windowLabel(iso) {
  const start = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const sameDay = (left, right) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
  const time = new Intl.DateTimeFormat("en-LK", { hour: "2-digit", minute: "2-digit" }).format(start);
  if (sameDay(start, now)) return `Today, ${time}`;
  if (sameDay(start, tomorrow)) return `Tomorrow, ${time}`;
  const day = new Intl.DateTimeFormat("en-LK", { month: "short", day: "numeric" }).format(start);
  return `${day}, ${time}`;
}

// If cancel or modify is blocked for the 12-hour rule, show that lock instead of the service type.
function noticeFrom(row) {
  const blocks = row.actionBlocks || {};
  const text = `${blocks.cancel || ""} ${blocks.modify || ""}`;
  if (text.includes("12 hours")) return { text: "12h notice · Locked", tone: "locked" };
  return { text: row.serviceType, tone: "open" };
}

export default function OperationalReservationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("ledger");
  const [rows, setRows] = useState([]);
  const [stations, setStations] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approvedFuture: 0, dueSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const status = searchParams.get("status") || "All";
  const stationId = searchParams.get("station") || "All";
  const query = searchParams.get("q") || "";
  const date = searchParams.get("date") || "";
  const canBook = user.role === "Prosumer";
  const requestStatus = tab === "pending" ? "Requested" : status;

  // Drop All and an empty value from the query string instead of storing them.
  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "All") next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  }

  // The pending tab always asks for Requested, even when the status query says something else.
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, dashboard, stationRows] = await Promise.all([
        fetchReservations(user, { status: requestStatus, stationId, q: query, date }),
        fetchReservationDashboard(user),
        fetchStations(user),
      ]);
      setRows(list);
      setCounts(dashboard);
      setStations(stationRows);
    } catch (err) {
      setRows([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id, requestStatus, stationId, query, date]);

  async function run(row, action, body) {
    setBusyId(row.id);
    setError("");
    try {
      await postReservationAction(user, row.id, action, body);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  // Show only actions the row allows. Reject sends the fixed reason used by this desk.
  function actionsFor(row) {
    const allowed = row.allowedActions || [];
    const buttons = [];
    if (allowed.includes("approve")) {
      buttons.push(
        <button key="approve" type="button" className="desk-action dark" disabled={busyId === row.id} onClick={() => run(row, "approve")}>
          Approve
        </button>
      );
    }
    if (allowed.includes("reject")) {
      buttons.push(
        <button
          key="reject"
          type="button"
          className="desk-action"
          disabled={busyId === row.id}
          onClick={() => run(row, "reject", { reason: "Rejected from the reservations desk." })}
        >
          Reject
        </button>
      );
    }
    if (allowed.includes("cancel")) {
      buttons.push(
        <button key="cancel" type="button" className="desk-action" disabled={busyId === row.id} onClick={() => run(row, "cancel")}>
          Cancel
        </button>
      );
    }
    if (allowed.includes("schedule")) {
      buttons.push(
        <button key="schedule" type="button" className="desk-action dark" disabled={busyId === row.id} onClick={() => run(row, "schedule")}>
          Schedule
        </button>
      );
    }
    if (buttons.length === 0 && noticeFrom(row).tone === "locked") {
      return <span className="desk-lock">12h locked</span>;
    }
    return buttons;
  }

  const activeStations = stations.filter((station) => station.status === "Active").length;

  return (
    <div className="desk">
      <header className="desk-head">
        <div>
          <h2>
            Reservations Desk <span>Member 3 capacity engine</span>
          </h2>
        </div>
        {canBook ? (
          <button type="button" className="desk-reserve" onClick={() => navigate("/operational-reservations/new")}>
            + Reserve slot
          </button>
        ) : null}
      </header>

      <section className="desk-stats">
        <article>
          <p>Approved future</p>
          <strong>{counts.approvedFuture}</strong>
          <span className="desk-pill green">From the API</span>
          <em>Approved or scheduled, still ahead</em>
        </article>
        <article>
          <p>Pending approval</p>
          <strong>{counts.pending}</strong>
          <span className="desk-pill amber">Awaiting backoffice</span>
          <em>QR is created only after approval</em>
        </article>
        <article>
          <p>Due within 12 hours</p>
          <strong>{counts.dueSoon}</strong>
          <span className="desk-pill green">12h notice</span>
          <em>Counted by the reservation API</em>
        </article>
        <article>
          <p>Connected stations</p>
          <strong>{activeStations}</strong>
          <span className="desk-pill slate">Active nodes</span>
          <em>Stations stored for booking</em>
        </article>
      </section>

      <div className="desk-sync">
        <p>
          <i />
          Station and slot catalog
          <span>This list is loaded from MongoDB.</span>
        </p>
        <em>Approval hands the QR step to the transfer flow</em>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="desk-tabs" role="tablist">
        <button type="button" className={tab === "ledger" ? "on" : ""} onClick={() => setTab("ledger")}>
          Reservations
        </button>
        <button type="button" className={tab === "pending" ? "on" : ""} onClick={() => setTab("pending")}>
          Pending approval
        </button>
      </div>

      <div className="desk-filters">
        <input
          type="search"
          placeholder="Search reservation or prosumer"
          value={query}
          onChange={(event) => setParam("q", event.target.value)}
          aria-label="Search reservations"
        />
        <select value={status} onChange={(event) => setParam("status", event.target.value)} aria-label="Filter by status">
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {item === "All" ? "All statuses" : item}
            </option>
          ))}
          <option value="ApprovedFuture">Approved future</option>
          <option value="DueSoon">Starts within 12 hours</option>
        </select>
        <select value={stationId} onChange={(event) => setParam("station", event.target.value)} aria-label="Filter by station">
          <option value="All">All stations</option>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name}
            </option>
          ))}
        </select>
        <span className="desk-count">{loading ? "Loading" : `${rows.length} reservations`}</span>
      </div>

      <div className="table-wrap desk-table">
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Prosumer</th>
              <th>Station and slot</th>
              <th>Window</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="sheet-empty">
                  {loading ? "Loading reservations." : "No reservations are stored for this filter."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const notice = noticeFrom(row);
                const tone = AVATAR_TONES[(row.prosumerName || "").length % AVATAR_TONES.length];
                return (
                  <tr key={row.id}>
                    <td className="desk-ref"><button type="button" className="desk-action" onClick={() => navigate(`/operational-reservations/${encodeURIComponent(row.id)}`)}>{row.code}</button></td>
                    <td>
                      <div className="desk-person">
                        <span className={`desk-avatar ${tone}`}>{initials(row.prosumerName)}</span>
                        <span>
                          <strong>{row.prosumerName}</strong>
                          <em>{row.serviceType}</em>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="desk-place">
                        <strong>{row.stationName}</strong>
                        <em>
                          {row.slotLabel} · {row.energyKwh} kWh
                        </em>
                      </div>
                    </td>
                    <td>
                      <div className="desk-when">
                        <strong>{windowLabel(row.start)}</strong>
                        <em className={notice.tone}>{notice.text}</em>
                      </div>
                    </td>
                    <td>
                      <StatusBadge value={row.status} />
                    </td>
                    <td>
                      <div className="desk-actions">{actionsFor(row)}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="desk-foot">{loading ? "Loading reservations" : `Showing ${rows.length} reservations from MongoDB`}</p>
    </div>
  );
}
