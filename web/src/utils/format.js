export function formatDateTime(iso) {
  return new Intl.DateTimeFormat("en-LK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTimeRange(start, end) {
  const day = new Intl.DateTimeFormat("en-LK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(start));
  const time = new Intl.DateTimeFormat("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}, ${time.format(new Date(start))} – ${time.format(new Date(end))}`;
}

export function toDateInputValue(iso) {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatCoord(value) {
  return Number(value).toFixed(4);
}
