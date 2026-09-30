import { Link } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatTimeRange } from "../../utils/format";
import { describeLead, summarizeReservations } from "../../utils/reservationRules";

const STATUS_ORDER = ["Requested", "Approved", "Scheduled", "Completed", "Cancelled", "Rejected"];

export default function DashboardPage() {
  const { user } = useAuth();
  const { reservations, prosumers, stations, transactions } = useData();
  const counts = summarizeReservations(reservations);
  const first = user.name.split(" ")[0];
  const pendingPeople = prosumers.filter((person) => person.status === "Pending");
  const activeStations = stations.filter((station) => station.status === "Active").length;
  const waitingQr = transactions.filter((item) =>
    ["AwaitingQR", "Issued", "Verified"].includes(item.tokenStatus)
  ).length;
  const upcoming = [...reservations]
    .filter((item) => (item.status === "Approved" || item.status === "Scheduled") && new Date(item.start) > new Date())
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 5);
  const maxStatus = Math.max(...STATUS_ORDER.map((status) => reservations.filter((item) => item.status === status).length), 1);

  return (
    <div className="page">
      <section className="hero">
        <div>
          <span className="live-pill">All systems operational</span>
          <h2>Welcome back, {first}</h2>
          <p>
            {counts.pending} pending {counts.pending === 1 ? "request" : "requests"} · {counts.approvedFuture} approved future bookings
          </p>
        </div>
        <div className="hero-meter">
          <span>Open QR tokens</span>
          <strong>{waitingQr}</strong>
          <em>{activeStations} stations active</em>
        </div>
      </section>

      <section className="stat-grid">
        <Link className="stat-card" to="/reservations?status=Requested">
          <span className="stat-icon violet">RQ</span>
          <div>
            <span>Pending requests</span>
            <strong>{counts.pending}</strong>
          </div>
        </Link>
        <Link className="stat-card" to="/reservations?status=ApprovedFuture">
          <span className="stat-icon green">AF</span>
          <div>
            <span>Approved future</span>
            <strong>{counts.approvedFuture}</strong>
          </div>
        </Link>
        <Link className="stat-card" to="/reservations?status=DueSoon">
          <span className="stat-icon amber">12h</span>
          <div>
            <span>Due within 12 hours</span>
            <strong>{counts.dueSoon}</strong>
          </div>
        </Link>
        <Link className="stat-card" to="/transactions">
          <span className="stat-icon rose">QR</span>
          <div>
            <span>Open transfers</span>
            <strong>{waitingQr}</strong>
          </div>
        </Link>
      </section>

      <section className="dash-grid">
        <article className="panel">
          <header className="panel-head">
            <h2>Reservation flow</h2>
          </header>
          <div className="bars">
            {STATUS_ORDER.map((status) => {
              const value = reservations.filter((item) => item.status === status).length;
              return (
                <div key={status} className="bar-col">
                  <div
                    className={`bar tone-${status.toLowerCase()}`}
                    style={{ height: `${Math.max(8, (value / maxStatus) * 110)}px` }}
                  />
                  <strong>{value}</strong>
                  <span>{status}</span>
                </div>
              );
            })}
          </div>
        </article>
        <article className="panel">
          <header className="panel-head">
            <h2>{user.role === "Backoffice" ? "Waiting prosumers" : "Open transfers"}</h2>
            <Link to={user.role === "Backoffice" ? "/prosumers" : "/transactions"}>View all</Link>
          </header>
          <ul className="stack-list">
            {user.role === "Backoffice"
              ? pendingPeople.map((person) => (
                  <li key={person.id}>
                    <div>
                      <strong>{person.name}</strong>
                      <p>{person.nic}</p>
                    </div>
                    <StatusBadge value={person.status} />
                  </li>
                ))
              : transactions
                  .filter((item) => ["AwaitingQR", "Issued", "Verified"].includes(item.tokenStatus))
                  .map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.code}</strong>
                        <p>{reservations.find((row) => row.id === item.reservationId)?.code}</p>
                      </div>
                      <StatusBadge value={item.tokenStatus} />
                    </li>
                  ))}
          </ul>
          {user.role === "Backoffice" && pendingPeople.length === 0 ? <p className="hint">No accounts waiting.</p> : null}
        </article>
      </section>

      <article className="panel">
        <header className="panel-head">
          <h2>Upcoming bookings</h2>
          <Link to="/reservations?status=ApprovedFuture">View all</Link>
        </header>
        <ul className="stack-list">
          {upcoming.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.code}</strong>
                <p>{formatTimeRange(item.start, item.end)}</p>
              </div>
              <div className="row-meta">
                <StatusBadge value={item.status} />
                <span>{describeLead(item.start)}</span>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
