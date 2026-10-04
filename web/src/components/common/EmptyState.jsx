/**
 * Message shown when a list has no rows to display.
 */
export default function EmptyState({ title, text }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
