import { AccountOverview, AccountDetail } from '../types';

export interface RiskMetrics {
  dailyBuffer: number;
  overallBuffer: number;
  dailyStatus: 'safe' | 'warning' | 'danger';
  overallStatus: 'safe' | 'warning' | 'danger';
  targetRemaining: number;
}

export function calculateRiskBuffer(account: AccountOverview, detail: AccountDetail | null): RiskMetrics {
  // If detail is missing, we use some placeholder logic based on balance,
  // assuming typical 5% daily / 10% overall limits
  const startBalance = account.balance - account.pnl;
  const dailyLimitPercent = detail?.dailyDrawdownLimit || 5;
  const overallLimitPercent = detail?.maxDrawdownLimit || 10;

  const dailyLimitAmt = (startBalance * dailyLimitPercent) / 100;
  const overallLimitAmt = (startBalance * overallLimitPercent) / 100;

  // Drawdown in dollars
  const currentDailyDD = detail ? detail.dailyDrawdown : 0; 
  const currentOverallDD = detail ? detail.maxDrawdown : (account.pnl < 0 ? Math.abs(account.pnl) : 0);

  const dailyBuffer = Math.max(0, dailyLimitAmt - currentDailyDD);
  const overallBuffer = Math.max(0, overallLimitAmt - currentOverallDD);

  // Status calculation
  // Danger: < 20% buffer left
  // Warning: < 40% buffer left
  const getStatus = (buffer: number, limit: number) => {
    if (limit === 0) return 'safe';
    const ratio = buffer / limit;
    if (ratio < 0.2) return 'danger';
    if (ratio < 0.4) return 'warning';
    return 'safe';
  };

  const dailyStatus = getStatus(dailyBuffer, dailyLimitAmt);
  const overallStatus = getStatus(overallBuffer, overallLimitAmt);

  const target = detail?.challenge?.profitTarget || (startBalance * 0.1); // assume 10% target if missing
  const targetRemaining = Math.max(0, target - Math.max(0, account.pnl));

  return {
    dailyBuffer,
    overallBuffer,
    dailyStatus,
    overallStatus,
    targetRemaining,
  };
}
