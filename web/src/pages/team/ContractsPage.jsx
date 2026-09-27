import { API_BASE, contractGroups } from "../../services/contracts";

export default function ContractsPage() {
  return (
    <div>
      <p className="hint api-base">{API_BASE}</p>
      <div className="contract-list">
        {contractGroups.map((group) => (
          <article key={group.owner} className="panel">
            <p className="eyebrow">
              {group.owner} — {group.area}
            </p>
            <ul className="contract-items">
              {group.items.map((item) => (
                <li key={`${item.method}-${item.path}`}>
                  <div className="contract-path">
                    <span className={`method method-${item.method.toLowerCase()}`}>{item.method}</span>
                    <code>{item.path}</code>
                  </div>
                  <p>{item.purpose}</p>
                  <em>{item.role}</em>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
