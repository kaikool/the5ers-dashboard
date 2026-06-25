#!/usr/bin/env node
/**
 * The5ers API Scraper
 * 
 * Dùng Rest API (ko cần Playwright). Chạy được ở bất kỳ đâu:
 * - Local:  node scrape-api.mjs
 * - GitHub Actions / Vercel / Cloudflare Workers
 * 
 * Yêu cầu: cookies.json (export từ Chrome 1 lần)
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const BASE = 'https://api.the5ers.com';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

async function apiFetch(path, token) {
  const url = `${BASE}${path}`;
  const resp = await globalThis.fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'the5ers-dashboard/0.1',
      'Accept': 'application/json',
    },
  });
  if (!resp.ok) {
    throw new Error(`${path} → ${resp.status} ${await resp.text().catch(() => '')}`);
  }
  return resp.json();
}

function save(filename, data) {
  const path = join(DATA_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✅ ${filename} saved`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   The5ers API Scraper v0.2          ║');
  console.log('╚══════════════════════════════════════╝\n');

  ensureDir();

  // Đọc token từ cookies
  const cookiePath = join(__dirname, 'cookies.json');
  if (!existsSync(cookiePath)) {
    console.error('❌ Thiếu cookies.json. Bố export từ Chrome (Cookie-Editor) rồi lưu vào scraper/cookies.json');
    process.exit(1);
  }
  
  const cookies = JSON.parse(readFileSync(cookiePath, 'utf-8'));
  const ds = cookies.find(c => c.name === 'DS');
  if (!ds) {
    console.error('❌ Không tìm thấy DS cookie');
    process.exit(1);
  }
  const token = ds.value;
  console.log(`🔑 Token: ${token.substring(0, 20)}... (${token.length} chars)`);

  // 1. User info
  console.log('\n📡 Fetching user...');
  const userResp = await apiFetch('/user', token);
  const user = userResp.data || {};
  console.log(`   👤 ${user.firstName || ''} ${user.lastName || ''} (${user.email || ''})`);

  // 2. Account logins — bộ sưu tập tất cả accounts
  console.log('\n📡 Fetching accounts...');
  const loginsResp = await apiFetch('/account/logins', token);
  const allLogins = loginsResp.data?.logins || user.tsUsers || [];
  
  // Filter: chỉ lấy account có externalId (loại bỏ purchases, contests, v.v.)
  const accounts = allLogins.filter(a => a.externalId).slice(0, 30);
  console.log(`   📊 ${allLogins.length} total entries, ${accounts.length} real accounts`);

  // 3. Chi tiết từng account
  const profile = {
    userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    email: user.email || '',
    userId: user.userId || '',
    scrapedAt: new Date().toISOString(),
    accounts: [],
  };

  for (const acc of accounts) {
    const aid = acc.externalId;
    const accountType = acc.accountType || 'evaluation';
    
    console.log(`\n📡 Fetching account ${aid} (${accountType})...`);
    
    const detail = {
      accountId: aid,
      name: `${accountType} #${aid}`,
      type: accountType,
      status: 'active',
      currency: 'USD',
      tradingSystem: acc.tradingSystem || '',
    };

    // Balance
    try {
      const balResp = await apiFetch(`/account/${aid}/balance`, token);
      const bal = balResp.data || {};
      Object.assign(detail, {
        balance: bal.balance ?? 0,
        equity: bal.equity ?? 0,
        pnl: bal.profitAndLoss ?? 0,
        baseBalance: bal.baseBalance ?? 0,
        maxLoss: bal.maxLoss ?? 0,
        dailyDrawdown: bal.drawdown ?? 0,
        maxDrawdown: bal.maxDrawdown ?? 0,
        floatingPnl: bal.unrealized ?? 0,
      });
    } catch (e) {
      console.log(`   ⚠️ Balance: ${e.message}`);
    }

    // Stats
    try {
      const statsResp = await apiFetch(`/account/${aid}/stats`, token);
      const s = statsResp.data || {};
      Object.assign(detail, {
        totalTrades: s.totalTrades ?? 0,
        winRate: s.winRate ?? 0,
        profitFactor: s.profitFactor ?? 0,
        avgWin: s.avgProfit ?? 0,
        avgLoss: s.avgLoss ?? 0,
        largestWin: s.largestWin ?? 0,
        largestLoss: s.largestLoss ?? 0,
        totalDaysTraded: s.totalDaysTraded ?? 0,
      });
    } catch (e) {
      console.log(`   ⚠️ Stats: ${e.message}`);
    }

    // Midnight history (daily snapshots) — optional
    try {
      const midResp = await apiFetch(`/account/${aid}/midnight-history`, token);
      detail.dailyHistory = (midResp.data || []).slice(-30);
    } catch (_) {
      // optional — không phải account nào cũng có midnight history
    }

    console.log(`   💰 $${detail.balance} | P&L: $${detail.pnl} | 📈 ${detail.totalTrades} trades`);
    
    profile.accounts.push(detail);
  }

  // 4. Save
  save('profile.json', profile);

  // Báo cáo
  console.log('\n═══ REPORT ═══');
  for (const acc of profile.accounts) {
    const pnlSign = acc.pnl >= 0 ? '+' : '';
    console.log(`  ${acc.accountId.padEnd(10)} ${acc.type.padEnd(12)} $${String(acc.balance).padEnd(10)} ${pnlSign}$${acc.pnl.toFixed(2)}`);
  }
  
  console.log(`\n✅ Done! ${profile.accounts.length} accounts scraped.`);
  console.log(`📁 Data: ${DATA_DIR}/`);
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
