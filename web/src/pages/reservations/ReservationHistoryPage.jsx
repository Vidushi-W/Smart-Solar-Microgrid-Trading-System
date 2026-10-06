/**
 * Prosumer reservation history. The table is GET /api/reservations/my.
 * Opening a row loads that reservation again and shows the returned record.
 */
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { fetchMyReservations, fetchReservation, listStationsForReservations } from "../../services/apiClient";
import { stationTitle, utcDateLabel, utcTimeLabel } from "./reservationTime";

function stamp(iso) {
  if (!iso) return { date: "—", time: "" };
  return { date: utcDateLabel(iso), time: `${utcTimeLabel(iso)} UTC` };
}

export default function ReservationHistoryPage() {
  const [rows, setRows] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

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
        setError(reason.message || "Could not load reservation history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return undefined;
    let active = true;
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    fetchReservation(selectedId)
      .then((row) => {
        if (active) setDetail(row);
      })
      .catch((reason) => {
        if (active) setDetailError(reason.message || "Could not load this reservation.");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setSelectedId("");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const stationById = useMemo(() => {
    const map = new Map();
    stations.forEach((station) => map.set(station.stationId, station));
    return map;
  }, [stations]);

  const history = rows
    .slice()
    .sort((left, right) => new Date(right.scheduledAtUtc) - new Date(left.scheduledAtUtc));

  function openRow(reservationId) {
    setSelectedId(reservationId);
  }

  const stationName = detail
    ? stationTitle(stationById.get(detail.stationId), detail.stationId)
    : "";
  const created = detail ? stamp(detail.createdAtUtc) : null;
  const updated = detail ? stamp(detail.updatedAtUtc) : null;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Reservations"
        title="Reservation History"
        description="Select a row to open the full reservation."
      />

      {error ? <p className="reserve-alert">{error}</p> : null}
      {loading ? <p className="reserve-status">Loading reservation history</p> : null}

      {!loading && !error ? (
        <section className="account-directory">
          <div className="account-table-heading">
            <strong>Your reservations</strong>
            <span>{history.length}</span>
          </div>
          {history.length === 0 ? (
            <p className="table-empty">No reservations yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="account-table history-table">
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const station = stationTitle(stationById.get(row.stationId), row.stationId);
                    const date = utcDateLabel(row.scheduledAtUtc);
                    const time = `${utcTimeLabel(row.scheduledAtUtc)} UTC`;
                    return (
                    <tr
                      key={row.reservationId}
                      role="button"
                      tabIndex={0}
                      aria-label={`${station}, ${date}, ${time}, ${row.status}`}
                      onClick={() => openRow(row.reservationId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openRow(row.reservationId);
                        }
                      }}
                    >
                      <td>{station}</td>
                      <td>{date}</td>
                      <td>{time}</td>
                      <td><StatusBadge value={row.status} /></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {selectedId ? (
        <div className="confirmation-backdrop" onClick={() => setSelectedId("")}>
          <section
            className="confirmation-dialog history-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-dialog-head">
              <div>
                <p className="eyebrow">Reservation</p>
                <h2 id="history-detail-title">{detail ? stationName : "Reservation details"}</h2>
              </div>
              <button className="btn ghost" type="button" onClick={() => setSelectedId("")}>Close</button>
            </div>
            {detailLoading ? <p className="history-detail-note">Loading reservation</p> : null}
            {detailError ? <p className="reserve-alert history-detail-alert">{detailError}</p> : null}
            {detail ? (
              <div className="history-detail">
                <div className="history-when">
                  <article>
                    <span className="history-kicker">Date</span>
                    <strong>{utcDateLabel(detail.scheduledAtUtc)}</strong>
                  </article>
                  <article>
                    <span className="history-kicker">Time</span>
                    <strong>{utcTimeLabel(detail.scheduledAtUtc)} UTC</strong>
                  </article>
                  <article className="history-when-status">
                    <span className="history-kicker">Status</span>
                    <StatusBadge value={detail.status} />
                  </article>
                </div>

                <p className="history-place">
                  <span className="history-kicker">Station</span>
                  <strong>{stationName}</strong>
                </p>

                <section className="history-refs" aria-label="Reference numbers">
                  <div>
                    <span className="history-kicker">Reservation ID</span>
                    <code>{detail.reservationId}</code>
                  </div>
                  <div>
                    <span className="history-kicker">Slot</span>
                    <code>{detail.slotId}</code>
                  </div>
                </section>

                <div className="history-meta">
                  <div>
                    <span className="history-kicker">Created</span>
                    <strong>{created.date}</strong>
                    <em>{created.time}</em>
                  </div>
                  <div>
                    <span className="history-kicker">Updated</span>
                    <strong>{updated.date}</strong>
                    <em>{updated.time}</em>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
