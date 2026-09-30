import { useEffect, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import DataTable from "../../components/tables/DataTable";
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
    <div className="page">
      {canManage ? (
        <form className="filter-card" onSubmit={submit}>
          <h2>{editingId ? "Edit slot" : "New slot"}</h2>
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

      <section className="filter-card">
        <header className="panel-head">
          <h2>Search and filters</h2>
        </header>
        <div className="filter-grid">
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
      </section>
      <DataTable
        rowKey={(row) => row.id}
        rows={rows}
        emptyTitle="No slots"
        columns={[
          { key: "station", label: "Station", render: (row) => row.stationName },
          { key: "label", label: "Slot" },
          { key: "when", label: "Window", render: (row) => formatTimeRange(row.start, row.end) },
          { key: "capacity", label: "Booked", render: (row) => `${row.holdingCount} / ${row.capacity}` },
          {
            key: "window",
            label: "7-day window",
            render: (row) => (isInsideSevenDayWindow(row.start) ? "Inside" : "Outside"),
          },
          { key: "open", label: "Status", render: (row) => <StatusBadge value={row.isOpen ? "Open" : "Closed"} /> },
          ...(canManage
            ? [{ key: "edit", label: "Edit", render: (row) => <button type="button" className="btn ghost" onClick={() => edit(row)}>Edit</button> }]
            : []),
          ...(canToggle
            ? [{
              key: "action",
              label: "Action",
              render: (row) => (
                <button type="button" className="btn ghost" onClick={() => toggle(row)}>
                  {row.isOpen ? "Close" : "Open"}
                </button>
              ),
            }]
            : []),
        ]}
      />
    </div>
  );
}
