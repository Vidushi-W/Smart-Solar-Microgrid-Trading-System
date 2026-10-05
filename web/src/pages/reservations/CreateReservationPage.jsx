/**
 * Books one energy slot. Stations come from the station API. Slots are loaded again after a station is chosen.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { fetchSlots, fetchStations } from "../../services/catalogApi";
import { createReservation } from "../../services/reservationsApi";
import { isInsideSevenDayWindow } from "../../utils/reservationRules";

function bookingDate(iso) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function bookingTime(start, end) {
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  return `${time.format(new Date(start))}–${time.format(new Date(end))}`;
}

function placesLeft(slot) {
  return Math.max(0, Number(slot.capacity || 0) - Number(slot.holdingCount || 0));
}

export default function CreateReservationPage() {
  const { user } = useAuth();
  const displayName = user.name || user.username || "";
  const [stations, setStations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [stationId, setStationId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [step, setStep] = useState("choose");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingStations(true);
    setError("");
    fetchStations(user)
      .then((rows) => {
        if (!active) return;
        setStations((rows || []).filter((item) => !item.status || item.status === "Active"));
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoadingStations(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!stationId) {
      setSlots([]);
      return undefined;
    }
    let active = true;
    setLoadingSlots(true);
    setError("");
    fetchSlots(user, stationId)
      .then((rows) => {
        if (!active) return;
        setSlots(
          (rows || []).filter(
            (item) => item.isOpen !== false && placesLeft(item) > 0 && isInsideSevenDayWindow(item.start)
          )
        );
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [user, stationId]);

  const station = stations.find((item) => item.id === stationId) || null;
  const slot = slots.find((item) => item.id === slotId) || null;

  const summary = useMemo(() => {
    if (!station || !slot) return null;
    return {
      prosumer: displayName,
      station: station.name,
      date: bookingDate(slot.start),
      time: bookingTime(slot.start, slot.end),
      status: "Pending",
    };
  }, [station, slot, displayName]);

  function chooseStation(nextStationId) {
    setStationId(nextStationId);
    setSlotId("");
    setError("");
  }

  async function confirmBooking() {
    setSubmitting(true);
    setError("");
    try {
      const saved = await createReservation(user, {
        prosumerId: user.id,
        slotId,
        serviceType: "Drop-off",
        energyKwh: 1,
      });
      setCreated(saved);
      setStep("success");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Reservations"
        title="Reserve energy slot"
        description="Stations load from the microgrid API. Slots load again after you choose a station."
        actions={
          <Link className="btn ghost" to="/reservations">
            Back to reservations
          </Link>
        }
      />

      {error ? <p className="form-error">{error}</p> : null}

      {step === "choose" ? (
        <form
          className="panel form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            setStep("confirm");
          }}
        >
          <label>
            Prosumer
            <input value={displayName} readOnly />
          </label>

          <fieldset className="slot-fieldset">
            <legend>Station</legend>
            {loadingStations ? <p className="hint">Loading microgrid stations…</p> : null}
            {!loadingStations && stations.length === 0 ? (
              <p className="hint">No active stations were returned by the API.</p>
            ) : null}
            <div className="station-picks">
              {stations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === stationId ? "station-pick selected" : "station-pick"}
                  onClick={() => chooseStation(item.id)}
                >
                  <strong>{item.name}</strong>
                  <span>{item.capacityKwh} kWh</span>
                </button>
              ))}
            </div>
          </fieldset>

          {stationId ? (
            <fieldset className="slot-fieldset">
              <legend>Available slot</legend>
              {loadingSlots ? <p className="hint">Loading slots for this station…</p> : null}
              {!loadingSlots && slots.length === 0 ? (
                <p className="hint">No open slots are inside the next 7 days.</p>
              ) : null}
              <div className="slot-grid">
                {slots.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === slotId ? "slot-card selected" : "slot-card"}
                    onClick={() => setSlotId(item.id)}
                  >
                    <strong>{bookingDate(item.start)}</strong>
                    <span>{bookingTime(item.start, item.end)}</span>
                    <em>{placesLeft(item)} {placesLeft(item) === 1 ? "place" : "places"} left</em>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <p className="hint">A change or cancellation later is allowed only when at least 12 hours remain before the slot.</p>
          <button type="submit" className="btn primary" disabled={!summary}>
            Review booking
          </button>
        </form>
      ) : null}

      {step === "confirm" && summary ? (
        <section className="panel">
          <h2>Booking summary</h2>
          <dl className="kv">
            <div><dt>Prosumer</dt><dd>{summary.prosumer}</dd></div>
            <div><dt>Station</dt><dd>{summary.station}</dd></div>
            <div><dt>Date</dt><dd>{summary.date}</dd></div>
            <div><dt>Time</dt><dd>{summary.time}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge value={summary.status} /></dd></div>
          </dl>
          <p className="hint">Confirm sends the station slot to the API. The API checks your sign-in, the station, the slot, the 7-day window, and whether that slot is already reserved.</p>
          <div className="action-row">
            <button type="button" className="btn primary" disabled={submitting} onClick={confirmBooking}>
              {submitting ? "Saving…" : "Confirm Reservation"}
            </button>
            <button type="button" className="btn ghost" disabled={submitting} onClick={() => setStep("choose")}>
              Back
            </button>
          </div>
        </section>
      ) : null}

      {step === "success" && created && summary ? (
        <section className="panel">
          <h2>Reservation confirmed</h2>
          <p className="lede">Reservation ID <strong>{created.id}</strong></p>
          <dl className="kv">
            <div><dt>Prosumer</dt><dd>{summary.prosumer}</dd></div>
            <div><dt>Station</dt><dd>{summary.station}</dd></div>
            <div><dt>Date</dt><dd>{summary.date}</dd></div>
            <div><dt>Time</dt><dd>{summary.time}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge value="Pending" /></dd></div>
          </dl>
          <p className="hint">Staff approval changes this to Approved. A QR code is then issued for the Grid Operator to scan on the reservation day. A valid scan completes the transfer.</p>
          <Link className="btn primary" to="/reservations">
            Back to reservations
          </Link>
        </section>
      ) : null}
    </div>
  );
}
