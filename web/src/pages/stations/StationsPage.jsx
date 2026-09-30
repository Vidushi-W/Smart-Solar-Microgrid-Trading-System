<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchNearbyStations, fetchStations, saveStation, setStationStatus } from "../../services/catalogApi";
import { formatCoord } from "../../utils/format";

const EMPTY = {
  code: "",
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  capacityKwh: "",
  batterySlots: "",
  hours: "06:00–18:00",
};

export default function StationsPage() {
  const { user } = useAuth();
  const canManage = user.role === "Backoffice";
  const [stations, setStations] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [nearby, setNearby] = useState([]);
  const [origin, setOrigin] = useState({ latitude: "6.9344", longitude: "79.8428", radiusKm: "30" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setStations(await fetchStations(user));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id]);
=======
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
  const canManage = user?.role === "Backoffice";
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
>>>>>>> origin/main

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

  function edit(station) {
    setEditingId(station.id);
    setForm({
      code: station.code,
      name: station.name,
      address: station.address,
      latitude: String(station.latitude),
      longitude: String(station.longitude),
      capacityKwh: String(station.capacityKwh),
      batterySlots: String(station.batterySlots),
      hours: station.hours || "",
    });
    setError("");
    setNotice("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await saveStation(user, editingId, {
        code: form.code,
        name: form.name,
        address: form.address,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        capacityKwh: Number(form.capacityKwh),
        batterySlots: Number(form.batterySlots),
        hours: form.hours,
      });
      setForm(EMPTY);
      setEditingId("");
      setNotice(editingId ? "Station updated." : "Station created.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(station) {
    setError("");
    setNotice("");
    try {
      await setStationStatus(user, station.id, station.status === "Active" ? "Inactive" : "Active");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function searchNearby(event) {
    event.preventDefault();
    setError("");
    try {
      setNearby(await fetchNearbyStations(user, Number(origin.latitude), Number(origin.longitude), Number(origin.radiusKm)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
<<<<<<< HEAD
    <div className="sheet-page">
      <header className="sheet-head">
        <h2>Microgrid stations</h2>
        <p>{loading ? "Loading stations" : `${rows.length} stations`}</p>
      </header>

      {canManage ? (
        <form className="filter-card" onSubmit={submit}>
          <h2>{editingId ? "Edit station" : "New station"}</h2>
          <div className="filter-grid">
            <label>
              Code
              <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
            </label>
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              Address
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required />
            </label>
            <label>
              Hours
              <input value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} />
            </label>
            <label>
              Latitude
              <input value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} inputMode="decimal" required />
            </label>
            <label>
              Longitude
              <input value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} inputMode="decimal" required />
            </label>
            <label>
              Storage kWh
              <input value={form.capacityKwh} onChange={(event) => setForm({ ...form, capacityKwh: event.target.value })} inputMode="decimal" required />
            </label>
            <label>
              Battery slots
              <input value={form.batterySlots} onChange={(event) => setForm({ ...form, batterySlots: event.target.value })} inputMode="numeric" required />
            </label>
          </div>
          <div className="action-row">
            <button type="submit" className="btn primary">{editingId ? "Save station" : "Create station"}</button>
            {editingId ? (
              <button type="button" className="btn ghost" onClick={() => { setEditingId(""); setForm(EMPTY); }}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="hint">{notice}</p> : null}

      <div className="sheet-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search station or code"
          aria-label="Search stations"
=======
    <div className="page">
      <PageHeader
        eyebrow="Backoffice · stations"
        title="Solar stations"
        description="Manage station locations, capacity and operating schedules."
        actions={canManage ? <button type="button" className="btn primary" onClick={openAdd}>Add station</button> : null}
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
                      {canManage ? <button type="button" className="btn ghost" onClick={() => { setFormStation(station); setFormOpen(true); }}>Edit</button> : null}
                      {canManage ? <button type="button" className="btn ghost" onClick={() => navigate(`/stations/${encodeURIComponent(station.stationId)}/slots`)}>Manage slots</button> : null}
                      {canManage && station.status === "Active" ? <button type="button" className="btn danger" onClick={() => setDeactivateTarget(station)}>Deactivate</button> : null}
                      {!canManage ? <span className="hint">View only</span> : null}
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
>>>>>>> origin/main
        />
      ) : null}

<<<<<<< HEAD
      <div className="table-wrap sheet">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Station</th>
              <th>Address</th>
              <th>Coordinates</th>
              <th>Storage</th>
              <th>Batteries</th>
              <th>Hours</th>
              <th>Holds</th>
              <th>Status</th>
              {canManage ? <th>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 10 : 9} className="sheet-empty">
                  {loading ? "Loading stations." : "No stations match this filter."}
                </td>
              </tr>
            ) : (
              rows.map((station) => {
                const active = station.status === "Active";
                return (
                  <tr key={station.id}>
                    <td className="code-cell">{station.code || "—"}</td>
                    <td className="name-cell">{station.name}</td>
                    <td>{station.address || "—"}</td>
                    <td>
                      {formatCoord(station.latitude)}, {formatCoord(station.longitude)}
                    </td>
                    <td>{station.capacityKwh} kWh</td>
                    <td>{station.batterySlots}</td>
                    <td>{station.hours || "—"}</td>
                    <td>{station.holdingCount}</td>
                    <td>
                      <span className={`status-dot ${active ? "on" : "off"}`} title={station.status} />
                    </td>
                    {canManage ? (
                      <td>
                        <button type="button" className="btn ghost" onClick={() => edit(station)}>Edit</button>
                        <button type="button" className="btn confirm" onClick={() => toggle(station)}>
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

      <form className="filter-card" onSubmit={searchNearby}>
        <h2>Nearby stations</h2>
        <p className="hint">Active stations inside this radius, using the same GPS the map will plot.</p>
        <div className="filter-grid">
          <label>
            Latitude
            <input value={origin.latitude} onChange={(event) => setOrigin({ ...origin, latitude: event.target.value })} required />
          </label>
          <label>
            Longitude
            <input value={origin.longitude} onChange={(event) => setOrigin({ ...origin, longitude: event.target.value })} required />
          </label>
          <label>
            Radius km
            <input value={origin.radiusKm} onChange={(event) => setOrigin({ ...origin, radiusKm: event.target.value })} required />
          </label>
          <button type="submit" className="btn primary">Find nearby</button>
        </div>
        {nearby.length > 0 ? (
          <ul className="contract-items">
            {nearby.map((station) => (
              <li key={station.id}>
                <strong>{station.name}</strong>
                <p>{station.distanceKm} km · {station.address} · {station.batterySlots} battery slots</p>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
=======
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
>>>>>>> origin/main
    </div>
  );
}
