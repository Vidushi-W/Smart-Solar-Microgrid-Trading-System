/**
 * Prosumer reservation history. The table is GET /api/reservations/my.
 * Opening a row loads that reservation again and shows the returned record.
 */
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { fetchMyReservations, fetchReservation, listStationsForReservations } from "../../services/apiClient";
import { stationTitle, utcDateLabel, utcTimeLabel } from "./reservationTime";

function when(iso) {
  if (!iso) return "";
  return `${utcDateLabel(iso)} · ${utcTimeLabel(iso)} UTC`;
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
            {detailLoading ? <p className="reserve-status">Loading reservation</p> : null}
            {detailError ? <p className="reserve-alert">{detailError}</p> : null}
            {detail ? (
              <dl className="reserve-summary">
                <dt>Reservation ID</dt>
                <dd className="reserve-code">{detail.reservationId}</dd>
                <dt>Station</dt>
                <dd>{stationName}</dd>
                <dt>Date</dt>
                <dd>{utcDateLabel(detail.scheduledAtUtc)}</dd>
                <dt>Time</dt>
                <dd>{utcTimeLabel(detail.scheduledAtUtc)} UTC</dd>
                <dt>Status</dt>
                <dd><StatusBadge value={detail.status} /></dd>
                <dt>Slot</dt>
                <dd className="reserve-code">{detail.slotId}</dd>
                <dt>Created</dt>
                <dd>{when(detail.createdAtUtc)}</dd>
                <dt>Updated</dt>
                <dd>{when(detail.updatedAtUtc)}</dd>
              </dl>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
