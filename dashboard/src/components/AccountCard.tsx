import { AccountOverview } from '../types';
import { calculateRiskBuffer } from '../utils/risk';

interface Props {
  account: AccountOverview;
  onClick: () => void;
  formatCurrency: (value: number) => string;
}

export default function AccountCard({ account, onClick, formatCurrency }: Props) {
  const risk = calculateRiskBuffer(account, null);

  const getRiskMessage = () => {
    if (risk.dailyStatus === 'danger') return { text: 'Chạm mức lỗ ngày', icon: 'dangerous' };
    if (risk.overallStatus === 'danger') return { text: 'Rủi ro tối đa', icon: 'warning' };
    if (risk.dailyStatus === 'warning') return { text: 'Cảnh báo rủi ro', icon: 'shield' };
    return { text: 'An toàn', icon: 'verified_user' };
  };

  const riskInfo = getRiskMessage();
  const chipClass = account.type === 'funded' ? 'funded' : account.type === 'evaluation' ? 'evaluation' : '';

  return (
    <div className="md3-card" onClick={onClick}>
      {/* Header */}
      <div className="card-header">
        <span className="card-name">{account.name}</span>
        <span className={`md3-chip ${chipClass}`}>
          {account.type === 'demo' ? 'Demo' : account.type === 'funded' ? 'Funded' : 'Eval'}
        </span>
      </div>

      {/* Risk Banner */}
      <div className={`risk-banner ${risk.dailyStatus}`}>
        <span className="material-symbols-rounded">{riskInfo.icon}</span>
        {riskInfo.text}
      </div>

      {/* Daily Buffer Highlight */}
      <div className="card-highlight">
        <div className="highlight-label">Biên độ ngày còn lại</div>
        <div
          className="highlight-value"
          style={{ color: risk.dailyStatus === 'safe' ? 'var(--color-profit)' : risk.dailyStatus === 'warning' ? 'var(--color-warn)' : 'var(--color-loss)' }}
        >
          {formatCurrency(risk.dailyBuffer)}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ marginTop: 16 }}>
        <div className="card-metric-row">
          <span className="metric-label">Số dư</span>
          <span className="metric-value">{formatCurrency(account.balance)}</span>
        </div>
        <div className="card-metric-row">
          <span className="metric-label">P&L</span>
          <span className="metric-value" style={{ color: account.pnl > 0 ? 'var(--color-profit)' : account.pnl < 0 ? 'var(--color-loss)' : undefined }}>
            {formatCurrency(account.pnl)}
          </span>
        </div>
        <div className="card-metric-row">
          <span className="metric-label">Mục tiêu còn lại</span>
          <span className="metric-value">{formatCurrency(risk.targetRemaining)}</span>
        </div>
        <div className="card-metric-row">
          <span className="metric-label">Biên độ tổng thể</span>
          <span className="metric-value" style={{ color: risk.overallStatus === 'safe' ? 'var(--color-profit)' : risk.overallStatus === 'warning' ? 'var(--color-warn)' : 'var(--color-loss)' }}>
            {formatCurrency(risk.overallBuffer)}
          </span>
        </div>
      </div>
    </div>
  );
}
