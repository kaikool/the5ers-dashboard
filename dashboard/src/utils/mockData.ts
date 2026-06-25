import { Trade } from '../types';

export const mockDrawdownData = Array.from({ length: 20 }).map((_, i) => {
  const day = i + 1;
  const balance = 100000 + (Math.random() * 2000 - 500) * (day * 0.1);
  return {
    day: `Day ${day}`,
    balance: Math.round(balance),
    equity: Math.round(balance - Math.random() * 500),
    dailyLimit: 95000,
    overallLimit: 90000,
  };
});

export const mockTradeHistory: Trade[] = [
  {
    tradeId: 'T1001',
    instrument: 'XAUUSD',
    direction: 'buy',
    volume: 1.5,
    openTime: new Date(Date.now() - 4 * 3600000).toISOString(),
    closeTime: new Date(Date.now() - 2 * 3600000).toISOString(),
    openPrice: 2345.5,
    closePrice: 2350.2,
    pnl: 705,
    pnlPoints: 47,
    fees: -10.5,
    duration: '2h 15m',
  },
  {
    tradeId: 'T1002',
    instrument: 'EURUSD',
    direction: 'sell',
    volume: 3.0,
    openTime: new Date(Date.now() - 24 * 3600000).toISOString(),
    closeTime: new Date(Date.now() - 22 * 3600000).toISOString(),
    openPrice: 1.0850,
    closePrice: 1.0870,
    pnl: -600,
    pnlPoints: -20,
    fees: -21.0,
    duration: '1h 45m',
  },
  {
    tradeId: 'T1003',
    instrument: 'GBPUSD',
    direction: 'buy',
    volume: 2.0,
    openTime: new Date(Date.now() - 48 * 3600000).toISOString(),
    closeTime: new Date(Date.now() - 40 * 3600000).toISOString(),
    openPrice: 1.2650,
    closePrice: 1.2700,
    pnl: 1000,
    pnlPoints: 50,
    fees: -14.0,
    duration: '8h 05m',
  },
];
