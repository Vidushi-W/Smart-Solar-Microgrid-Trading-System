/**
 * Prosumer booking flow. Stations and slots come from the station API. Confirm sends POST /api/reservations and shows that response.
 */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import FlashNotice from "../../components/common/FlashNotice";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ReservationActionSummary from "../../components/reservations/ReservationActionSummary";
import ReservationFacts from "../../components/reservations/ReservationFacts";
import TransferQr from "../../components/reservations/TransferQr";
import SlotSelector from "../../components/reservations/SlotSelector";
import { useAuth } from "../../context/AuthContext";
import { createReservation, fetchReservation, listStationsForReservations, stationsApi } from "../../services/apiClient";
import { colomboDateInput, slotBookingState, slotInstant, stationTitle as stationLabel, utcDateLabel, utcTimeLabel } from "./reservationTime";

const STEPS = [
  { id: "station", label: "Station" },
  { id: "slot", label: "Slot" },
  { id: "review", label: "Review" },
  { id: "confirmation", label: "Confirmation" },
];

function stationTitle(station) {
  return station?.name?.trim() || station?.stationId || "Station";
}

// Slot date and start time as a UTC instant, shared with booking-window checks.
function slotWhen(slot) {
  return slotInstant(slot);
}

export default function CreateReservationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const createdId = searchParams.get("created") || "";
  const confirmedReservation = location.state?.reservation;
  const [step, setStep] = useState(createdId ? "confirmation" : "station");
  const [stations, setStations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stationId, setStationId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [date, setDate] = useState(() => colomboDateInput());
  const earliestDate = colomboDateInput();
  const latestDate = colomboDateInput(new Date(), 7);
  const furthestDate = colomboDateInput(new Date(), 30);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingReservation, setLoadingReservation] = useState(Boolean(createdId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    if (!date || date < earliestDate || date > latestDate) {
      setSlots([]);
      setLoadingSlots(false);
      setError("Choose a date within the next 7 days. Slot times are in UTC.");
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
  }, [stationId, date, earliestDate, latestDate]);

  useEffect(() => {
    if (!createdId) return undefined;
    if (confirmedReservation?.reservationId === createdId) {
      setStep("confirmation");
      setReservation(confirmedReservation);
      setLoadingReservation(false);
      setError("");
      return undefined;
    }
    let active = true;
    setStep("confirmation");
    setReservation(null);
    setLoadingReservation(true);
    setError("");
    fetchReservation(createdId)
      .then((row) => {
        if (!active) return;
        setReservation(row);
        setNotice("Reservation successful");
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
  }, [createdId, confirmedReservation]);

  const station = stations.find((item) => item.stationId === stationId) || null;
  const slot = slots.find((item) => item.slotId === slotId) || null;
  const slotState = slot ? slotBookingState(slot) : { ok: false, reason: "" };
  const summaryStation = stations.find((item) => item.stationId === reservation?.stationId) || station;

  function showNotice(text) {
    setNotice("");
    window.setTimeout(() => setNotice(text), 0);
  }

  function selectStation(nextId) {
    setStationId(nextId);
    setSlotId("");
    setError("");
  }

  // A date before today or more than 30 Colombo days ahead is left unchanged. Any other date clears the chosen slot, and a date past 7 days is reset to today with the 7-day notice.
  function chooseDate(nextDate) {
    if (!nextDate || nextDate < earliestDate || nextDate > furthestDate) return;
    setDate(nextDate);
    setSlotId("");
    setError("");
    if (nextDate > latestDate) {
      setDate(earliestDate);
      setSlotId("");
      showNotice("You can only make a reservation up to 7 days ahead.");
      return;
    }
  }

  function selectSlot(nextId) {
    setSlotId(nextId);
    setError("");
  }

  // Refuse a slot that has started or sits outside the 7-day window, then POST /reservations and open the confirmation for the returned id.
  async function confirmReservation() {
    if (submitting) return;
    if (!station || !slot) {
      setError("Select a station and slot before confirming your reservation.");
      return;
    }
    if (!slotState.ok) {
      showNotice(slotState.reason === "Already started"
        ? "This slot has already started. Choose a later time."
        : "You can only make a reservation up to 7 days ahead.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const saved = await createReservation({
        prosumerId: user.id,
        stationId: station.stationId,
        slotId: slot.slotId,
        scheduledAtUtc: slotWhen(slot),
      });
      if (!saved?.reservationId) {
        throw new Error("The server did not return a reservation ID. Check your reservations before trying again.");
      }
      setReservation(saved);
      setStep("confirmation");
      navigate(`/reservations/new?created=${encodeURIComponent(saved.reservationId)}`, {
        replace: true,
        state: { reservation: saved },
      });
    } catch (reason) {
      const message = reason.message || "The reservation could not be created.";
      if (message.toLowerCase().includes("7 days")) {
        showNotice("You can only make a reservation up to 7 days ahead.");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function leaveSummary() {
    if (createdId) navigate("/reservations/new", { replace: true });
  }

  function openStep(next) {
    if (submitting) return;
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
        actions={<Link className="btn primary" to="/reservations">Reservations</Link>}
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
                disabled={submitting || item.id === "confirmation" || (item.id === "slot" && !stationId) || (item.id === "review" && !slot)}
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

      {error && step !== "review" ? <p className="reserve-alert" role="alert">{error}</p> : null}
      <FlashNotice message={notice} onClose={() => setNotice("")} />

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
            <button type="button" className="btn primary" disabled={!stationId} onClick={() => { setDate(colomboDateInput()); setSlotId(""); setStep("slot"); }}>
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === "slot" && station ? (
        <section className="reserve-panel">
          <h2>{stationTitle(station)}</h2>
          <p className="reserve-status">Open times are limited to the next 7 days, through {utcDateLabel(`${latestDate}T00:00:00.000Z`)}.</p>
          <SlotSelector
            date={date}
            minDate={earliestDate}
            maxDate={furthestDate}
            bookableOnly
            isSlotDisabled={(item) => !slotBookingState(item).ok}
            onDateChange={chooseDate}
            slots={slots}
            loading={loadingSlots}
            selectedSlotId={slotId}
            onSelect={selectSlot}
          />
          <div className="reserve-actions">
            <button type="button" className="btn ghost" onClick={() => setStep("station")}>Back</button>
            <button type="button" className="btn primary" disabled={!slot || !slotState.ok} onClick={() => setStep("review")}>
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
            <p>{utcDateLabel(`${String(slot.date).slice(0, 10)}T00:00:00.000Z`)} · {slot.startTime}–{slot.endTime} UTC</p>
          </div>
          <ReservationFacts
            station={stationTitle(station)}
            date={utcDateLabel(`${String(slot.date).slice(0, 10)}T00:00:00.000Z`)}
            time={`${slot.startTime}–${slot.endTime} UTC`}
            slotId={slot.slotId}
          />
          {error ? <p className="reserve-alert" role="alert">{error}</p> : null}
          {submitting ? <p className="reserve-status" role="status">Submitting your reservation. Please wait for confirmation.</p> : null}
          <div className="reserve-actions">
            <button type="button" className="btn ghost" disabled={submitting} onClick={() => setStep("slot")}>Back</button>
            <button type="button" className="btn primary" disabled={submitting || !slotState.ok} onClick={confirmReservation}>
              {submitting ? "Confirming" : "Confirm reservation"}
            </button>
          </div>
        </section>
      ) : null}

      {step === "confirmation" && loadingReservation && !reservation ? (
        <p className="reserve-status">Loading reservation</p>
      ) : null}
      {step === "confirmation" && reservation ? (
        <>
          <ReservationActionSummary
            title="Booking summary"
            result="Booked"
            reservationId={reservation.reservationId}
            stationName={stationLabel(summaryStation, reservation.stationId)}
            date={utcDateLabel(reservation.scheduledAtUtc)}
            time={`${utcTimeLabel(reservation.scheduledAtUtc)} UTC`}
            status={reservation.status}
          />
          <TransferQr reservationId={reservation.reservationId} status={reservation.status} />
        </>
      ) : null}
    </div>
  );
}
