import { AccountOverview, AccountDetail } from '../types';
import { calculateRiskBuffer } from '../utils/risk';
import DrawdownChart from './DrawdownChart';
import TradeHistory from './TradeHistory';
import { mockDrawdownData, mockTradeHistory } from '../utils/mockData';

interface Props {
  account: AccountOverview;
  detail: AccountDetail | null;
  onClose: () => void;
  formatCurrency: (value: number) => string;
}

export default function DetailPanel({ account, detail, onClose, formatCurrency }: Props) {
  const risk = calculateRiskBuffer(account, detail);

  const getRiskMessage = () => {
    if (risk.dailyStatus === 'danger') return 'NGUY HIỂM: Sắp chạm mức Lỗ Tối Đa Trong Ngày. Ngừng giao dịch ngay.';
    if (risk.overallStatus === 'danger') return 'NGUY HIỂM: Sắp chạm mức Lỗ Tối Đa Tổng Thể. Tài khoản rủi ro cao.';
    if (risk.dailyStatus === 'warning') return 'CẢNH BÁO: Mức độ rủi ro tăng cao. Giảm khối lượng giao dịch.';
    return 'BÌNH THƯỜNG: Các thông số tài khoản đều trong ngưỡng an toàn.';
  };

  const metrics = [
    { label: 'Số Dư (Balance)', value: formatCurrency(detail?.balance ?? account.balance) },
    { label: 'Vốn Thực (Equity)', value: formatCurrency(detail?.equity ?? account.equity) },
    { label: 'Lợi Nhuận (P&L)', value: formatCurrency(detail?.pnl ?? account.pnl), color: (detail?.pnl ?? account.pnl) > 0 ? 'var(--success-neon)' : (detail?.pnl ?? account.pnl) < 0 ? 'var(--danger-neon)' : 'inherit' },
    { label: 'Sụt Giảm Ngày (Daily DD)', value: detail?.dailyDrawdown !== undefined ? `${detail.dailyDrawdown.toFixed(2)}%` : 'N/A' },
    { label: 'Sụt Giảm Tối Đa (Max DD)', value: detail?.maxDrawdown !== undefined ? `${detail.maxDrawdown.toFixed(2)}%` : 'N/A' },
    { label: 'Tỉ Lệ Thắng', value: detail?.winRate !== undefined ? `${detail.winRate.toFixed(1)}%` : 'N/A' },
    { label: 'Tổng Số Lệnh', value: detail?.totalTrades !== undefined ? String(detail.totalTrades) : 'N/A' },
    { label: 'Hệ Số Lợi Nhuận', value: detail?.profitFactor !== undefined ? detail.profitFactor.toFixed(2) : 'N/A' },
  ];

  return (
    <div className="detail-panel">
      <div className="detail-header" style={{ padding: '0 24px', paddingTop: 24 }}>
        <button className="btn-close" onClick={onClose} style={{ marginBottom: 24 }}>
          <span>←</span> Quay lại
        </button>
        <div>
          <h2 className="text-hero">{account.name}</h2>
          <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 14 }}>
            {account.accountId} // {account.type.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        <div className="metrics-grid-detail">
          {metrics.map(m => (
            <div key={m.label} className="metric-box">
              <div className="text-label">{m.label}</div>
              <div className="text-number-huge" style={{ fontSize: 24, color: m.color || 'var(--text-base)' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      <DrawdownChart data={mockDrawdownData} />
      <TradeHistory trades={detail?.trades || []} formatCurrency={formatCurrency} />

      {detail?.challenge && (
        <div style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span className="status-dot safe" style={{ background: 'var(--text-muted)', color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)', letterSpacing: '0.05em' }}>THÔNG SỐ THỬ THÁCH</span>
          </div>
          <div className="metrics-grid-detail">
            <div className="metric-box"><div className="text-label">Giai Đoạn</div><div className="text-number-huge" style={{ fontSize: 16 }}>{detail.challenge.phase}</div></div>
            <div className="metric-box"><div className="text-label">Mục Tiêu</div><div className="text-number-huge" style={{ fontSize: 16 }}>{formatCurrency(detail.challenge.profitTarget)}</div></div>
            <div className="metric-box"><div className="text-label">Tiến Độ</div><div className="text-number-huge" style={{ fontSize: 16 }}>{detail.challenge.profitTargetProgress.toFixed(1)}%</div></div>
            <div className="metric-box"><div className="text-label">Số Ngày Trade</div><div className="text-number-huge" style={{ fontSize: 16 }}>{detail.challenge.daysTraded} / {detail.challenge.minTradingDays}</div></div>
          </div>
        </div>
      )}

      {detail?.rules && detail.rules.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span className="status-dot safe" style={{ background: 'var(--text-muted)', color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)', letterSpacing: '0.05em' }}>QUY TẮC GIAO DỊCH</span>
          </div>
          <div className="mobile-list">
            {detail.rules.map((rule, i) => (
              <div key={i} className="mobile-list-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-base)' }}>{rule.ruleName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`status-dot ${rule.status === 'ok' ? 'safe' : rule.status === 'warning' ? 'warning' : 'danger'}`} />
                    <span style={{ textTransform: 'uppercase', fontSize: 11 }}>{rule.status}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 13 }}>
                  <div style={{ color: 'var(--text-dim)' }}>Hiện tại: <span style={{ color: 'var(--text-base)' }}>{rule.currentValue}</span></div>
                  <div style={{ color: 'var(--text-dim)' }}>Giới hạn: <span style={{ color: 'var(--text-base)' }}>{rule.limit}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!detail && (
        <div style={{ marginTop: 48, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Đang tải dữ liệu lệnh giao dịch từ mây...
        </div>
      )}
    </div>
  );
}
