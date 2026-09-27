import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatDateTime, formatTimeRange } from "../../utils/format";
import { canCompleteTransfer } from "../../utils/reservationRules";

export default function TransactionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const data = useData();
  const transaction = data.transactions.find((item) => item.id === id);
  const reservation = data.reservations.find((item) => item.id === transaction?.reservationId);
  const prosumer = data.prosumers.find((item) => item.id === reservation?.prosumerId);
  const station = data.stations.find((item) => item.id === reservation?.stationId);

  if (!transaction || !reservation) {
    return (
      <div>
        <PageHeader title="Transfer not found" />
        <Link to="/transactions">Back to transfers</Link>
      </div>
    );
  }

  const completeBlock = canCompleteTransfer(reservation, transaction);
  const isOperator = user.role === "GridOperator";

  return (
    <div>
      <PageHeader title={transaction.code} actions={<StatusBadge value={transaction.tokenStatus} />} />
      <p className="back-link">
        <Link to="/transactions">All transfers</Link>
        {" · "}
        <Link to={`/reservations/${reservation.id}`}>{reservation.code}</Link>
      </p>
      <article className="panel narrow">
        <dl className="kv">
          <div>
            <dt>Prosumer</dt>
            <dd>{prosumer?.name}</dd>
          </div>
          <div>
            <dt>Station</dt>
            <dd>{station?.name}</dd>
          </div>
          <div>
            <dt>Reservation window</dt>
            <dd>{formatTimeRange(reservation.start, reservation.end)}</dd>
          </div>
          <div>
            <dt>Reservation status</dt>
            <dd>
              <StatusBadge value={reservation.status} />
            </dd>
          </div>
          <div>
            <dt>Token updated</dt>
            <dd>{formatDateTime(transaction.updatedAt)}</dd>
          </div>
        </dl>
        {isOperator ? (
          <div className="action-row">
            <button
              type="button"
              className="btn"
              disabled={transaction.tokenStatus !== "AwaitingQR"}
              onClick={() => data.markQrIssued(transaction.id, user)}
            >
              Mark QR issued
            </button>
            <button
              type="button"
              className="btn"
              disabled={transaction.tokenStatus !== "Issued"}
              onClick={() => data.verifyTransaction(transaction.id, user)}
            >
              Mark QR verified
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={Boolean(completeBlock)}
              onClick={() => data.completeTransfer(transaction.id, user)}
            >
              Complete energy transfer
            </button>
          </div>
        ) : null}
        {isOperator && (transaction.tokenStatus === "Used" || completeBlock) ? (
          <p className="hint">
            {transaction.tokenStatus === "Used" ? "This token is already used." : completeBlock}
          </p>
        ) : null}
      </article>
    </div>
  );
}
