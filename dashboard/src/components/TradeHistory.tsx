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
            <div key={trade.tradeId} className="mobile-list-item" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{trade.instrument}</span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: trade.direction === 'buy' ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 51, 102, 0.1)', color: trade.direction === 'buy' ? 'var(--accent-cyan)' : 'var(--danger-neon)', fontWeight: 600 }}>
                    {trade.direction === 'buy' ? 'MUA' : 'BÁN'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(trade.openTime).toLocaleDateString()} {new Date(trade.openTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} <span style={{ opacity: 0.5 }}>•</span> ⏱ {trade.duration}
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: isWin ? 'var(--success-neon)' : 'var(--danger-neon)' }}>
                  {formatCurrency(trade.pnl)}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-dim)' }}>
                  {trade.openPrice} → {trade.closePrice}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
