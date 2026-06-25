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

  const metrics = [
    { label: 'Balance', value: formatCurrency(detail?.balance ?? account.balance), color: '' },
    { label: 'Equity', value: formatCurrency(detail?.equity ?? account.equity), color: '' },
    {
      label: 'P&L',
      value: formatCurrency(detail?.pnl ?? account.pnl),
      color: (detail?.pnl ?? account.pnl) > 0 ? 'var(--success)' : (detail?.pnl ?? account.pnl) < 0 ? 'var(--danger)' : '',
    },
    { label: 'Daily DD', value: detail ? `${detail.dailyDrawdown.toFixed(2)}%` : 'N/A', color: '' },
    { label: 'Max DD', value: detail ? `${detail.maxDrawdown.toFixed(2)}%` : 'N/A', color: '' },
    { label: 'Win Rate', value: detail ? `${detail.winRate.toFixed(1)}%` : 'N/A', color: '' },
    { label: 'Trades', value: detail ? String(detail.totalTrades) : 'N/A', color: '' },
    { label: 'Profit Factor', value: detail ? detail.profitFactor.toFixed(2) : 'N/A', color: '' },
  ];

  const getRiskMessage = () => {
    if (risk.dailyStatus === 'danger') return '⚠️ NGUY HIỂM: Tài khoản sắp chạm ngưỡng Daily Loss. Tuyệt đối không vào thêm lệnh mới hôm nay.';
    if (risk.overallStatus === 'danger') return '⚠️ NGUY HIỂM: Tài khoản sắp chạm Max Drawdown. Cần xem xét lại toàn bộ chiến lược.';
    if (risk.dailyStatus === 'warning') return '⚡ CẢNH BÁO: Bạn đã lỗ khá nhiều hôm nay. Cân nhắc giảm volume hoặc dừng giao dịch.';
    return '✅ AN TOÀN: Tài khoản đang trong ngưỡng an toàn. Tiếp tục duy trì kỷ luật.';
  };

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          <h2>{account.name}</h2>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            ID: {account.accountId} · {account.type} · {account.status}
          </span>
        </div>
        <button className="close-btn" onClick={onClose}>✕ Đóng</button>
      </div>

      {/* AI Risk Conclusion */}
      <div className="rules-section" style={{ marginBottom: 24, background: risk.dailyStatus === 'danger' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(0,0,0,0.2)' }}>
        <h3>🤖 Cố vấn rủi ro (Risk Monitor)</h3>
        <p style={{ color: `var(--${risk.dailyStatus === 'safe' ? 'success' : risk.dailyStatus})`, fontWeight: 600, marginBottom: 12, lineHeight: 1.4 }}>
          {getRiskMessage()}
        </p>
        <div className="risk-metrics-mobile">
          <div>Daily Buffer còn lại: <strong style={{ color: 'var(--success)' }}>{formatCurrency(risk.dailyBuffer)}</strong></div>
          <div>Risk/lệnh (1%): <strong>{formatCurrency((account.balance * 0.01))}</strong></div>
          <div>Cần thêm để Pass: <strong>{formatCurrency(risk.targetRemaining)}</strong></div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {metrics.map((m) => (
          <div className="metric-item" key={m.label}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={m.color ? { color: m.color } : undefined}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Drawdown Chart (Mocked) */}
      <DrawdownChart data={mockDrawdownData} />

      {/* Trade History (Mocked) */}
      <TradeHistory trades={mockTradeHistory} formatCurrency={formatCurrency} />

      {/* Challenge Info */}
      {detail?.challenge && (
        <div className="rules-section" style={{ marginBottom: 16 }}>
          <h3>📋 Challenge / Evaluation</h3>
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            <div className="metric-item">
              <div className="metric-label">Phase</div>
              <div className="metric-value" style={{ fontSize: 16 }}>{detail.challenge.phase}</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Profit Target</div>
              <div className="metric-value" style={{ fontSize: 16 }}>{formatCurrency(detail.challenge.profitTarget)}</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Progress</div>
              <div className="metric-value" style={{ fontSize: 16 }}>{detail.challenge.profitTargetProgress.toFixed(1)}%</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Days Traded</div>
              <div className="metric-value" style={{ fontSize: 16 }}>{detail.challenge.daysTraded} / {detail.challenge.minTradingDays}</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Days Left</div>
              <div className="metric-value" style={{ fontSize: 16 }}>{detail.challenge.daysRemaining}</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Breaches</div>
              <div className="metric-value" style={{ fontSize: 16, color: detail.challenge.breaches > 0 ? 'var(--danger)' : '' }}>
                {detail.challenge.breaches}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Rules */}
      {detail?.rules && detail.rules.length > 0 && (
        <div className="rules-section">
          <h3>⚖️ Trading Rules</h3>
          <table className="rules-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Current</th>
                <th>Limit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.rules.map((rule, i) => (
                <tr key={i}>
                  <td>{rule.ruleName}</td>
                  <td>{rule.currentValue}</td>
                  <td>{rule.limit}</td>
                  <td>
                    <span className={`rule-status ${rule.status}`} />
                    {rule.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!detail && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 14 }}>
          Sử dụng dữ liệu Mock. Chạy scraper để tải dữ liệu chi tiết thực tế.
        </div>
      )}
    </div>
  );
}
