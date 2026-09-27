import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatCoord } from "../../utils/format";
import { holdsCapacity } from "../../utils/reservationRules";

export default function StationsPage() {
  const { user } = useAuth();
  const { stations, reservations, setStationStatus } = useData();
  const canManage = user.role === "Backoffice";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const rows = useMemo(() => {
    return stations.filter((station) => {
      const hay = `${station.name} ${station.code} ${station.address}`.toLowerCase();
      if (query && !hay.includes(query.toLowerCase())) return false;
      if (status !== "All" && station.status !== status) return false;
      return true;
    });
  }, [stations, query, status]);

  return (
    <div className="sheet-page">
      <header className="sheet-head">
        <h2>Microgrid stations</h2>
        <p>{rows.length} stations</p>
      </header>

      <div className="sheet-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search station or code"
          aria-label="Search stations"
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
          <option value="All">All status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="table-wrap sheet">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Station</th>
              <th>Address</th>
              <th>Coordinates</th>
              <th>Storage</th>
              <th>Hours</th>
              <th>Holds</th>
              <th>Status</th>
              {canManage ? <th>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 9 : 8} className="sheet-empty">
                  No stations match this filter.
                </td>
              </tr>
            ) : (
              rows.map((station) => {
                const holds = reservations.filter(
                  (item) => item.stationId === station.id && holdsCapacity(item.status)
                ).length;
                const active = station.status === "Active";
                return (
                  <tr key={station.id}>
                    <td className="code-cell">{station.code}</td>
                    <td className="name-cell">{station.name}</td>
                    <td>{station.address}</td>
                    <td>
                      {formatCoord(station.latitude)}, {formatCoord(station.longitude)}
                    </td>
                    <td>{station.capacityKwh} kWh</td>
                    <td>{station.hours}</td>
                    <td>{holds}</td>
                    <td>
                      <span className={`status-dot ${active ? "on" : "off"}`} title={station.status} />
                    </td>
                    {canManage ? (
                      <td>
                        <button
                          type="button"
                          className="btn confirm"
                          onClick={() => setStationStatus(station.id, active ? "Inactive" : "Active")}
                        >
                          {active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="sheet-legend">
        <span>
          <i className="status-dot on" /> Active
        </span>
        <span>
          <i className="status-dot off" /> Inactive
        </span>
      </div>
    </div>
  );
}
