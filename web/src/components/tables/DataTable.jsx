import EmptyState from "../common/EmptyState";

export default function DataTable({ columns, rows, rowKey, onRowClick, emptyTitle, emptyText }) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle || "Nothing to show"} text={emptyText || "Try a different filter."} />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? "click-row" : undefined}
            >
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
