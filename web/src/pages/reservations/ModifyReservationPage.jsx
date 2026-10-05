/**
 * Slot change for the prosumer stored on the reservation. PUT sends that prosumer id, then the page reloads the reservation.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ReservationActionSummary from "../../components/reservations/ReservationActionSummary";
import SlotSelector from "../../components/reservations/SlotSelector";
import { fetchReservation, listStationsForReservations, stationsApi, updateReservation } from "../../services/apiClient";
import { slotInstant, stationTitle, utcDateInput, utcDateLabel, utcTimeLabel } from "./reservationTime";

const STEPS = [
  { id: "slot", label: "Slot" },
  { id: "review", label: "Review" },
  { id: "result", label: "Result" },
];

export default function ModifyReservationPage() {
  const { id } = useParams();
  const [step, setStep] = useState("slot");
  const [reservation, setReservation] = useState(null);
  const [stations, setStations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stationId, setStationId] = useState("");
  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([fetchReservation(id), listStationsForReservations()])
      .then(([row, stationRows]) => {
        if (!active) return;
        const list = Array.isArray(stationRows) ? stationRows : [];
        setReservation(row);
        setStations(list.filter((station) => station.status === "Active" || station.stationId === row.stationId));
        setStationId(row.stationId);
        setDate(utcDateInput(row.scheduledAtUtc));
      })
      .catch((reason) => {
        if (active) setError(reason.message || "Could not load the reservation.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!stationId || !date) {
      setSlots([]);
      return undefined;
    }
    let active = true;
    setLoadingSlots(true);
    stationsApi.slots(stationId, date)
      .then((rows) => {
        if (active) setSlots(Array.isArray(rows) ? rows : []);
      })
      .catch((reason) => {
        if (!active) return;
        setSlots([]);
        setError(reason.message || "Could not load slots.");
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [stationId, date]);

  const currentStation = stations.find((item) => item.stationId === reservation?.stationId) || null;
  const nextStation = stations.find((item) => item.stationId === stationId) || null;
  const selectedSlot = slots.find((item) => item.slotId === slotId) || null;

  async function submitChange() {
    if (!reservation || !selectedSlot) return;
    setSubmitting(true);
    setError("");
    try {
      await updateReservation(reservation.reservationId, {
        prosumerId: reservation.prosumerId,
        stationId,
        slotId: selectedSlot.slotId,
        scheduledAtUtc: slotInstant(selectedSlot),
        status: reservation.status,
      });
    } catch (reason) {
      setError(reason.message || "The reservation could not be updated.");
      setSubmitting(false);
      return;
    }

    try {
      const refreshed = await fetchReservation(reservation.reservationId);
      setSummary(refreshed);
      setStep("result");
    } catch (reason) {
      setSummary(null);
      setError(reason.message || "The updated reservation could not be reloaded.");
    } finally {
      setSubmitting(false);
    }
  }

  function reservationFields(row, station) {
    if (!row) return null;
    return (
      <dl className="reserve-summary">
        <dt>Reservation</dt>
        <dd>{row.reservationId}</dd>
        <dt>Prosumer</dt>
        <dd>{row.prosumerId}</dd>
        <dt>Station</dt>
        <dd>{stationTitle(station, row.stationId)}</dd>
        <dt>Scheduled date</dt>
        <dd>{utcDateLabel(row.scheduledAtUtc)}</dd>
        <dt>Time</dt>
        <dd>{utcTimeLabel(row.scheduledAtUtc)} UTC</dd>
        <dt>Status</dt>
        <dd><StatusBadge value={row.status} /></dd>
        <dt>Slot</dt>
        <dd>{row.slotId}</dd>
      </dl>
    );
  }

  return (
    <div className="page mine">
      <PageHeader
        eyebrow="Reservations"
        title="Modify reservation"
        actions={<Link className="btn ghost" to={`/reservations/${id}`}>Reservation details</Link>}
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
                disabled={item.id === "result" || (item.id === "review" && !selectedSlot) || step === "result"}
                aria-current={item.id === step ? "step" : undefined}
                onClick={() => {
                  if (item.id === "result" || step === "result") return;
                  if (item.id === "review" && !selectedSlot) return;
                  setError("");
                  setStep(item.id);
                }}
              >
                <span>0{index + 1}</span>
                <strong>{item.label}</strong>
              </button>
            </li>
          );
        })}
      </ol>

      {error ? <p className="reserve-alert">{error}</p> : null}
      {loading ? <p className="reserve-status">Loading reservation</p> : null}

      {step === "slot" && reservation ? (
        <section className="reserve-panel">
          <h2>New slot</h2>
          <div className="reserve-grid">
            {stations.map((item) => (
              <button
                key={item.stationId}
                type="button"
                className={item.stationId === stationId ? "reserve-card selected" : "reserve-card"}
                onClick={() => {
                  setStationId(item.stationId);
                  setSlotId("");
                  setError("");
                }}
              >
                <strong>{stationTitle(item, item.stationId)}</strong>
                <StatusBadge value={item.status} />
              </button>
            ))}
          </div>
          <SlotSelector
            date={date}
            onDateChange={(nextDate) => {
              setDate(nextDate);
              setSlotId("");
              setError("");
            }}
            slots={slots}
            loading={loadingSlots}
            selectedSlotId={slotId}
            onSelect={(nextId) => {
              setSlotId(nextId);
              setError("");
            }}
          />
          <div className="reserve-actions">
            <Link className="btn ghost" to={`/reservations/${id}`}>Back</Link>
            <button type="button" className="btn primary" disabled={!selectedSlot} onClick={() => setStep("review")}>
              Review change
            </button>
          </div>
        </section>
      ) : null}

      {step === "review" && reservation && selectedSlot ? (
        <section className="reserve-panel">
          <div className="mine-compare">
            <div>
              <h2>Current</h2>
              {reservationFields(reservation, currentStation)}
            </div>
            <div>
              <h2>New slot</h2>
              <dl className="reserve-summary">
                <dt>Station</dt>
                <dd>{stationTitle(nextStation, stationId)}</dd>
                <dt>Scheduled date</dt>
                <dd>{String(selectedSlot.date).slice(0, 10)}</dd>
                <dt>Time</dt>
                <dd>{selectedSlot.startTime}–{selectedSlot.endTime} UTC</dd>
                <dt>Slot</dt>
                <dd>{selectedSlot.slotId}</dd>
              </dl>
            </div>
          </div>
          <div className="reserve-actions">
            <button type="button" className="btn ghost" disabled={submitting} onClick={() => setStep("slot")}>Back</button>
            <button type="button" className="btn primary" disabled={submitting} onClick={submitChange}>
              {submitting ? "Updating" : "Update reservation"}
            </button>
          </div>
        </section>
      ) : null}

      {step === "result" && summary ? (
        <ReservationActionSummary
          title="Update summary"
          result="Updated"
          reservationId={summary.reservationId}
          stationName={stationTitle(stations.find((item) => item.stationId === summary.stationId), summary.stationId)}
          date={utcDateLabel(summary.scheduledAtUtc)}
          time={`${utcTimeLabel(summary.scheduledAtUtc)} UTC`}
          status={summary.status}
        />
      ) : null}
    </div>
  );
}
