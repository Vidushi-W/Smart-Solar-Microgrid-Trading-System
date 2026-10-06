/**
 * Energy-slot screen for the reservation API on port 5251, using catalogApi rather than stationsApi.
 */
import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { fetchSlots, fetchStations, saveSlot, setSlotOpen } from "../../services/catalogApi";
import { formatTimeRange } from "../../utils/format";
import { isInsideSevenDayWindow } from "../../utils/reservationRules";

const EMPTY = { stationId: "", label: "", start: "", end: "", capacity: "1", isOpen: true };

function toLocalInput(iso) {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function BookingsPage() {
  const { user } = useAuth();
  const canManage = user.role === "Backoffice";
  const canToggle = user.role === "Backoffice" || user.role === "GridOperator";
  const [stations, setStations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stationId, setStationId] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(selectedStation = stationId) {
    setError("");
    const [stationRows, slotRows] = await Promise.all([
      fetchStations(user),
      fetchSlots(user, selectedStation),
    ]);
    setStations(stationRows);
    setSlots(slotRows);
  }

  useEffect(() => {
    load(stationId).catch((err) => setError(err.message));
  }, [user.id, stationId]);

  const rows = slots.filter((slot) => {
    if (availability === "Open") return slot.isOpen;
    if (availability === "Closed") return !slot.isOpen;
    return true;
  });

  const openCount = slots.filter((slot) => slot.isOpen).length;
  const totalCapacity = slots.reduce((sum, slot) => sum + Number(slot.capacity || 0), 0);
  const bookedCount = slots.reduce((sum, slot) => sum + Number(slot.holdingCount || 0), 0);

  function edit(slot) {
    setEditingId(slot.id);
    setForm({
      stationId: slot.stationId,
      label: slot.label,
      start: toLocalInput(slot.start),
      end: toLocalInput(slot.end),
      capacity: String(slot.capacity),
      isOpen: slot.isOpen,
    });
    setError("");
    setNotice("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await saveSlot(user, editingId, {
        stationId: form.stationId,
        label: form.label,
        start: new Date(form.start).toISOString(),
        end: new Date(form.end).toISOString(),
        capacity: Number(form.capacity),
        isOpen: form.isOpen,
      });
      setForm(EMPTY);
      setEditingId("");
      setNotice(editingId ? "Slot updated." : "Slot created.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(slot) {
    setError("");
    setNotice("");
    try {
      await setSlotOpen(user, slot.id, !slot.isOpen);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page slots-overview-page">
      <PageHeader
        eyebrow="Operations · capacity management"
        title="Energy slots"
        description="Shape the daily energy windows that keep local generation and storage moving."
      />
      <section className="slot-hero">
        <div className="slot-hero-copy">
          <span className="hero-kicker">CONNECTED ENERGY MARKETPLACE</span>
          <h2>Energy is moving.</h2>
          <p>Manage the availability windows published by your stations and keep every local hand-off visible.</p>
          <div className="hero-chips"><span>Live station data</span><span>Capacity-aware bookings</span></div>
        </div>
        <div className="slot-orbit" aria-hidden="true"><span className="orbit-ring ring-one" /><span className="orbit-ring ring-two" /><span className="orbit-sun">☼</span><i className="orbit-dot dot-one" /><i className="orbit-dot dot-two" /><i className="orbit-dot dot-three" /></div>
      </section>
      <section className="slot-metrics" aria-label="Energy slot summary">
        <article><span className="slot-metric-icon">◷</span><div><small>VISIBLE WINDOWS</small><strong>{slots.length}</strong><span>across the selected network</span></div></article>
        <article><span className="slot-metric-icon amber">↗</span><div><small>OPEN WINDOWS</small><strong>{openCount}</strong><span>ready for reservations</span></div></article>
        <article><span className="slot-metric-icon green">◒</span><div><small>PUBLISHED CAPACITY</small><strong>{totalCapacity}</strong><span>places across these slots</span></div></article>
        <article><span className="slot-metric-icon purple">◌</span><div><small>HELD CAPACITY</small><strong>{bookedCount}</strong><span>currently reserved</span></div></article>
      </section>
      {canManage ? (
        <form className="filter-card slot-table-card" onSubmit={submit}>
          <div className="panel-head"><h2>{editingId ? "Edit slot" : "New slot"}</h2></div>
          <div className="filter-grid">
            <label>
              Station
              <select value={form.stationId} onChange={(event) => setForm({ ...form, stationId: event.target.value })} required>
                <option value="">Select a station</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>{station.name}</option>
                ))}
              </select>
            </label>
            <label>
              Label
              <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} required />
            </label>
            <label>
              Start
              <input type="datetime-local" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} required />
            </label>
            <label>
              End
              <input type="datetime-local" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} required />
            </label>
            <label>
              Capacity
              <input value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} inputMode="numeric" required />
            </label>
            <label>
              Open
              <select value={form.isOpen ? "yes" : "no"} onChange={(event) => setForm({ ...form, isOpen: event.target.value === "yes" })}>
                <option value="yes">Open</option>
                <option value="no">Closed</option>
              </select>
            </label>
          </div>
          <div className="action-row">
            <button type="submit" className="btn primary">{editingId ? "Save slot" : "Create slot"}</button>
            {editingId ? (
              <button type="button" className="btn ghost" onClick={() => { setEditingId(""); setForm(EMPTY); }}>Cancel</button>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="hint">{notice}</p> : null}

      <section className="filter-card slot-table-card">
        <div className="slots-toolbar">
          <div className="toolbar-heading"><span className="eyebrow">SLOT DIRECTORY</span><h2>Find an energy window</h2><span className="hint">Filter connected capacity by station and availability.</span></div>
          <div className="slots-filters">
          <label>
            Station
            <select value={stationId} onChange={(event) => setStationId(event.target.value)}>
              <option value="All">All stations</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>{station.name}</option>
              ))}
            </select>
          </label>
          <label>
            Availability
            <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
              <option value="All">All slots</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </label>
          </div>
        </div>
      </section>
      {rows.length === 0 ? <section className="slot-table-card empty-slots"><strong>No energy slots found</strong><span>Try another station or availability filter.</span></section> : (
        <section className="slots-board">
          {rows.map((row) => {
            const usage = row.capacity ? Math.min(100, (Number(row.holdingCount || 0) / Number(row.capacity)) * 100) : 0;
            return <article className="slot-card" key={row.id}>
              <div className="slot-card-top"><span className={`service-icon ${row.isOpen ? "" : "charging"}`}>⚡</span><div><span className="slot-card-station">{row.stationName}</span><strong>{row.label}</strong></div><StatusBadge value={row.isOpen ? "Open" : "Closed"} /></div>
              <div className="slot-card-time"><strong>{formatTimeRange(row.start, row.end)}</strong><span>{isInsideSevenDayWindow(row.start) ? "Within window" : "Outside window"}</span></div>
              <div className="slot-card-details"><span>Capacity <b>{row.holdingCount || 0} / {row.capacity}</b></span><span className={row.isOpen ? "within-window" : ""}>{row.isOpen ? "Available to reserve" : "Not accepting reservations"}</span></div>
              <div className="slot-progress"><span style={{ width: `${usage}%` }} /></div>
              {canToggle ? <button type="button" className={`slot-card-action ${row.isOpen ? "" : "reopen"}`} onClick={() => toggle(row)}>{row.isOpen ? "Close window" : "Reopen window"} <span>→</span></button> : <span className="slot-card-view">View capacity details</span>}
              {canManage ? <button type="button" className="slot-card-action" onClick={() => edit(row)}>Edit slot <span>→</span></button> : null}
            </article>;
          })}
        </section>
      )}
    </div>
  );
}
