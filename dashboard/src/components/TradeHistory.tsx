import { Trade } from '../types';

interface Props {
  trades: Trade[];
  formatCurrency: (value: number) => string;
}

export default function TradeHistory({ trades, formatCurrency }: Props) {
  if (!trades || trades.length === 0) return null;

  return (
    <div className="history-section">
      <h3>📜 Lịch sử giao dịch gần đây</h3>
      <div style={{ overflowX: 'auto' }}>
        <div className="trade-header">
          <div>Time</div>
          <div>Symbol</div>
          <div>Type</div>
          <div>Entry / Exit</div>
          <div>Duration</div>
          <div style={{ textAlign: 'right' }}>P&amp;L</div>
        </div>
        {trades.map((trade) => {
          const isWin = trade.pnl > 0;
          return (
            <div className="trade-row" key={trade.tradeId}>
              <div>
                <div style={{ color: 'var(--text-primary)' }}>{new Date(trade.openTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(trade.openTime).toLocaleDateString()}</div>
              </div>
              <div style={{ fontWeight: 600 }}>{trade.instrument}</div>
              <div>
                <span className={`status-pill ${trade.direction === 'buy' ? 'status-active' : 'status-breached'}`}>
                  {trade.direction.toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ color: 'var(--text-primary)' }}>{trade.openPrice}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>→ {trade.closePrice}</div>
              </div>
              <div>{trade.duration}</div>
              <div style={{ textAlign: 'right', fontWeight: 600, color: isWin ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(trade.pnl)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
