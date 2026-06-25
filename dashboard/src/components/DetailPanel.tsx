import { AccountOverview, AccountDetail } from '../types';
import { calculateRiskBuffer } from '../utils/risk';
import DrawdownChart from './DrawdownChart';
import TradeHistory from './TradeHistory';
import { mockDrawdownData } from '../utils/mockData';

interface Props {
  account: AccountOverview;
  detail: AccountDetail | null;
  onClose: () => void;
  formatCurrency: (value: number) => string;
}

export default function DetailPanel({ account, detail, onClose, formatCurrency }: Props) {
  const risk = calculateRiskBuffer(account, detail);

  const getRiskInfo = () => {
    if (risk.dailyStatus === 'danger') return { text: 'Nguy hiểm — Sắp chạm mức lỗ tối đa', status: 'danger', icon: 'dangerous' };
    if (risk.overallStatus === 'danger') return { text: 'Nguy hiểm — Rủi ro tổng thể cao', status: 'danger', icon: 'warning' };
    if (risk.dailyStatus === 'warning') return { text: 'Cảnh báo — Giảm khối lượng giao dịch', status: 'warning', icon: 'shield' };
    return { text: 'An toàn — Các thông số bình thường', status: 'safe', icon: 'verified_user' };
  };

  const riskInfo = getRiskInfo();

  const metrics = [
    { label: 'Số dư', value: formatCurrency(detail?.balance ?? account.balance) },
    { label: 'Vốn thực', value: formatCurrency(detail?.equity ?? account.equity) },
    {
      label: 'Lợi nhuận',
      value: formatCurrency(detail?.pnl ?? account.pnl),
      color: (detail?.pnl ?? account.pnl) > 0 ? 'var(--color-profit)' : (detail?.pnl ?? account.pnl) < 0 ? 'var(--color-loss)' : undefined
    },
    {
      label: 'DD Ngày',
      value: detail?.dailyDrawdown !== undefined ? formatCurrency(detail.dailyDrawdown) : 'N/A'
    },
    {
      label: 'DD Tối đa',
      value: detail?.maxDrawdown !== undefined ? formatCurrency(detail.maxDrawdown) : 'N/A'
    },
    {
      label: 'Tỉ lệ thắng',
      value: detail?.winRate !== undefined ? `${detail.winRate.toFixed(1)}%` : 'N/A'
    },
    {
      label: 'Tổng lệnh',
      value: detail?.totalTrades !== undefined ? String(detail.totalTrades) : 'N/A'
    },
    {
      label: 'Profit Factor',
      value: detail?.profitFactor !== undefined ? detail.profitFactor.toFixed(2) : 'N/A'
    },
  ];

  return (
    <div className="detail-panel">
      {/* ── Back Button ── */}
      <button className="btn-back" onClick={onClose}>
        <span className="material-symbols-rounded">arrow_back</span>
        Quay lại
      </button>

      {/* ── Header ── */}
      <div className="detail-header">
        <h2>{account.name}</h2>
        <div className="detail-subtitle">
          {account.accountId} • {account.type.toUpperCase()}
        </div>
      </div>

      {/* ── Risk Banner ── */}
      <div className={`risk-banner ${riskInfo.status}`}>
        <span className="material-symbols-rounded">{riskInfo.icon}</span>
        {riskInfo.text}
      </div>

      {/* ── Metrics Grid ── */}
      <div className="metrics-grid">
        {metrics.map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: m.color || 'var(--md-on-surface)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <DrawdownChart data={mockDrawdownData} />

      {/* ── Trade History ── */}
      <TradeHistory trades={detail?.trades || []} formatCurrency={formatCurrency} />

      {/* ── Loading State ── */}
      {!detail && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 12 }}>
          <div className="loading-spinner" />
          <span style={{ font: 'var(--md-body-medium)', color: 'var(--md-on-surface-variant)' }}>
            Đang tải dữ liệu giao dịch...
          </span>
        </div>
      )}
    </div>
  );
}
