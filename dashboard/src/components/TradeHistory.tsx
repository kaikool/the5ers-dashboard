import { Trade } from '../types';

interface Props {
  trades: Trade[];
  formatCurrency: (value: number) => string;
}

export default function TradeHistory({ trades, formatCurrency }: Props) {
  if (!trades || trades.length === 0) return null;

  return (
    <div className="trade-list-section">
      <div className="section-label">
        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>swap_vert</span>
        Lịch sử giao dịch ({trades.length})
      </div>

      <div className="trade-list">
        {trades.map((trade) => {
          const isWin = trade.pnl > 0;
          const dirClass = trade.direction === 'buy' ? 'buy' : 'sell';
          const dirIcon = trade.direction === 'buy' ? 'trending_up' : 'trending_down';
          const dirLabel = trade.direction === 'buy' ? 'Mua' : 'Bán';

          return (
            <div key={trade.tradeId} className="trade-item">
              <div className="trade-leading">
                <div className={`trade-icon ${dirClass}`}>
                  <span className="material-symbols-rounded">{dirIcon}</span>
                </div>
                <div className="trade-info">
                  <div className="trade-headline">
                    {trade.instrument} <span style={{ font: 'var(--md-label-small)', opacity: 0.7 }}>• {dirLabel}</span>
                  </div>
                  <div className="trade-supporting">
                    {new Date(trade.openTime).toLocaleDateString('vi-VN')} {new Date(trade.openTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {trade.duration}
                  </div>
                </div>
              </div>

              <div className="trade-trailing">
                <div className={`trade-pnl ${isWin ? 'text-profit' : 'text-loss'}`}>
                  {formatCurrency(trade.pnl)}
                </div>
                <div className="trade-prices">
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
