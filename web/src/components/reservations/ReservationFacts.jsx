/**
 * Grouped reservation details used under review cards and confirmation popups.
 */
import StatusBadge from "../common/StatusBadge";

export default function ReservationFacts({ date, time, status, station, reservationId, slotId, noteLabel, note }) {
  return (
    <div className="history-detail">
      <div className="history-when">
        <article>
          <span className="history-kicker">Date</span>
          <strong>{date}</strong>
        </article>
        <article>
          <span className="history-kicker">Time</span>
          <strong>{time}</strong>
        </article>
        {status ? (
          <article className="history-when-status">
            <span className="history-kicker">Status</span>
            <StatusBadge value={status} />
          </article>
        ) : null}
      </div>

      {station ? (
        <p className="history-place">
          <span className="history-kicker">Station</span>
          <strong>{station}</strong>
        </p>
      ) : null}

      {note ? (
        <p className="history-place">
          <span className="history-kicker">{noteLabel || "Note"}</span>
          <strong>{note}</strong>
        </p>
      ) : null}

      {reservationId || slotId ? (
        <section className="history-refs" aria-label="Reference numbers">
          {reservationId ? (
            <div>
              <span className="history-kicker">Reservation ID</span>
              <code>{reservationId}</code>
            </div>
          ) : null}
          {slotId ? (
            <div>
              <span className="history-kicker">Slot</span>
              <code>{slotId}</code>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
