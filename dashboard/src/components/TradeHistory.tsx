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
      <div className="mobile-list">
        {trades.map((trade) => {
          const isWin = trade.pnl > 0;
          return (
            <div key={trade.tradeId} className="mobile-list-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{trade.instrument}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {new Date(trade.openTime).toLocaleDateString()} {new Date(trade.openTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: isWin ? 'var(--success-neon)' : 'var(--danger-neon)' }}>
                    {formatCurrency(trade.pnl)}
                  </div>
                  <span className="tag" style={{ background: 'transparent', border: `1px solid var(--border-dim)`, color: trade.direction === 'buy' ? 'var(--accent-cyan)' : 'var(--danger-neon)', marginTop: 4, display: 'inline-block' }}>
                    {trade.direction.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '8px 12px', borderRadius: 6 }}>
                <div>{trade.openPrice} → {trade.closePrice}</div>
                <div>{trade.duration}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
