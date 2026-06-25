import { AccountOverview } from '../types';
import { calculateRiskBuffer } from '../utils/risk';

interface Props {
  account: AccountOverview;
  selected: boolean;
  onClick: () => void;
  formatCurrency: (value: number) => string;
}

export default function AccountCard({ account, selected, onClick, formatCurrency }: Props) {
  const statusClass = `status-pill status-${account.status}`;
  const typeClass = `account-type-tag type-${account.type}`;
  const pnlClass = account.pnl > 0 ? 'positive' : account.pnl < 0 ? 'negative' : 'zero';

  const risk = calculateRiskBuffer(account, null); // Using overview data

  return (
    <div
      className={`account-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="account-card-header">
        <div>
          <div className="account-name">{account.name}</div>
          <div className="account-id">{account.accountId}</div>
        </div>
        <div>
          <span className={typeClass}>{account.type}</span>
        </div>
      </div>

      <div className="account-metrics">
        <div className="metric-item">
          <div className="metric-label">Balance</div>
          <div className="metric-value">{formatCurrency(account.balance)}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">P&amp;L</div>
          <div className={`metric-value ${pnlClass}`}>{formatCurrency(account.pnl)}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Daily Buffer</div>
          <div className="metric-value" style={{ color: `var(--${risk.dailyStatus === 'safe' ? 'success' : risk.dailyStatus})` }}>
            {formatCurrency(risk.dailyBuffer)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="buffer-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Overall Buffer: <strong style={{ color: `var(--${risk.overallStatus === 'safe' ? 'success' : risk.overallStatus})` }}>{formatCurrency(risk.overallBuffer)}</strong></span>
          <span style={{ color: 'var(--text-secondary)' }}>Target: <strong>{formatCurrency(risk.targetRemaining)} left</strong></span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: '50%', background: `var(--${risk.overallStatus === 'safe' ? 'success' : risk.overallStatus})` }}></div>
          <div style={{ width: '50%', background: 'transparent' }}></div>
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={statusClass}>{account.status}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          {account.currency}
        </span>
      </div>
    </div>
  );
}
