/**
 * Temporary Member 2 view for reservation testing.
 * Station names and capacity are local mock details. Slots are loaded from the station API.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import SlotSelector from "../../components/reservations/SlotSelector";
import { listStationsForReservations, stationsApi } from "../../services/apiClient";

function todayValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function Member2PreviewPage() {
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState("");
  const [date, setDate] = useState(todayValue);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listStationsForReservations()
      .then((rows) => {
        if (!active) return;
        const list = Array.isArray(rows) ? rows : [];
        setStations(list);
        const first = list.find((station) => station.status === "Active") || list[0];
        if (first) setStationId(first.stationId);
      })
      .catch((reason) => {
        if (active) setError(reason.message || "Could not load stations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!stationId) return undefined;
    let active = true;
    setLoadingSlots(true);
    stationsApi.slots(stationId, date)
      .then((rows) => {
        if (active) setSlots(Array.isArray(rows) ? rows : []);
      })
      .catch((reason) => {
        if (active) {
          setSlots([]);
          setError(reason.message || "Could not load slots.");
        }
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [stationId, date]);

  const selected = stations.find((station) => station.stationId === stationId) || null;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Temporary · Member 2"
        title="Stations & energy slots"
        description="Names, location, and capacity are temporary test data. Slot times come from the station API, so a reservation can still be booked."
        actions={<Link className="btn primary" to="/reservations/new">Reserve Energy Slot</Link>}
      />

      {error ? <p className="reserve-alert">{error}</p> : null}
      {loading ? <p className="reserve-status">Loading stations</p> : null}

      {!loading && stations.length > 0 ? (
        <div className="table-wrap">
          <table className="account-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Battery slots</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((station) => (
                <tr
                  key={station.stationId}
                  role="button"
                  tabIndex={0}
                  aria-label={station.name || station.stationId}
                  onClick={() => setStationId(station.stationId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setStationId(station.stationId);
                    }
                  }}
                >
                  <td>
                    <strong>{station.name || station.stationId}</strong>
                    <small className="table-subtitle">{station.stationId}</small>
                  </td>
                  <td>{Number(station.latitude).toFixed(4)}, {Number(station.longitude).toFixed(4)}</td>
                  <td>{station.capacityKwh} kWh</td>
                  <td>{station.availableBatterySlots} available / {station.totalBatterySlots}</td>
                  <td><StatusBadge value={station.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected ? (
        <section className="reserve-panel">
          <h2>{selected.name || selected.stationId}</h2>
          <p className="hint">Slots for the selected station. Pick a date that has a schedule, then book from Reserve Energy Slot.</p>
          <SlotSelector
            date={date}
            onDateChange={setDate}
            slots={slots}
            loading={loadingSlots}
            selectedSlotId=""
            onSelect={() => {}}
          />
        </section>
      ) : null}
    </div>
  );
}
