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
    if (risk.dailyStatus === 'danger') return 'CRITICAL RISK: Max Daily Loss approach. Stop trading immediately.';
    if (risk.overallStatus === 'danger') return 'CRITICAL RISK: Overall Drawdown approach. Account at risk.';
    if (risk.dailyStatus === 'warning') return 'WARNING: Elevated risk level. Reduce position sizing.';
    return 'SYSTEM NORMAL: Account metrics within safe boundaries.';
  };

  const metrics = [
    { label: 'Balance', value: formatCurrency(detail?.balance ?? account.balance) },
    { label: 'Equity', value: formatCurrency(detail?.equity ?? account.equity) },
    { label: 'P&L', value: formatCurrency(detail?.pnl ?? account.pnl), color: (detail?.pnl ?? account.pnl) > 0 ? 'var(--success-neon)' : (detail?.pnl ?? account.pnl) < 0 ? 'var(--danger-neon)' : 'inherit' },
    { label: 'Daily DD', value: detail ? `${detail.dailyDrawdown.toFixed(2)}%` : 'N/A' },
    { label: 'Max DD', value: detail ? `${detail.maxDrawdown.toFixed(2)}%` : 'N/A' },
    { label: 'Win Rate', value: detail ? `${detail.winRate.toFixed(1)}%` : 'N/A' },
    { label: 'Trades', value: detail ? String(detail.totalTrades) : 'N/A' },
    { label: 'Profit Factor', value: detail ? detail.profitFactor.toFixed(2) : 'N/A' },
  ];

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          <h2 className="text-hero" style={{ fontSize: 24 }}>{account.name}</h2>
          <div style={{ marginTop: 4, fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>
            {account.accountId} // {account.type.toUpperCase()} // {account.status.toUpperCase()}
          </div>
        </div>
        <button className="btn-close" onClick={onClose}>Close</button>
      </div>

      <div className={`risk-alert ${risk.dailyStatus}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className={`status-dot ${risk.dailyStatus}`} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '0.05em' }}>RISK MONITOR</span>
        </div>
        <div style={{ color: `var(--${risk.dailyStatus}-neon)`, fontSize: 14, marginBottom: 16 }}>
          {getRiskMessage()}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <div className="text-label">Daily Buffer</div>
            <div className="text-number-huge" style={{ fontSize: 20 }}>{formatCurrency(risk.dailyBuffer)}</div>
          </div>
          <div>
            <div className="text-label">Rec. Risk (1%)</div>
            <div className="text-number-huge" style={{ fontSize: 20 }}>{formatCurrency(account.balance * 0.01)}</div>
          </div>
          <div>
            <div className="text-label">Target Rem.</div>
            <div className="text-number-huge" style={{ fontSize: 20 }}>{formatCurrency(risk.targetRemaining)}</div>
          </div>
        </div>
      </div>

      <div className="metrics-grid-detail">
        {metrics.map(m => (
          <div key={m.label} className="metric-box">
            <div className="text-label">{m.label}</div>
            <div className="text-number-huge" style={{ fontSize: 20, color: m.color || 'var(--text-base)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <DrawdownChart data={mockDrawdownData} />
      <TradeHistory trades={mockTradeHistory} formatCurrency={formatCurrency} />

      {detail?.challenge && (
        <div style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span className="status-dot safe" style={{ background: 'var(--text-muted)', color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)', letterSpacing: '0.05em' }}>EVALUATION SPECS</span>
          </div>
          <div className="metrics-grid-detail">
            <div className="metric-box"><div className="text-label">Phase</div><div className="text-number-huge" style={{ fontSize: 16 }}>{detail.challenge.phase}</div></div>
            <div className="metric-box"><div className="text-label">Target</div><div className="text-number-huge" style={{ fontSize: 16 }}>{formatCurrency(detail.challenge.profitTarget)}</div></div>
            <div className="metric-box"><div className="text-label">Progress</div><div className="text-number-huge" style={{ fontSize: 16 }}>{detail.challenge.profitTargetProgress.toFixed(1)}%</div></div>
            <div className="metric-box"><div className="text-label">Days</div><div className="text-number-huge" style={{ fontSize: 16 }}>{detail.challenge.daysTraded} / {detail.challenge.minTradingDays}</div></div>
          </div>
        </div>
      )}

      {detail?.rules && detail.rules.length > 0 && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>RULE</th>
                <th>CURRENT</th>
                <th>LIMIT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {detail.rules.map((rule, i) => (
                <tr key={i}>
                  <td>{rule.ruleName}</td>
                  <td style={{ fontFamily: 'monospace' }}>{rule.currentValue}</td>
                  <td style={{ fontFamily: 'monospace' }}>{rule.limit}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`status-dot ${rule.status === 'ok' ? 'safe' : rule.status === 'warning' ? 'warning' : 'danger'}`} />
                      <span style={{ textTransform: 'uppercase', fontSize: 11 }}>{rule.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!detail && (
        <div style={{ marginTop: 48, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Simulated Data Only. Run local scraper for live metrics.
        </div>
      )}
    </div>
  );
}
