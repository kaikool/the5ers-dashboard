import { Trade } from '../types';

interface Props {
  trades: Trade[];
  formatCurrency: (value: number) => string;
}

export default function TradeHistory({ trades, formatCurrency }: Props) {
  if (!trades || trades.length === 0) return null;

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span className="status-dot safe" style={{ background: 'var(--text-muted)', color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)', letterSpacing: '0.05em' }}>RECENT TRADES</span>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>SYMBOL</th>
              <th>TYPE</th>
              <th>ENTRY/EXIT</th>
              <th>DURATION</th>
              <th style={{ textAlign: 'right' }}>P&L</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const isWin = trade.pnl > 0;
              return (
                <tr key={trade.tradeId}>
                  <td>
                    <div style={{ color: 'var(--text-base)' }}>{new Date(trade.openTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{new Date(trade.openTime).toLocaleDateString()}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{trade.instrument}</td>
                  <td>
                    <span className="tag" style={{ background: 'transparent', border: `1px solid var(--border-dim)`, color: trade.direction === 'buy' ? 'var(--accent-cyan)' : 'var(--danger-neon)' }}>
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>
                    <div style={{ color: 'var(--text-base)' }}>{trade.openPrice}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>→ {trade.closePrice}</div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{trade.duration}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: isWin ? 'var(--success-neon)' : 'var(--danger-neon)' }}>
                    {formatCurrency(trade.pnl)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
