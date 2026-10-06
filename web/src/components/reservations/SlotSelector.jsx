/**
 * Date and slot pills. Slots are whatever the station API returned for that date.
 */
import StatusBadge from "../common/StatusBadge";

export default function SlotSelector({ date, onDateChange, slots, loading, selectedSlotId, onSelect }) {
  return (
    <>
      <label className="reserve-date">
        Date
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
      </label>
      {loading ? <p className="reserve-status">Loading slots</p> : null}
      {!loading && slots.length === 0 ? <p className="reserve-status">No slots were returned for this date.</p> : null}
      <div className="reserve-pills">
        {slots.map((item) => (
          <button
            key={item.slotId}
            type="button"
            className={item.slotId === selectedSlotId ? "reserve-pill selected" : "reserve-pill"}
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
