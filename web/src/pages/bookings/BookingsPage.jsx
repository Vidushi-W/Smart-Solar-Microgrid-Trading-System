import { useMemo, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import DataTable from "../../components/tables/DataTable";
import { useData } from "../../context/DataContext";
import { formatTimeRange } from "../../utils/format";
import { isInsideSevenDayWindow, slotHoldCount } from "../../utils/reservationRules";

export default function BookingsPage() {
  const { stations, slots, reservations, setSlotOpen } = useData();
  const [stationId, setStationId] = useState("All");
  const [availability, setAvailability] = useState("All");

  const rows = useMemo(() => {
    return slots
      .filter((slot) => stationId === "All" || slot.stationId === stationId)
      .filter((slot) => {
        if (availability === "Open") return slot.isOpen;
        if (availability === "Closed") return !slot.isOpen;
        return true;
      })
      .slice()
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [slots, stationId, availability]);

  return (
    <div className="page">
      <section className="filter-card">
        <header className="panel-head">
          <h2>Search and filters</h2>
        </header>
        <div className="filter-grid">
          <label>
            Station
            <select value={stationId} onChange={(event) => setStationId(event.target.value)}>
              <option value="All">All stations</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Availability
            <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
              <option value="All">All slots</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </label>
        </div>
      </section>
      <DataTable
        rowKey={(row) => row.id}
        rows={rows}
        emptyTitle="No slots"
        columns={[
          {
            key: "station",
            label: "Station",
            render: (row) => stations.find((station) => station.id === row.stationId)?.name,
          },
          { key: "label", label: "Slot" },
          { key: "when", label: "Window", render: (row) => formatTimeRange(row.start, row.end) },
          {
            key: "capacity",
            label: "Booked",
            render: (row) => `${slotHoldCount(reservations, row.id)} / ${row.capacity}`,
          },
          {
            key: "window",
            label: "7-day window",
            render: (row) => (isInsideSevenDayWindow(row.start) ? "Inside" : "Outside"),
          },
          {
            key: "open",
            label: "Status",
            render: (row) => <StatusBadge value={row.isOpen ? "Open" : "Closed"} />,
          },
          {
            key: "action",
            label: "Action",
            render: (row) => (
              <button type="button" className="btn ghost" onClick={() => setSlotOpen(row.id, !row.isOpen)}>
                {row.isOpen ? "Close" : "Open"}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
