/**
 * Date and slot pills. Booking screens pass bookableOnly so only open slots inside the next 7 days are shown.
 */
import StatusBadge from "../common/StatusBadge";
import { slotBookingState } from "../../pages/reservations/reservationTime";

function canReserve(slot) {
  return slotBookingState(slot).ok && slot.status !== "Closed" && slot.status !== "Full" && slot.remainingCapacity > 0;
}

export default function SlotSelector({ date, minDate, maxDate, onDateChange, slots, loading, selectedSlotId, onSelect, bookableOnly = false, isSlotDisabled }) {
  const visible = bookableOnly ? slots.filter(canReserve) : slots;
  return (
    <>
      <label className="reserve-date">
        Date
        <input type="date" min={minDate} max={maxDate} value={date} onChange={(event) => onDateChange(event.target.value)} />
      </label>
      {loading ? <p className="reserve-status">Loading slots</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="reserve-status">
          {bookableOnly ? "No open slots on this date inside the next 7 days." : "No slots were returned for this date."}
        </p>
      ) : null}
      <div className="reserve-pills">
        {visible.map((item) => (
          <button
            key={item.slotId}
            type="button"
            className={item.slotId === selectedSlotId ? "reserve-pill selected" : "reserve-pill"}
            disabled={isSlotDisabled?.(item) || false}
            onClick={() => onSelect(item.slotId)}
          >
            <strong>{item.startTime}–{item.endTime}</strong>
            <StatusBadge value={item.status} />
            <span>{item.remainingCapacity} remaining</span>
          </button>
        ))}
      </div>
    </>
  );
}
