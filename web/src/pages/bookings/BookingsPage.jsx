/**
 * Energy slots from the station API, the same records a prosumer uses when booking.
 * Only a Grid Operator can edit or delete a slot.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { stationsApi } from "../../services/apiClient";

// Local calendar date, not the UTC date, for the date input.
function todayValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function BookingsPage() {
  const { user } = useAuth();
  const canChange = user.role === "GridOperator";
  const [stations, setStations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stationId, setStationId] = useState("");
  const [date, setDate] = useState(todayValue);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    stationsApi.list()
      .then((rows) => {
        if (!active) return;
        const list = Array.isArray(rows) ? rows : [];
        setStations(list);
        setStationId((current) => current || list.find((station) => station.status === "Active")?.stationId || list[0]?.stationId || "");
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load stations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!stationId) {
      setSlots([]);
      return undefined;
    }
    let active = true;
    setError("");
    stationsApi.slots(stationId, date)
      .then((rows) => {
        if (active) setSlots(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (active) {
          setSlots([]);
          setError(err.message || "Could not load slots.");
        }
      });
    return () => {
      active = false;
    };
  }, [stationId, date]);

  async function remove(slot) {
    setError("");
    setNotice("");
    try {
      await stationsApi.deleteSlot(slot.slotId);
      setSlots((current) => current.filter((item) => item.slotId !== slot.slotId));
      setNotice("Slot deleted.");
    } catch (err) {
      setError(err.message || "Could not delete this slot.");
    }
  }

  const station = stations.find((item) => item.stationId === stationId) || null;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Energy slots</p>
          <h1>Station slots</h1>
          <p className="lede">These are the slots stored for each station. A prosumer reservation is booked against one of them.</p>
        </div>
        {user.role === "Prosumer" && station ? <Link className="btn primary" to="/reservations/new">Reserve energy</Link> : null}
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="hint">{notice}</p> : null}

      <section className="filter-card">
        <div className="filter-grid">
          <label>
            Station
            <select value={stationId} onChange={(event) => setStationId(event.target.value)}>
              {stations.length === 0 ? <option value="">No stations yet</option> : null}
              {stations.map((item) => (
                <option key={item.stationId} value={item.stationId}>{item.name || item.stationId}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
      </section>

      {loading ? <p className="hint">Loading stations…</p> : null}
      {!loading && stations.length === 0 ? <p className="hint">No stations have been saved yet.</p> : null}

      {station ? (
        <div className="table-wrap">
          <table className="slot-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Time</th>
                <th>Capacity</th>
                <th>Status</th>
                {canChange ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.slotId}>
                  <td>{station.name || station.stationId}</td>
                  <td>{slot.startTime}–{slot.endTime}</td>
                  <td>{slot.remainingCapacity} / {slot.totalCapacity}</td>
                  <td><StatusBadge value={slot.status} /></td>
                  {canChange ? (
                    <td>
                      <div className="row-actions">
                        <Link className="btn ghost" to={`/stations/${encodeURIComponent(station.stationId)}/slots`}>Edit</Link>
                        <button type="button" className="btn danger" onClick={() => remove(slot)}>Delete</button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {slots.length === 0 ? (
                <tr>
                  <td colSpan={canChange ? 5 : 4}>No slots for this station on the selected date.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
