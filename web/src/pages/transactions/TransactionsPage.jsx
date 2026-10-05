/**
 * QR transfer list read from the browser session, not from the transfer API.
 * A row opens a detail popup instead of leaving the list.
 */
import { useMemo, useState } from "react";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import DataTable from "../../components/tables/DataTable";
import { useData } from "../../context/DataContext";
import { formatDateTime, formatTimeRange } from "../../utils/format";

const TOKEN_STATUSES = ["All", "AwaitingQR", "Issued", "Verified", "Used"];

function transferDetails(row, { reservations, prosumers, stations }) {
  const reservation = reservations.find((item) => item.id === row.reservationId);
  const prosumer = prosumers.find((person) => person.id === reservation?.prosumerId);
  const station = stations.find((item) => item.id === reservation?.stationId);
  return { reservation, prosumer, station };
}

export default function TransactionsPage() {
  const { transactions, reservations, prosumers, stations } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState(null);

  const rows = useMemo(() => {
    return [...transactions]
      .filter((item) => {
        const reservation = reservations.find((row) => row.id === item.reservationId);
        const prosumer = prosumers.find((person) => person.id === reservation?.prosumerId);
        const hay = `${item.code} ${reservation?.code || ""} ${prosumer?.name || ""}`.toLowerCase();
        if (query && !hay.includes(query.toLowerCase())) return false;
        if (status !== "All" && item.tokenStatus !== status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [transactions, reservations, prosumers, query, status]);

  const selected = transactions.find((item) => item.id === selectedId) || null;
  const selectedDetails = selected ? transferDetails(selected, { reservations, prosumers, stations }) : null;

  return (
    <div className="page">
      <section className="filter-card">
        <header className="panel-head">
          <h2>Search and filters</h2>
        </header>
        <div className="filter-grid">
          <label>
            Token, reservation, or prosumer
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
          </label>
          <label>
            Token status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {TOKEN_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "AwaitingQR" ? "Awaiting QR" : item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <DataTable
        rowKey={(row) => row.id}
        rows={rows}
        onRowClick={(row) => setSelectedId(row.id)}
        emptyTitle="No transfers match"
        columns={[
          { key: "code", label: "Token" },
          {
            key: "reservation",
            label: "Reservation",
            render: (row) => reservations.find((item) => item.id === row.reservationId)?.code,
          },
          {
            key: "prosumer",
            label: "Prosumer",
            render: (row) => {
              const reservation = reservations.find((item) => item.id === row.reservationId);
              return prosumers.find((person) => person.id === reservation?.prosumerId)?.name;
            },
          },
          { key: "token", label: "Token", render: (row) => <StatusBadge value={row.tokenStatus} /> },
          {
            key: "reservationStatus",
            label: "Reservation",
            render: (row) => {
              const reservation = reservations.find((item) => item.id === row.reservationId);
              return reservation ? <StatusBadge value={reservation.status} /> : null;
            },
          },
          { key: "updated", label: "Updated", render: (row) => formatDateTime(row.updatedAt) },
        ]}
      />
      {selected && selectedDetails ? (
        <Modal title={selected.code} wide onClose={() => setSelectedId(null)}>
          <div className="transfer-dialog">
            <p className="transfer-updated">Updated {formatDateTime(selected.updatedAt)}</p>
            <section>
              <h3>Token</h3>
              <dl>
                <div><dt>Code</dt><dd>{selected.code}</dd></div>
                <div><dt>Status</dt><dd><StatusBadge value={selected.tokenStatus} /></dd></div>
              </dl>
            </section>
            <section>
              <h3>Reservation</h3>
              <dl>
                <div><dt>Code</dt><dd>{selectedDetails.reservation?.code || "—"}</dd></div>
                <div><dt>Status</dt><dd>{selectedDetails.reservation ? <StatusBadge value={selectedDetails.reservation.status} /> : "—"}</dd></div>
                <div><dt>Prosumer</dt><dd>{selectedDetails.prosumer?.name || "—"}</dd></div>
                <div><dt>Station</dt><dd>{selectedDetails.station?.name || "—"}</dd></div>
                <div><dt>Window</dt><dd>{selectedDetails.reservation ? formatTimeRange(selectedDetails.reservation.start, selectedDetails.reservation.end) : "—"}</dd></div>
                <div><dt>Service</dt><dd>{selectedDetails.reservation?.serviceType || "—"}</dd></div>
                <div><dt>Energy</dt><dd>{selectedDetails.reservation ? `${selectedDetails.reservation.energyKwh} kWh` : "—"}</dd></div>
              </dl>
            </section>
            <div className="modal-actions">
              <button type="button" className="btn primary" onClick={() => setSelectedId(null)}>Close</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
