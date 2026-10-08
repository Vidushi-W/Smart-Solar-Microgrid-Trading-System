/**
 * Map click target for a station. The parent form stores the latitude and longitude it reports.
 */
import { useEffect, useRef, useState } from "react";

const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;
const DEFAULT_LOCATION = { latitude: 7.8731, longitude: 80.7718 };

// Web Mercator pixel position for this zoom. Latitude is clamped before the projection.
function project(latitude, longitude, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const boundedLatitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const sin = Math.sin((boundedLatitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

// Inverse of project: map a pixel back to longitude and latitude.
function unproject(x, y, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    longitude: (x / scale) * 360 - 180,
    latitude: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI,
  };
}

function validCoordinates(latitude, longitude) {
  return latitude !== "" && longitude !== "" && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    && Number(latitude) >= -90 && Number(latitude) <= 90
    && Number(longitude) >= -180 && Number(longitude) <= 180;
}

export default function LocationPicker({ latitude, longitude, onSelect }) {
  const mapRef = useRef(null);
  const dragRef = useRef(null);
  const [center, setCenter] = useState(() => validCoordinates(latitude, longitude)
    ? { latitude: Number(latitude), longitude: Number(longitude) }
    : DEFAULT_LOCATION);
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    if (!validCoordinates(latitude, longitude)) return;
    const next = { latitude: Number(latitude), longitude: Number(longitude) };
    setCenter((current) => current.latitude === next.latitude && current.longitude === next.longitude ? current : next);
  }, [latitude, longitude]);

  const centerPoint = project(center.latitude, center.longitude, zoom);
  const selected = validCoordinates(latitude, longitude)
    ? project(Number(latitude), Number(longitude), zoom)
    : null;

  // A drag does not pick a point. A click selects the map location under the pointer.
  function selectFromPointer(event) {
    if (!mapRef.current || !dragRef.current || dragRef.current.moved) return;
    const bounds = mapRef.current.getBoundingClientRect();
    const worldX = centerPoint.x + event.clientX - bounds.left - bounds.width / 2;
    const worldY = centerPoint.y + event.clientY - bounds.top - bounds.height / 2;
    const coordinates = unproject(worldX, worldY, zoom);
    coordinates.latitude = Math.max(-90, Math.min(90, coordinates.latitude));
    coordinates.longitude = Math.max(-180, Math.min(180, coordinates.longitude));
    onSelect(coordinates);
    setCenter(coordinates);
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
  }

  // Pan only after the pointer moves more than 4px, so a small click is not treated as a drag.
  function handlePointerMove(event) {
    if (!dragRef.current || !mapRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
    if (!dragRef.current.moved) return;
    const point = project(center.latitude, center.longitude, zoom);
    setCenter(unproject(point.x - dx, point.y - dy, zoom));
    dragRef.current.x = event.clientX;
    dragRef.current.y = event.clientY;
  }

  function handlePointerUp(event) {
    selectFromPointer(event);
    dragRef.current = null;
  }

  const tileX = Math.floor(centerPoint.x / TILE_SIZE);
  const tileY = Math.floor(centerPoint.y / TILE_SIZE);
  const tiles = [];
  for (let y = tileY - 2; y <= tileY + 2; y += 1) {
    for (let x = tileX - 2; x <= tileX + 2; x += 1) {
      const tileCount = 2 ** zoom;
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      if (y < 0 || y >= tileCount) continue;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: "50%",
        top: "50%",
        marginLeft: `${x * TILE_SIZE - centerPoint.x}px`,
        marginTop: `${y * TILE_SIZE - centerPoint.y}px`,
      });
    }
  }

  const markerStyle = selected ? {
    left: "50%",
    top: "50%",
    marginLeft: `${selected.x - centerPoint.x}px`,
    marginTop: `${selected.y - centerPoint.y}px`,
  } : undefined;

  return (
    <section className="location-picker" aria-label="Station location map">
      <div className="location-picker-heading">
        <div>
          <strong>Choose location on map</strong>
          <p className="hint">Click the map to set coordinates, or drag to pan.</p>
        </div>
        <div className="location-zoom" aria-label="Map zoom controls">
          <button type="button" onClick={() => setZoom((value) => Math.min(18, value + 1))} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => setZoom((value) => Math.max(3, value - 1))} aria-label="Zoom out">−</button>
        </div>
      </div>
      <div
        className="location-map"
        ref={mapRef}
        role="application"
        aria-label="OpenStreetMap location picker"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        {tiles.map((tile) => (
          <img className="location-map-tile" key={tile.key} src={tile.url} alt="" draggable="false" style={{ left: tile.left, top: tile.top }} />
        ))}
        {selected ? <span className="location-marker" aria-hidden="true" style={markerStyle} /> : null}
        <a className="location-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" onPointerDown={(event) => event.stopPropagation()}>
          © OpenStreetMap contributors
        </a>
      </div>
      <p className="hint location-coordinates">
        {validCoordinates(latitude, longitude)
          ? `Selected: ${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
          : "Enter coordinates manually or click the map to choose a location."}
      </p>
    </section>
  );
}
