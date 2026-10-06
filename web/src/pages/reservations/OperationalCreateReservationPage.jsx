/**
 * Creates a reservation through the reservation API. The slot must fall inside the seven-day window.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { createReservation, fetchReservationOptions } from "../../services/reservationsApi";
import { formatTimeRange } from "../../utils/format";

export default function OperationalCreateReservationPage() {
  const { user } = useAuth();
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isProsumer = user.role === "Prosumer";
  const [prosumerId, setProsumerId] = useState(isProsumer ? user.id : "");
  const [stationId, setStationId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [serviceType, setServiceType] = useState("Drop-off");
  const [energyKwh, setEnergyKwh] = useState("");
  const [step, setStep] = useState("choose");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchReservationOptions(user, prosumerId)
      .then((data) => {
        if (!active) return;
        setOptions(data);
        if (!prosumerId && data.prosumers?.length === 1) {
          setProsumerId(data.prosumers[0].id);
        }
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, prosumerId]);

  const station = options?.stations?.find((item) => item.id === stationId) || null;
  const slot = station?.slots?.find((item) => item.id === slotId) || null;
  const prosumer = options?.prosumers?.find((item) => item.id === prosumerId) || null;
  const ready = Boolean(prosumerId && slot && serviceType && Number(energyKwh) > 0);

  const summary = useMemo(() => {
    if (!slot || !station || !prosumer) return null;
    return {
      prosumer: prosumer.name,
      station: station.name,
      slot: slot.label,
      when: formatTimeRange(slot.start, slot.end),
      places: `${slot.remaining} of ${slot.capacity} places left`,
      capacity: `${station.capacityKwh} kWh station capacity`,
      serviceType,
      energyKwh,
    };
  }, [slot, station, prosumer, serviceType, energyKwh]);

  function chooseStation(nextStationId) {
    setStationId(nextStationId);
    setSlotId("");
    setError("");
  }

  async function confirmBooking(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const saved = await createReservation(user, {
        prosumerId,
        slotId,
        serviceType,
        energyKwh: Number(energyKwh),
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
        title="New reservation"
        description="Choose a prosumer and a slot the server still has open."
        actions={
          <Link className="btn ghost" to="/operational-reservations">
            Back to reservations
          </Link>
        }
      />

      {loading ? <p className="hint">Loading available stations and slots…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!loading && step === "choose" && options && options.prosumers.length === 0 ? (
        <section className="panel">
          <h2>No active prosumers</h2>
          <p className="hint">An active prosumer account is required before a reservation can be created.</p>
        </section>
      ) : null}

      {!loading && step === "choose" && options && options.prosumers.length > 0 ? (
        <form
          className="panel form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            setStep("confirm");
          }}
        >
          {isProsumer ? null : (
            <label>
              Prosumer
              <select
                value={prosumerId}
                onChange={(event) => {
                  setProsumerId(event.target.value);
                  setStationId("");
                  setSlotId("");
                }}
              >
                <option value="">Select a prosumer</option>
                {options.prosumers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {prosumerId && options.stations.length === 0 ? (
            <p className="hint">No slots are available for this prosumer inside the booking window.</p>
          ) : null}

          {options.stations.length > 0 ? (
            <fieldset className="slot-fieldset">
              <legend>Station and slot</legend>
              <div className="station-picks">
                {options.stations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === stationId ? "station-pick selected" : "station-pick"}
                    onClick={() => chooseStation(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.capacityKwh} kWh · {item.slots.length} open {item.slots.length === 1 ? "slot" : "slots"}</span>
                  </button>
                ))}
              </div>
              {station ? (
                <div className="slot-grid">
                  {station.slots.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === slotId ? "slot-card selected" : "slot-card"}
                      onClick={() => setSlotId(item.id)}
                    >
                      <strong>{item.label}</strong>
                      <span>{formatTimeRange(item.start, item.end)}</span>
                      <em>{item.remaining} of {item.capacity} places left</em>
                    </button>
                  ))}
                </div>
              ) : null}
            </fieldset>
          ) : null}

          <label>
            Service
            <select value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
              <option value="Drop-off">Drop-off</option>
              <option value="Charging">Charging</option>
            </select>
          </label>
          <label>
            Energy (kWh)
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={energyKwh}
              onChange={(event) => setEnergyKwh(event.target.value)}
              placeholder="Amount to reserve"
            />
          </label>
          <button type="submit" className="btn primary" disabled={!ready}>
            Review booking
          </button>
        </form>
      ) : null}

      {step === "confirm" && summary ? (
        <section className="panel">
          <h2>Confirm booking</h2>
          <dl className="kv">
            <div><dt>Prosumer</dt><dd>{summary.prosumer}</dd></div>
            <div><dt>Station</dt><dd>{summary.station}</dd></div>
            <div><dt>Slot</dt><dd>{summary.slot}</dd></div>
            <div><dt>When</dt><dd>{summary.when}</dd></div>
            <div><dt>Places</dt><dd>{summary.places}</dd></div>
            <div><dt>Station capacity</dt><dd>{summary.capacity}</dd></div>
            <div><dt>Service</dt><dd>{summary.serviceType}</dd></div>
            <div><dt>Energy</dt><dd>{summary.energyKwh} kWh</dd></div>
          </dl>
          <div className="action-row">
            <button type="button" className="btn primary" disabled={submitting} onClick={confirmBooking}>
              {submitting ? "Saving…" : "Confirm reservation"}
            </button>
            <button type="button" className="btn ghost" disabled={submitting} onClick={() => setStep("choose")}>
              Back
            </button>
          </div>
        </section>
      ) : null}

      {step === "success" && created ? (
        <section className="panel">
          <h2>Reservation saved</h2>
          <p className="lede">{created.code} is {created.status}.</p>
          <dl className="kv">
            <div><dt>Prosumer</dt><dd>{created.prosumerName}</dd></div>
            <div><dt>Station</dt><dd>{created.stationName}</dd></div>
            <div><dt>Slot</dt><dd>{created.slotLabel}</dd></div>
            <div><dt>When</dt><dd>{formatTimeRange(created.start, created.end)}</dd></div>
            <div><dt>Service</dt><dd>{created.serviceType}</dd></div>
            <div><dt>Energy</dt><dd>{created.energyKwh} kWh</dd></div>
          </dl>
          <Link className="btn primary" to="/operational-reservations">
            Back to reservations
          </Link>
        </section>
      ) : null}
    </div>
  );
}
