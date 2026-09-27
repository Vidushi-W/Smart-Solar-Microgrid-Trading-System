import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import DataTable from "../../components/tables/DataTable";
import { useData } from "../../context/DataContext";
import { formatTimeRange, toDateInputValue } from "../../utils/format";
import { isApprovedFuture } from "../../utils/reservationRules";

const STATUSES = ["All", "Requested", "Approved", "Scheduled", "Completed", "Cancelled", "Rejected"];

export default function ReservationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { reservations, prosumers, stations } = useData();
  const status = searchParams.get("status") || "All";
  const stationId = searchParams.get("station") || "All";
  const query = searchParams.get("q") || "";
  const date = searchParams.get("date") || "";

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "All") next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  }

  const rows = useMemo(() => {
    return reservations
      .filter((item) => {
        const prosumer = prosumers.find((person) => person.id === item.prosumerId);
        const station = stations.find((place) => place.id === item.stationId);
        const hay = `${item.code} ${prosumer?.name || ""} ${prosumer?.nic || ""} ${station?.name || ""}`.toLowerCase();
        if (query && !hay.includes(query.toLowerCase())) return false;
        if (stationId !== "All" && item.stationId !== stationId) return false;
        if (date && toDateInputValue(item.start) !== date) return false;
        if (status === "ApprovedFuture") return isApprovedFuture(item);
        if (status === "DueSoon") {
          const lead = (new Date(item.start) - new Date()) / 36e5;
          return ["Requested", "Approved", "Scheduled"].includes(item.status) && lead > 0 && lead < 12;
        }
        if (status !== "All" && item.status !== status) return false;
        return true;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [reservations, prosumers, stations, query, stationId, date, status]);

  return (
    <div className="page">
      <section className="filter-card">
        <header className="panel-head">
          <h2>Search and filters</h2>
          <button type="button" className="btn ghost" onClick={() => setSearchParams({})}>
            Clear
          </button>
        </header>
        <div className="filter-grid">
        <label>
          Search
          <input
            type="search"
            placeholder="Code, prosumer, NIC, station"
            value={query}
            onChange={(event) => setParam("q", event.target.value)}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setParam("status", event.target.value)}>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value="ApprovedFuture">Approved future</option>
            <option value="DueSoon">Starts within 12 hours</option>
          </select>
        </label>
        <label>
          Station
          <select value={stationId} onChange={(event) => setParam("station", event.target.value)}>
            <option value="All">All stations</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(event) => setParam("date", event.target.value)} />
        </label>
        </div>
      </section>
      <DataTable
        rowKey={(row) => row.id}
        rows={rows}
        onRowClick={(row) => navigate(`/reservations/${row.id}`)}
        emptyTitle="No reservations match"
        emptyText="Clear one of the filters to widen the list."
        columns={[
          { key: "code", label: "Code" },
          {
            key: "prosumer",
            label: "Prosumer",
            render: (row) => prosumers.find((person) => person.id === row.prosumerId)?.name,
          },
          {
            key: "station",
            label: "Station",
            render: (row) => stations.find((place) => place.id === row.stationId)?.name,
          },
          {
            key: "when",
            label: "Start",
            render: (row) => formatTimeRange(row.start, row.end),
          },
          { key: "service", label: "Service", render: (row) => row.serviceType },
          {
            key: "status",
            label: "Status",
            render: (row) => <StatusBadge value={row.status} />,
          },
        ]}
      />
    </div>
  );
}
