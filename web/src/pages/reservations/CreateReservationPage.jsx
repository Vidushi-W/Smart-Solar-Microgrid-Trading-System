/**
 * Prosumer booking flow. Stations and slots come from the station API. Confirm sends POST /api/reservations and shows that response.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ReservationActionSummary from "../../components/reservations/ReservationActionSummary";
import SlotSelector from "../../components/reservations/SlotSelector";
import { useAuth } from "../../context/AuthContext";
import { createReservation, fetchReservation, listStationsForReservations, stationsApi } from "../../services/apiClient";
import { stationTitle as stationLabel, utcDateLabel, utcTimeLabel } from "./reservationTime";

const STEPS = [
  { id: "station", label: "Station" },
  { id: "slot", label: "Slot" },
  { id: "review", label: "Review" },
  { id: "confirmation", label: "Confirmation" },
];

function localDateValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function stationTitle(station) {
  return station?.name?.trim() || station?.stationId || "Station";
}

function slotWhen(slot) {
  const date = String(slot.date).slice(0, 10);
  const start = String(slot.startTime).slice(0, 5);
  return `${date}T${start}:00.000Z`;
}

export default function CreateReservationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createdId = searchParams.get("created") || "";
  const [step, setStep] = useState(createdId ? "confirmation" : "station");
  const [stations, setStations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stationId, setStationId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [date, setDate] = useState(localDateValue);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingReservation, setLoadingReservation] = useState(Boolean(createdId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingStations(true);
    listStationsForReservations()
      .then((rows) => {
        if (!active) return;
        setStations((rows || []).filter((station) => station.status === "Active"));
      })
      .catch((reason) => {
        if (active) setError(reason.message || "Could not load stations.");
      })
      .finally(() => {
        if (active) setLoadingStations(false);
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
    setLoadingSlots(true);
    setError("");
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

  useEffect(() => {
    if (!createdId) return undefined;
    let active = true;
    setStep("confirmation");
    setReservation(null);
    setLoadingReservation(true);
    setError("");
    fetchReservation(createdId)
      .then((row) => {
        if (active) setReservation(row);
      })
      .catch((reason) => {
        if (active) setError(reason.message || "Could not load the reservation.");
      })
      .finally(() => {
        if (active) setLoadingReservation(false);
      });
    return () => {
      active = false;
    };
  }, [createdId]);

  const station = stations.find((item) => item.stationId === stationId) || null;
  const slot = slots.find((item) => item.slotId === slotId) || null;
  const summaryStation = stations.find((item) => item.stationId === reservation?.stationId) || station;

  function selectStation(nextId) {
    setStationId(nextId);
    setSlotId("");
    setError("");
  }

  function selectSlot(nextId) {
    setSlotId(nextId);
    setError("");
  }

  async function confirmReservation() {
    if (!station || !slot) return;
    setSubmitting(true);
    setError("");
    try {
      const saved = await createReservation({
        prosumerId: user.id,
        stationId: station.stationId,
        slotId: slot.slotId,
        scheduledAtUtc: slotWhen(slot),
      });
      navigate(`/reservations/new?created=${encodeURIComponent(saved.reservationId)}`, { replace: true });
    } catch (reason) {
      setError(reason.message || "The reservation could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  function leaveSummary() {
    if (createdId) navigate("/reservations/new", { replace: true });
  }

  function openStep(next) {
    if (next === "confirmation") return;
    if (next === "slot" && !stationId) return;
    if (next === "review" && !slot) return;
    setError("");
    setReservation(null);
    leaveSummary();
    setStep(next);
  }

  return (
    <div className="page reserve">
      <PageHeader
        eyebrow="Reservations"
        title="Reserve energy slot"
        actions={<Link className="btn ghost" to="/reservations">Reservations</Link>}
      />

      <ol className="reserve-steps">
        {STEPS.map((item, index) => {
          const currentIndex = STEPS.findIndex((entry) => entry.id === step);
          const state = item.id === step ? "current" : index < currentIndex ? "done" : "";
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`reserve-step ${state}`}
                disabled={item.id === "confirmation" || (item.id === "slot" && !stationId) || (item.id === "review" && !slot)}
                aria-current={item.id === step ? "step" : undefined}
                onClick={() => openStep(item.id)}
              >
                <span>0{index + 1}</span>
                <strong>{item.label}</strong>
              </button>
            </li>
          );
        })}
      </ol>

      {error ? <p className="reserve-alert">{error}</p> : null}

      {step === "station" ? (
        <section className="reserve-panel">
          <h2>Station</h2>
          {loadingStations ? <p className="reserve-status">Loading stations</p> : null}
          {!loadingStations && stations.length === 0 ? (
            <p className="reserve-status">No active stations were returned.</p>
          ) : null}
          <div className="reserve-grid">
            {stations.map((item) => (
              <button
                key={item.stationId}
                type="button"
                className={item.stationId === stationId ? "reserve-card selected" : "reserve-card"}
                onClick={() => selectStation(item.stationId)}
              >
                <strong>{stationTitle(item)}</strong>
                <StatusBadge value={item.status} />
                {item.name?.trim() ? <span>{item.stationId}</span> : null}
                {item.capacityKwh > 0 ? <span>{item.capacityKwh} kWh</span> : null}
              </button>
            ))}
          </div>
          <div className="reserve-actions">
            <button type="button" className="btn primary" disabled={!stationId} onClick={() => setStep("slot")}>
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === "slot" && station ? (
        <section className="reserve-panel">
          <h2>{stationTitle(station)}</h2>
          <SlotSelector
            date={date}
            onDateChange={(nextDate) => {
              setDate(nextDate);
              setSlotId("");
            }}
            slots={slots}
            loading={loadingSlots}
            selectedSlotId={slotId}
            onSelect={selectSlot}
          />
          <div className="reserve-actions">
            <button type="button" className="btn ghost" onClick={() => setStep("station")}>Back</button>
            <button type="button" className="btn primary" disabled={!slot} onClick={() => setStep("review")}>
              Review
            </button>
          </div>
        </section>
      ) : null}

      {step === "review" && station && slot ? (
        <section className="reserve-panel reserve-review">
          <div className="reserve-review-hero">
            <p className="eyebrow">Review</p>
            <h2>{stationTitle(station)}</h2>
            <p>{String(slot.date).slice(0, 10)} · {slot.startTime}–{slot.endTime} UTC</p>
          </div>
          <dl className="reserve-summary">
            <dt>Station</dt>
            <dd>{stationTitle(station)}</dd>
            <dt>Date</dt>
            <dd>{String(slot.date).slice(0, 10)}</dd>
            <dt>Time</dt>
            <dd>{slot.startTime}–{slot.endTime} UTC</dd>
            <dt>Slot</dt>
            <dd className="reserve-code">{slot.slotId}</dd>
          </dl>
          <div className="reserve-actions">
            <button type="button" className="btn ghost" disabled={submitting} onClick={() => setStep("slot")}>Back</button>
            <button type="button" className="btn primary" disabled={submitting} onClick={confirmReservation}>
              {submitting ? "Confirming" : "Confirm reservation"}
            </button>
          </div>
        </section>
      ) : null}

      {step === "confirmation" && loadingReservation && !reservation ? (
        <p className="reserve-status">Loading reservation</p>
      ) : null}
      {step === "confirmation" && reservation ? (
        <ReservationActionSummary
          title="Booking summary"
          result="Booked"
          reservationId={reservation.reservationId}
          stationName={stationLabel(summaryStation, reservation.stationId)}
          date={utcDateLabel(reservation.scheduledAtUtc)}
          time={`${utcTimeLabel(reservation.scheduledAtUtc)} UTC`}
          status={reservation.status}
        />
      ) : null}
    </div>
  );
}
