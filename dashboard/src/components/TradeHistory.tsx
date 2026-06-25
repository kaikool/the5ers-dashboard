import { Trade } from '../types';

interface Props {
  trades: Trade[];
  formatCurrency: (value: number) => string;
}

export default function TradeHistory({ trades, formatCurrency }: Props) {
  if (!trades || trades.length === 0) return null;

  return (
    <div style={{ marginTop: 48, padding: '0 24px', paddingBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span className="status-dot safe" style={{ background: 'var(--text-dim)' }} />
        <span className="text-label">LỊCH SỬ GIAO DỊCH</span>
      </div>
      <div className="mobile-list">
        {trades.map((trade) => {
          const isWin = trade.pnl > 0;
          return (
            <div key={trade.tradeId} className="mobile-list-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{trade.instrument}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(trade.openTime).toLocaleDateString()} {new Date(trade.openTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: isWin ? 'var(--success-neon)' : 'var(--danger-neon)' }}>
                    {formatCurrency(trade.pnl)}
                  </div>
                  <span className="tag" style={{ color: trade.direction === 'buy' ? 'var(--accent-cyan)' : 'var(--danger-neon)', marginTop: 4, display: 'inline-block' }}>
                    {trade.direction === 'buy' ? 'MUA' : 'BÁN'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: 8, fontWeight: 500 }}>
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
