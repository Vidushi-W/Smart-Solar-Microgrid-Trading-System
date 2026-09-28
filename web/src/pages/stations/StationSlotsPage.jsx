import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { stationsApi } from "../../services/apiClient";
import SlotForm from "./SlotForm";

function localDateValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function StationSlotsPage() {
  const { stationId } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === "Backoffice";
  const [station, setStation] = useState(null);
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState(localDateValue);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [deletingSlot, setDeletingSlot] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const allStations = await stationsApi.list();
      const found = allStations.find((item) => item.stationId === stationId);
      if (!found) {
        setStation(null);
        setSlots([]);
        setError("Station not found.");
        return;
      }
      setStation(found);
      const daySlots = await stationsApi.slots(stationId, date);
      setSlots(Array.isArray(daySlots) ? daySlots : []);
    } catch (loadError) {
      setError(loadError.message || "Could not load station slots.");
    } finally {
      setLoading(false);
    }
  }, [stationId, date]);

  useEffect(() => { load(); }, [load]);

  async function saveSlot(payload) {
    setSaving(true);
    setError("");
    try {
      if (editingSlot) await stationsApi.updateSlot(editingSlot.slotId, payload);
      else await stationsApi.createSlot(stationId, payload);
      setFormOpen(false);
      setEditingSlot(null);
      setNotice(editingSlot ? "Slot updated." : "Slot added.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot() {
    if (!deletingSlot) return;
    setSaving(true);
    setError("");
    try {
      await stationsApi.deleteSlot(deletingSlot.slotId);
      setDeletingSlot(null);
      setNotice("Slot deleted.");
      await load();
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete this slot.");
      setDeletingSlot(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <Link to="/stations" className="back-link">← Back to stations</Link>
      <PageHeader
        eyebrow="Backoffice · slot manager"
        title={station?.name || "Station slots"}
        description={station ? `Manage date-specific availability for ${station.name}.` : "Load station availability by date."}
        actions={canManage && station?.status === "Active" ? <button type="button" className="btn primary" onClick={() => { setEditingSlot(null); setFormOpen(true); }}>Add slot</button> : null}
      />

      {error ? <div className="banner warn" role="alert"><p>{error}</p><button type="button" onClick={() => setError("")}>Dismiss</button></div> : null}
      {notice ? <div className="banner ok" role="status"><p>{notice}</p><button type="button" onClick={() => setNotice("")}>Dismiss</button></div> : null}

      {station ? (
        <section className="filter-card slot-date-filter">
          <label>
            Schedule date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <span className="hint">{station.availableBatterySlots} of {station.totalBatterySlots} battery slots available</span>
        </section>
      ) : null}

      {loading ? <div className="panel"><p className="hint">Loading slots…</p></div> : !station ? null : slots.length === 0 ? (
        <EmptyState title="No slots for this date" text="Choose another date or add a slot for this station." />
      ) : (
        <div className="table-wrap">
          <table className="slot-table">
            <thead><tr><th>Time</th><th>Total capacity</th><th>Remaining capacity</th><th>Status</th>{canManage ? <th>Actions</th> : null}</tr></thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.slotId}>
                  <td><strong>{slot.startTime}–{slot.endTime}</strong><small className="table-subtitle">{slot.slotId}</small></td>
                  <td>{slot.totalCapacity}</td>
                  <td>{slot.remainingCapacity}</td>
                  <td><StatusBadge value={slot.status} /></td>
                  {canManage ? <td><div className="row-actions">
                    <button type="button" className="btn ghost" onClick={() => { setEditingSlot(slot); setFormOpen(true); }}>Edit</button>
                    <button type="button" className="btn danger" onClick={() => setDeletingSlot(slot)}>Delete</button>
                  </div></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen ? (
        <SlotForm
          slot={editingSlot}
          selectedDate={date}
          saving={saving}
          onClose={() => { if (!saving) { setFormOpen(false); setEditingSlot(null); } }}
          onSave={saveSlot}
        />
      ) : null}

      {deletingSlot ? (
        <Modal title="Delete energy slot?" onClose={() => { if (!saving) setDeletingSlot(null); }}>
          <div className="confirm-copy">
            <p>Delete the <strong>{deletingSlot.startTime}–{deletingSlot.endTime}</strong> slot?</p>
            <p className="hint">The backend will prevent deletion when reservations block it.</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setDeletingSlot(null)} disabled={saving}>Cancel</button>
            <button type="button" className="btn danger" onClick={deleteSlot} disabled={saving}>{saving ? "Deleting…" : "Delete slot"}</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
