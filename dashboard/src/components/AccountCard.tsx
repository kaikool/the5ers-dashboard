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
  
  const getRiskMessage = () => {
    if (risk.dailyStatus === 'danger') return 'DỪNG TRADE: Đã Chạm Mức Lỗ Ngày';
    if (risk.overallStatus === 'danger') return 'NGUY HIỂM: Đã Chạm Mức Sụt Giảm Tối Đa';
    if (risk.dailyStatus === 'warning') return 'CẢNH BÁO: Giảm Thiểu Rủi Ro Lại';
    return 'AN TOÀN: Có Thể Giao Dịch Bình Thường';
  };

  return (
    <div className={`neo-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="card-top">
        <div>
          <div className="card-title">{account.name}</div>
        </div>
        <span className="tag">{account.type === 'demo' ? 'DEMO' : account.type.toUpperCase()}</span>
      </div>

      <div className={`risk-banner ${risk.dailyStatus}`}>
        <span className={`status-dot ${risk.dailyStatus}`} />
        {getRiskMessage()}
      </div>

      <div style={{ marginBottom: 32 }}>
        <div className="text-label" style={{ marginBottom: 4 }}>Biên Độ Ngày Còn Lại</div>
        <div className="text-number-huge" style={{ color: risk.dailyStatus === 'safe' ? 'var(--success-neon)' : `var(--${risk.dailyStatus}-neon)` }}>
          {formatCurrency(risk.dailyBuffer)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="text-label">Mục Tiêu Còn Lại</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(risk.targetRemaining)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="text-label">Lợi Nhuận (P&amp;L)</div>
          <div className={account.pnl > 0 ? 'value-green' : account.pnl < 0 ? 'value-red' : ''} style={{ fontSize: 20, fontWeight: 700 }}>
            {formatCurrency(account.pnl)}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span className="text-muted">Số Dư (Balance)</span>
          <span style={{ fontWeight: 700 }}>{formatCurrency(account.balance)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8 }}>
          <span className="text-muted">Biên Độ Rủi Ro Tổng Thể</span>
          <span style={{ fontWeight: 700, color: risk.overallStatus === 'safe' ? 'var(--success-neon)' : `var(--${risk.overallStatus}-neon)` }}>
            {formatCurrency(risk.overallBuffer)}
          </span>
        </div>
      </div>
    </div>
  );
}
