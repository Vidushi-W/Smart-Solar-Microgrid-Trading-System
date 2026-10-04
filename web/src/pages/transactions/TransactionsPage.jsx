/**
 * QR transfer list read from the browser session, not from the transfer API.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import DataTable from "../../components/tables/DataTable";
import { useData } from "../../context/DataContext";
import { formatDateTime } from "../../utils/format";

const TOKEN_STATUSES = ["All", "AwaitingQR", "Issued", "Verified", "Used"];

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { transactions, reservations, prosumers } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

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
        onRowClick={(row) => navigate(`/transactions/${row.id}`)}
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
    </div>
  );
}
