/**
 * Station list from the station API. Backoffice and Grid Operator can add a station. Only a Grid Operator can edit or deactivate one. Prosumers can view stations and open their slots to book.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { stationsApi } from "../../services/apiClient";
import StationForm from "./StationForm";

export default function StationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.role === "Backoffice" || user?.role === "GridOperator";
  const canChange = user?.role === "GridOperator";
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [formStation, setFormStation] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const loadStations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await stationsApi.list();
      setStations(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setError(loadError.message || "Could not load stations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStations(); }, [loadStations]);

  const rows = useMemo(() => stations.filter((station) => {
    const matchesText = `${station.name} ${station.stationId}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (status === "All" || station.status === status);
  }), [stations, query, status]);

  // Update an existing station, or create one when the dialog was opened for a new station, then reload the list.
  async function saveStation(payload) {
    setSaving(true);
    setError("");
    try {
      if (formStation) await stationsApi.update(formStation.stationId, payload);
      else await stationsApi.create(payload);
      setFormOpen(false);
      setFormStation(null);
      setNotice(formStation ? "Station details updated." : "Station added.");
      await loadStations();
    } finally {
      setSaving(false);
    }
  }

  // Deactivate through the station API. A failure that mentions active reservations is rewritten into a plain message.
  async function deactivateStation() {
    if (!deactivateTarget) return;
    setSaving(true);
    setError("");
    try {
      await stationsApi.deactivate(deactivateTarget.stationId);
      setNotice(`${deactivateTarget.name} was deactivated.`);
      setDeactivateTarget(null);
      await loadStations();
    } catch (deactivateError) {
      const friendly = deactivateError.message?.toLowerCase().includes("this station has active reservations")
        ? "This station still has active reservations. Resolve those reservations before deactivating it."
        : deactivateError.message || "Could not deactivate this station.";
      setError(friendly);
      setDeactivateTarget(null);
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setFormStation(null);
    setFormOpen(true);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Stations"
        title="Solar stations"
        description="Stations saved by the station API. A prosumer books a reservation against one of these stations."
        actions={canCreate ? <button type="button" className="btn primary" onClick={openAdd}>Add station</button> : null}
      />

      {error ? <div className="banner warn" role="alert"><p>{error}</p><button type="button" onClick={() => setError("")}>Dismiss</button></div> : null}
      {notice ? <div className="banner ok" role="status"><p>{notice}</p><button type="button" onClick={() => setNotice("")}>Dismiss</button></div> : null}

      <section className="filter-card station-filters">
        <header className="panel-head"><h2>Stations</h2><span className="hint">{rows.length} shown</span></header>
        <div className="filter-grid">
          <label>
            Search
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Station name or ID" />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </label>
          <div className="station-refresh"><button type="button" className="btn ghost" onClick={loadStations} disabled={loading}>Refresh</button></div>
        </div>
      </section>

      {loading ? <div className="panel"><p className="hint">Loading stations…</p></div> : error && stations.length === 0 ? null : rows.length === 0 ? (
        <EmptyState title="No stations found" text={query || status !== "All" ? "Change the search or status filter." : "Add a station to start managing this network."} />
      ) : (
        <div className="table-wrap">
          <table className="station-table">
            <thead><tr><th>Name</th><th>Location</th><th>Capacity</th><th>Battery slots</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((station) => (
                <tr key={station.stationId}>
                  <td><strong>{station.name}</strong><small className="table-subtitle">{station.stationId}</small></td>
                  <td>{Number(station.latitude).toFixed(4)}, {Number(station.longitude).toFixed(4)}</td>
                  <td>{station.capacityKwh} kWh</td>
                  <td>{station.availableBatterySlots} available / {station.totalBatterySlots}</td>
                  <td><StatusBadge value={station.status} /></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn ghost" onClick={() => navigate(`/stations/${encodeURIComponent(station.stationId)}/slots`)}>View slots</button>
                      {canChange ? <button type="button" className="btn ghost" onClick={() => { setFormStation(station); setFormOpen(true); }}>Edit</button> : null}
                      {canChange && station.status === "Active" ? <button type="button" className="btn danger" onClick={() => setDeactivateTarget(station)}>Deactivate</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen ? (
        <StationForm
          station={formStation}
          saving={saving}
          onClose={() => { if (!saving) { setFormOpen(false); setFormStation(null); } }}
          onSave={saveStation}
        />
      ) : null}

      {deactivateTarget ? (
        <Modal title="Deactivate station?" onClose={() => { if (!saving) setDeactivateTarget(null); }}>
          <div className="confirm-copy">
            <p>Deactivate <strong>{deactivateTarget.name}</strong>?</p>
            <p className="hint">The station will no longer be available for new energy slots.</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setDeactivateTarget(null)} disabled={saving}>Cancel</button>
            <button type="button" className="btn danger" onClick={deactivateStation} disabled={saving}>{saving ? "Deactivating…" : "Deactivate station"}</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
