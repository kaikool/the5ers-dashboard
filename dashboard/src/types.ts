// ─── Data Types ───────────────────────────────────────────────────────────────

export type AccountType = string;

export type AccountStatus = string;

export interface AccountOverview {
  accountId: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
  balance: number;
  equity: number;
  pnl: number;
  pnlPercent?: number;
  currency?: string;
  _rawStats?: any;
}

export interface Purchase {
  id: string;
  productName: string;
  buyingPower: number;
  price: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface Profile {
  userName: string;
  email?: string;
  scrapedAt: string;
  accounts: AccountOverview[];
  purchases?: Purchase[];
}

export interface ChallengeInfo {
  phase: string;
  profitTarget: number;
  profitTargetProgress: number;
  minTradingDays: number;
  daysTraded: number;
  daysRemaining: number;
  lossLimit: number;
  breaches: number;
}

export interface TradingRule {
  ruleName: string;
  status: 'ok' | 'warning' | 'breached' | 'na';
  currentValue: number;
  limit: number;
  description: string;
}

export interface AccountDetail {
  accountId: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
  currency: string;
  scrapedAt: string;
  balance: number;
  equity: number;
  pnl: number;
  pnlPercent: number;
  floatingPnl: number;
  dailyDrawdown: number;
  dailyDrawdownLimit: number;
  maxDrawdown: number;
  maxDrawdownLimit: number;
  maxDrawdownPeriod: string;
  challenge?: ChallengeInfo;
  rules: TradingRule[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  totalDaysTraded: number;
  consistencyTarget?: number;
  createdAt: string;
  expiresAt?: string;
  lastActivityAt?: string;
  trades?: Trade[];
}

export interface Trade {
  tradeId: string;
  instrument: string;
  direction: 'buy' | 'sell';
  volume: number;
  openTime: string;
  closeTime: string;
  openPrice: number;
  closePrice: number;
  pnl: number;
  pnlPoints: number;
  fees: number;
  duration: string;
  strategy?: string;
}

export interface TradingHistory {
  accountId: string;
  scrapedAt: string;
  trades: Trade[];
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppState {
  profile: Profile | null;
  selectedAccountIds: string[];
  loading: boolean;
  error: string | null;
}
