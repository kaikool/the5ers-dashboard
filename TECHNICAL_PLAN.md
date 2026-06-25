# Technical Plan — The5ers Personal Dashboard

## 1. Tổng quan kiến trúc

```
┌─────────────────────┐      ┌──────────────────────┐
│   Playwright Scraper │      │  Vite + React SPA    │
│   (Node.js, chạy     │─────▶│  (Dashboard)          │
│    local)             │ JSON │  - Đọc data/*.json    │
│                      │      │  - Hiển thị biểu đồ   │
│   Login thủ công      │      │  - Deploy lên Vercel  │
│   → Scrape DOM       │      │    (static)            │
└─────────────────────┘      └──────────────────────┘
         ▲                            │
         │ đọc DOM, không gửi request │
         │ chỉ GET, không POST        │
         │                            │
    ┌──────────────────┐              │
    │ hub.the5ers.com  │              │
    │ (SPA React + MUI)│              │
    └──────────────────┘              │
                                      ▼
                              ┌──────────────────┐
                              │  Vercel (static)  │
                              │  the5ers-dash.vercel.app │
                              └──────────────────┘
```

## 2. Components

### Scraper (`scraper/`)
- **Công nghệ**: Node.js + Playwright
- **Flow**:
  1. Mở trình duyệt (headed mode — có GUI để login)
  2. Navigate đến `https://hub.the5ers.com/en/`
  3. **Chờ user tự login** (email/password hoặc Google) — không code credentials
  4. Detect login thành công bằng URL change hoặc element presence
  5. Scrape các page:
     - Dashboard (`/en/dashboard`)
     - Accounts list (`/en/accounts`)
     - Từng account detail (`/en/accounts/{id}`) nếu có
     - Trading history / export nếu hub hỗ trợ
  6. Ghi JSON vào `data/`

### Dashboard (`dashboard/`)
- **Công nghệ**: Vite + React + TypeScript
- **Chức năng**:
  - Hiển thị danh sách account (card view)
  - Chọn account để theo dõi (toggle follow)
  - Balance / Equity / P&L
  - Daily drawdown chart
  - Challenge status badges
  - Trading history table
- **Deploy**: Vercel static export
- **Data source**: JSON files trong `data/` — local dev, hoặc upload lên Vercel kèm build

## 3. Data flow

```
Scraper (local)
  │
  ├── data/profile.json         ← thông tin user + danh sách account
  ├── data/accounts.json        ← chi tiết từng account
  ├── data/account_{id}.json    ← mỗi account 1 file
  └── data/trading_history.json ← lịch sử giao dịch

Dashboard (local / Vercel)
  └── src/data/ ← copy từ scraper/data/ khi build
```

## 4. Routes cần scrape (ước lượng từ DOM analysis)

| Route | Nội dung |
|-------|----------|
| `/en/dashboard` | Tổng quan: balance, equity, P&L, account cards |
| `/en/accounts` | Danh sách tất cả accounts + status |
| `/en/accounts/{id}` | Chi tiết 1 account: metrics, daily P&L, rules |
| `/en/trading-history` hoặc modal export | Lịch sử giao dịch |

## 5. File structure

```
the5ers-dashboard/
├── scraper/
│   ├── package.json
│   ├── scrape.mjs              # Main script
│   ├── lib/
│   │   ├── wait-for-login.mjs  # Chờ user login
│   │   ├── scrape-dashboard.mjs
│   │   ├── scrape-accounts.mjs
│   │   └── utils.mjs
│   └── data/                   # Output (gitignored)
│       └── .gitkeep
├── dashboard/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.tsx
│       ├── types.ts            # Schema types
│       ├── data/               # Copied JSON (gitignored)
│       ├── components/
│       │   ├── AccountCard.tsx
│       │   ├── MetricsGrid.tsx
│       │   ├── DrawdownChart.tsx
│       │   └── TradingHistory.tsx
│       └── hooks/
│           └── useData.ts
├── TECHNICAL_PLAN.md
├── DATA_SCHEMA.md
└── RISKS.md
```

## 6. Run instructions

```bash
# Scraper
cd scraper
npm install
node scrape.mjs
# → Browser mở ra, login thủ công, tự động scrape

# Dashboard (dev)
cd dashboard
npm install
npm run dev
# → http://localhost:5173

# Dashboard (build + deploy)
cd dashboard
npm run build
npx vercel --prod
```
