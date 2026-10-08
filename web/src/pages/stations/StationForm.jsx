/**
 * Add or edit a station inside a dialog, including the map location and weekly operating hours.
 */
import { useState } from "react";
import Modal from "../../components/common/Modal";
import LocationPicker from "../../components/stations/LocationPicker";

const WEEKDAYS = [
  ["Monday", "Monday"],
  ["Tuesday", "Tuesday"],
  ["Wednesday", "Wednesday"],
  ["Thursday", "Thursday"],
  ["Friday", "Friday"],
  ["Saturday", "Saturday"],
  ["Sunday", "Sunday"],
];

function initialValues(station) {
  return {
    name: station?.name || "",
    latitude: station?.latitude ?? "",
    longitude: station?.longitude ?? "",
    capacityKwh: station?.capacityKwh ?? "",
    totalBatterySlots: station?.totalBatterySlots ?? "",
    availableBatterySlots: station?.availableBatterySlots ?? "",
    days: station?.operatingSchedule?.days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    openTime: station?.operatingSchedule?.openTime || "06:00",
    closeTime: station?.operatingSchedule?.closeTime || "18:00",
  };
}

export default function StationForm({ station, saving, onClose, onSave }) {
  const [values, setValues] = useState(() => initialValues(station));
  const [error, setError] = useState("");
  const title = station ? "Edit station" : "Add station";

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleDay(day) {
    setValues((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((item) => item !== day)
        : [...current.days, day],
    }));
  }

  // Require one operating day, a close time after open, available slots within the total, and capacity above zero. Saved days stay in Monday-to-Sunday order.
  async function submit(event) {
    event.preventDefault();
    setError("");
    const total = Number(values.totalBatterySlots);
    const available = Number(values.availableBatterySlots);
    if (values.days.length === 0) {
      setError("Select at least one operating day.");
      return;
    }
    if (values.openTime >= values.closeTime) {
      setError("Closing time must be later than opening time.");
      return;
    }
    if (available > total) {
      setError("Available battery slots cannot exceed total battery slots.");
      return;
    }
    if (!(Number(values.capacityKwh) > 0)) {
      setError("Capacity must be greater than zero.");
      return;
    }

    try {
      await onSave({
        name: values.name.trim(),
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        capacityKwh: Number(values.capacityKwh),
        totalBatterySlots: total,
        availableBatterySlots: available,
        operatingSchedule: {
          days: WEEKDAYS.filter(([value]) => values.days.includes(value)).map(([value]) => value),
          openTime: values.openTime,
          closeTime: values.closeTime,
        },
      });
    } catch (saveError) {
      setError(saveError.message || "Could not save this station.");
    }
  }

  return (
    <Modal title={title} onClose={onClose} wide>
      <form className="station-form" onSubmit={submit}>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <div className="station-form-grid">
          <label className="form-span-two">
            Station name
            <input autoFocus required maxLength={200} value={values.name} onChange={(event) => setField("name", event.target.value)} />
          </label>
          <label>
            Latitude
            <input type="number" required min="-90" max="90" step="any" value={values.latitude} onChange={(event) => setField("latitude", event.target.value)} />
          </label>
          <label>
            Longitude
            <input type="number" required min="-180" max="180" step="any" value={values.longitude} onChange={(event) => setField("longitude", event.target.value)} />
          </label>
          <div className="form-span-two">
            <LocationPicker
              latitude={values.latitude}
              longitude={values.longitude}
              onSelect={({ latitude, longitude }) => setValues((current) => ({
                ...current,
                latitude: latitude.toFixed(6),
                longitude: longitude.toFixed(6),
              }))}
            />
          </div>
          <label>
            Capacity (kWh)
            <input type="number" required min="0" step="any" value={values.capacityKwh} onChange={(event) => setField("capacityKwh", event.target.value)} />
          </label>
          <label>
            Total battery slots
            <input type="number" required min="1" step="1" value={values.totalBatterySlots} onChange={(event) => setField("totalBatterySlots", event.target.value)} />
          </label>
          <label>
            Available battery slots
            <input type="number" required min="0" max={values.totalBatterySlots || undefined} step="1" value={values.availableBatterySlots} onChange={(event) => setField("availableBatterySlots", event.target.value)} />
          </label>
        </div>

        <fieldset className="schedule-editor">
          <legend>Operating schedule</legend>
          <div className="weekday-grid">
            {WEEKDAYS.map(([value, label]) => (
              <label key={value} className="weekday-option">
                <input type="checkbox" checked={values.days.includes(value)} onChange={() => toggleDay(value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="station-form-grid schedule-times">
            <label>
              Opens
              <input type="time" required value={values.openTime} onChange={(event) => setField("openTime", event.target.value)} />
            </label>
            <label>
              Closes
              <input type="time" required value={values.closeTime} onChange={(event) => setField("closeTime", event.target.value)} />
            </label>
          </div>
        </fieldset>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? "Saving…" : station ? "Save changes" : "Add station"}</button>
        </div>
        <p className="hint">The API validates all station details before saving.</p>
      </form>
    </Modal>
  );
}
