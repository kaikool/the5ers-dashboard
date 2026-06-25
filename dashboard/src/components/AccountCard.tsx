import { AccountOverview } from '../types';
import { calculateRiskBuffer } from '../utils/risk';

interface Props {
  account: AccountOverview;
  selected: boolean;
  onClick: () => void;
  formatCurrency: (value: number) => string;
}

export default function AccountCard({ account, selected, onClick, formatCurrency }: Props) {
  const risk = calculateRiskBuffer(account, null);
  
  const pnlClass = account.pnl > 0 ? 'value-green' : account.pnl < 0 ? 'value-red' : '';
  const progressPercent = Math.min(100, Math.max(0, ((account.balance * 0.1 - risk.targetRemaining) / (account.balance * 0.1)) * 100));

  return (
    <div className={`neo-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="card-top">
        <div>
          <div className="card-title">{account.name}</div>
          <div className="card-id">{account.accountId}</div>
        </div>
        <div>
          <span className="tag">{account.type}</span>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div className="text-label" style={{ marginBottom: 4 }}>Balance</div>
        <div className="text-number-huge">{formatCurrency(account.balance)}</div>
      </div>

      <div className="metrics-row">
        <div>
          <div className="text-label">P&amp;L</div>
          <div className={`card-title ${pnlClass}`} style={{ fontSize: 18 }}>{formatCurrency(account.pnl)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="text-label">Daily Buffer</div>
          <div className="card-title" style={{ fontSize: 18, color: risk.dailyStatus === 'safe' ? 'var(--success-neon)' : `var(--${risk.dailyStatus}-neon)` }}>
            {formatCurrency(risk.dailyBuffer)}
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>Overall Buffer: <strong style={{ color: 'var(--text-base)' }}>{formatCurrency(risk.overallBuffer)}</strong></span>
          <span>Target: <strong style={{ color: 'var(--text-base)' }}>{formatCurrency(risk.targetRemaining)}</strong></span>
        </div>
        <div className="line-progress">
          <div className="line-fill" style={{ width: `${progressPercent || 50}%`, background: risk.overallStatus === 'safe' ? 'var(--accent-cyan)' : `var(--${risk.overallStatus}-neon)` }} />
        </div>
      </div>
    </div>
  );
}
