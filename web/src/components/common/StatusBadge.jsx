/**
 * Colored label for a status string such as Active, Requested, or Deactivated.
 */
const TONES = {
  Requested: "sun",
  Approved: "teal",
  Scheduled: "blue",
  Completed: "green",
  Cancelled: "slate",
  Rejected: "red",
  Active: "green",
  Pending: "sun",
  Deactivated: "slate",
  Inactive: "slate",
  Open: "green",
  Full: "sun",
  Closed: "slate",
  AwaitingQR: "sun",
  Issued: "blue",
  Verified: "teal",
  Used: "green",
};

const LABELS = {
  Requested: "Pending",
  AwaitingQR: "Awaiting QR",
  GridOperator: "Grid Operator",
};

export default function StatusBadge({ value }) {
  return <span className={`badge tone-${TONES[value] || "slate"}`}>{LABELS[value] || value}</span>;
}
