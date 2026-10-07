import { useMemo, useState } from "react";

const TILE_SIZE = 256;
const ZOOM = 7;
const MAP_CENTER = { latitude: 7.8731, longitude: 80.7718 };

function project(latitude, longitude) {
  const scale = TILE_SIZE * 2 ** ZOOM;
  const boundedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin((boundedLatitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

export default function StationNetworkMap({ stations, selectedId, onSelect }) {
  const [center, setCenter] = useState(MAP_CENTER);
  const centerPoint = project(center.latitude, center.longitude);
  const tileX = Math.floor(centerPoint.x / TILE_SIZE);
  const tileY = Math.floor(centerPoint.y / TILE_SIZE);
  const tiles = useMemo(() => {
    const result = [];
    for (let y = tileY - 2; y <= tileY + 2; y += 1) {
      for (let x = tileX - 2; x <= tileX + 2; x += 1) {
        const count = 2 ** ZOOM;
        const wrappedX = ((x % count) + count) % count;
        if (y >= 0 && y < count) {
          result.push({
            key: `${x}-${y}`,
            src: `https://tile.openstreetmap.org/${ZOOM}/${wrappedX}/${y}.png`,
            left: `${x * TILE_SIZE - centerPoint.x}px`,
            top: `${y * TILE_SIZE - centerPoint.y}px`,
          });
        }
      }
    }
    return result;
  }, [centerPoint.x, centerPoint.y, tileX, tileY]);

  function markerPosition(station) {
    const point = project(Number(station.latitude), Number(station.longitude));
    return {
      left: `calc(50% + ${point.x - centerPoint.x}px)`,
      top: `calc(50% + ${point.y - centerPoint.y}px)`,
    };
  }

  return (
    <section className="station-map-card panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">LIVE NETWORK VIEW</span>
          <h2>Stations across Sri Lanka</h2>
        </div>
        <span className="map-status"><i /> Connected network</span>
      </div>
      <div className="station-map" role="application" aria-label="Solar station network map">
        {tiles.map((tile) => <img key={tile.key} src={tile.src} alt="" className="station-map-tile" style={{ left: `calc(50% + ${tile.left})`, top: `calc(50% + ${tile.top})` }} />)}
        <div className="map-wash" />
        {stations.map((station) => (
          <button
            type="button"
            key={station.stationId}
            className={`map-marker ${station.status !== "Active" ? "is-inactive" : ""} ${selectedId === station.stationId ? "is-selected" : ""}`}
            style={markerPosition(station)}
            onClick={() => onSelect(station.stationId)}
            title={`${station.name} · ${station.address || "Sri Lanka"}`}
            aria-label={`Show ${station.name}`}
          >
            <span>{station.capacityKwh}</span>
          </button>
        ))}
        <div className="map-label map-label-north">N</div>
        <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
      <div className="station-map-legend">
        <span><i className="legend-dot active" /> Active station</span>
        <span><i className="legend-dot inactive" /> Offline station</span>
        <span className="hint">Click a marker to highlight it</span>
      </div>
    </section>
  );
}
