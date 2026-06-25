# Data Schema — The5ers Dashboard

## 📦 File: `profile.json`

Thông tin user profile + danh sách account tổng quan.

```typescript
interface Profile {
  /** Tên hiển thị của user */
  userName: string;
  /** Email đăng nhập */
  email: string;
  /** Thời gian scrape */
  scrapedAt: string; // ISO 8601
  /** Danh sách tài khoản */
  accounts: AccountOverview[];
}

interface AccountOverview {
  /** ID tài khoản */
  accountId: string;
  /** Tên hiển thị (vd: 'Evaluation 1', 'Funded 2') */
  name: string;
  /** Loại tài khoản */
  type: AccountType;
  /** Trạng thái hiện tại */
  status: AccountStatus;
  /** Balance hiện tại */
  balance: number;
  /** Equity hiện tại */
  equity: number;
  /** P&L (realized + unrealized) */
  pnl: number;
  /** P&L % */
  pnlPercent: number;
  /** Currency (vd: 'USD') */
  currency: string;
}

type AccountType =
  | 'evaluation'   // Challenge đang trong quá trình đánh giá
  | 'funded'       // Tài khoản funded — đã pass challenge
  | 'demo'         // Demo account
  | 'contest'      // Tài khoản thi đấu
  | 'competition'; // Tài khoản competition

type AccountStatus =
  | 'active'
  | 'inactive'
  | 'paused'
  | 'breached'     // Vi phạm rule
  | 'completed'    // Hoàn thành evaluation
  | 'graduated';   // Tốt nghiệp lên cấp cao hơn
```

---

## 📦 File: `account_{id}.json`

Chi tiết một tài khoản cụ thể.

```typescript
interface AccountDetail {
  accountId: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
  currency: string;
  scrapedAt: string; // ISO 8601

  // === Financial Metrics ===
  balance: number;
  equity: number;
  pnl: number;
  pnlPercent: number;
  floatingPnl: number;
  
  // === Drawdown ===
  dailyDrawdown: number;       // % drawdown hôm nay
  dailyDrawdownLimit: number;  // Giới hạn daily drawdown
  maxDrawdown: number;         // % max drawdown từ đầu
  maxDrawdownLimit: number;    // Giới hạn max drawdown
  maxDrawdownPeriod: string;   // Kỳ tính max drawdown (vd: 'all_time', 'trailing')

  // === Challenge/Evaluation ===
  challenge?: ChallengeInfo;

  // === Trading Rules ===
  rules: TradingRule[];

  // === Performance ===
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;             // %
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  totalDaysTraded: number;
  consistencyTarget?: number;  // Target consistency nếu có

  // === Timelines ===
  createdAt: string;           // ISO 8601
  expiresAt?: string;          // Ngày hết hạn challenge
  lastActivityAt?: string;     // Giao dịch gần nhất
}

interface ChallengeInfo {
  /** Phase hiện tại (vd: 'Phase 1', 'Phase 2', 'Funded') */
  phase: string;
  /** Profit target cho phase hiện tại */
  profitTarget: number;
  /** Progress % đến profit target */
  profitTargetProgress: number;
  /** Số ngày tối thiểu cần giao dịch */
  minTradingDays: number;
  /** Số ngày đã giao dịch */
  daysTraded: number;
  /** Số ngày còn lại */
  daysRemaining: number;
  /** Loss limit cho phase */
  lossLimit: number;
  /** Rule breach count */
  breaches: number;
}

interface TradingRule {
  ruleName: string;            // 'Daily Drawdown', 'Max Drawdown', 'Consistency'
  status: 'ok' | 'warning' | 'breached' | 'na';
  currentValue: number;
  limit: number;
  description: string;
}
```

---

## 📦 File: `trading_history.json`

Lịch sử giao dịch (nếu hub hỗ trợ export hoặc hiển thị).

```typescript
interface TradingHistory {
  accountId: string;
  scrapedAt: string;
  trades: Trade[];
}

interface Trade {
  tradeId: string;
  instrument: string;        // 'EURUSD', 'BTCUSD', etc.
  direction: 'buy' | 'sell';
  volume: number;            // Lots
  openTime: string;          // ISO 8601
  closeTime: string;         // ISO 8601
  openPrice: number;
  closePrice: number;
  pnl: number;
  pnlPoints: number;
  fees: number;
  duration: string;          // '2h 15m'
  strategy?: string;         // Tag/strategy nếu có
}
```

---

## 🗺 Mapping từ DOM sang Schema

Hub dùng Ant Design + MUI, class naming convention kiểu Ant Design:
- `ant-table` / `ant-card` / `ant-statistic`
- `MuiTypography-root`
- Class custom: `.account-card`, `.metric-value`, `.status-badge`

Các element cần tìm:
| Dữ liệu | Selector gợi ý |
|----------|---------------|
| Account name | `.account-card .account-name` hoặc `[class*="accountName"]` |
| Balance | `.ant-statistic-content-value` |
| Equity | Selector chứa text "Equity" sibling value |
| P&L | Text chứa dấu "+" hoặc "-" kèm số |
| Status badge | `.status-badge` hoặc `[class*="status"]` |
| Drawdown | Selector chứa "drawdown" |
| Trading rules | Table row trong `ant-table` |
