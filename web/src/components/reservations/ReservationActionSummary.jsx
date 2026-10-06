/**
 * Summary shown after a reservation action has been confirmed and reloaded from the API.
 */
import { Link } from "react-router-dom";
import ReservationFacts from "./ReservationFacts";

export default function ReservationActionSummary({
  title,
  result,
  reservationId,
  stationName,
  date,
  time,
  status,
  onView,
}) {
  return (
    <section className="reserve-panel reserve-review">
      <div className="reserve-review-hero">
        <p className="eyebrow">{result}</p>
        <h2>{title}</h2>
        <p>{stationName} · {date} · {time}</p>
      </div>
      <ReservationFacts
        station={stationName}
        date={date}
        time={time}
        status={status}
        reservationId={reservationId}
        noteLabel="Result"
        note={result}
      />
      <div className="reserve-actions">
        {onView ? (
          <button type="button" className="btn primary" onClick={onView}>View Reservation</button>
        ) : (
          <Link className="btn primary" to={`/reservations/${reservationId}`}>View Reservation</Link>
        )}
        <Link className="btn ghost" to="/reservations">Back to Reservations</Link>
      </div>
    </section>
  );
}
