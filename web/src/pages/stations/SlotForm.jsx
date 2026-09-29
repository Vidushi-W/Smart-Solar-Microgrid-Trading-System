import { useState } from "react";
import Modal from "../../components/common/Modal";

export default function SlotForm({ slot, selectedDate, saving, onClose, onSave }) {
  const [date, setDate] = useState(slot?.date || selectedDate);
  const [startTime, setStartTime] = useState(slot?.startTime || "09:00");
  const [endTime, setEndTime] = useState(slot?.endTime || "10:00");
  const [totalCapacity, setTotalCapacity] = useState(slot?.totalCapacity ?? "");
  const [remainingCapacity, setRemainingCapacity] = useState(slot?.remainingCapacity ?? "");
  const [status, setStatus] = useState(slot?.status || "Open");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (startTime >= endTime) {
      setError("End time must be later than start time.");
      return;
    }
    if (Number(remainingCapacity) > Number(totalCapacity)) {
      setError("Remaining capacity cannot exceed total capacity.");
      return;
    }
    try {
      const payload = {
        date,
        startTime,
        endTime,
        totalCapacity: Number(totalCapacity),
        remainingCapacity: Number(remainingCapacity),
      };
      if (slot) payload.status = status;
      await onSave(payload);
    } catch (saveError) {
      setError(saveError.message || "Could not save this slot.");
    }
  }

  return (
    <Modal title={slot ? "Edit energy slot" : "Add energy slot"} onClose={onClose} wide>
      <form className="station-form" onSubmit={submit}>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <div className="station-form-grid">
          <label>
            Date
            <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            Total capacity
            <input type="number" required min="1" step="1" value={totalCapacity} onChange={(event) => setTotalCapacity(event.target.value)} />
          </label>
          <label>
            Start time
            <input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label>
            End time
            <input type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
          <label>
            Remaining capacity
            <input type="number" required min="0" max={totalCapacity || undefined} step="1" value={remainingCapacity} onChange={(event) => setRemainingCapacity(event.target.value)} />
          </label>
          {slot ? <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="Open">Open</option>
              <option value="Full">Full</option>
              <option value="Closed">Closed</option>
            </select>
          </label> : null}
        </div>
        <p className="hint">Availability status is confirmed by the backend from the remaining capacity.</p>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? "Saving…" : slot ? "Save changes" : "Add slot"}</button>
        </div>
      </form>
    </Modal>
  );
}
