#!/usr/bin/env node
/**
 * The5ers Cloud Scraper — chạy trên GitHub Actions
 * 
 * Cơ chế:
 * 1. Dùng `page.route` để intercept mọi request đến api.the5ers.com
 * 2. Tự động inject Authorization header (Bearer token từ cookie)
 * 3. Nếu API trả về 401 (token hết hạn), tự động lấy token mới từ cookie
 * 4. Không cần Descope SDK, không cần browser refresh token
 */

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = 'https://api.the5ers.com';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadCookies() {
  const env = process.env.THE5ERS_COOKIES;
  if (env) return JSON.parse(env);
  const fp = join(__dirname, 'cookies.json');
  if (existsSync(fp)) return JSON.parse(readFileSync(fp, 'utf-8'));
  return null;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function save(name, data) {
  writeFileSync(join(DATA_DIR, name), JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✅ ${name}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  The5ers Cloud Scraper v2.0         ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Load cookies
  const cookiesList = loadCookies();
  if (!cookiesList) {
    console.error('❌ No cookies found');
    process.exit(1);
  }
  
  const dsCookie = cookiesList.find(c => c.name === 'DS');
  if (!dsCookie) {
    console.error('❌ No DS cookie found');
    process.exit(1);
  }
  
  console.log(`📦 Loaded ${cookiesList.length} cookies, DS=${dsCookie.value.substring(0, 30)}...`);

  // Launch browser
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();
  
  // ─── Intercept API requests ────────────────────────────────────────────
  // Thay vì để SPA tự gọi API, ta intercept và tự gửi request với Bearer token
  const apiResults = {};
  
  await page.route('**/api.the5ers.com/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    
    // Lấy token từ DS cookie
    let token = dsCookie.value;
    
    // Tự tạo request với Authorization header
    const headers = {
      ...route.request().headers(),
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Origin': 'https://hub.the5ers.com',
      'Referer': 'https://hub.the5ers.com/',
    };
    delete headers['host'];
    
    try {
      const response = await route.fetch({ headers });
      const status = response.status();
      
      if (status === 401) {
        // Token expired — thử refresh từ DSR cookie
        console.log(`   ⚠️ 401 on ${url}, trying refresh...`);
        const dsrCookie = cookiesList.find(c => c.name === 'DSR');
        if (dsrCookie) {
          // Thử gọi refresh endpoint
          const refreshResp = await route.fetch({
            url: `${API_BASE}/authentication/refresh-token`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            postData: JSON.stringify({ refreshToken: dsrCookie.value }),
          }).catch(() => null);
          
          if (refreshResp && refreshResp.ok()) {
            const data = await refreshResp.json();
            console.log(`   ✅ Token refreshed!`);
            // Lưu token mới
            token = data.sessionJwt || data.token || data.accessToken || token;
          }
        }
        
        // Retry với token mới (hoặc cũ)
        headers['Authorization'] = `Bearer ${token}`;
        const retryResp = await route.fetch({ headers });
        const json = await retryResp.json();
        apiResults[url] = json;
        console.log(`   🔄 ${method} ${url.replace(API_BASE, '')} → ${retryResp.status()}`);
        await route.fulfill({ response: retryResp });
      } else {
        const json = await response.json();
        apiResults[url] = json;
        console.log(`   ✅ ${method} ${url.replace(API_BASE, '')} → ${status}`);
        await route.fulfill({ response });
      }
    } catch (err) {
      console.log(`   ❌ ${url}: ${err.message}`);
      await route.continue();
    }
  });
  
  // ─── Navigate ──────────────────────────────────────────────────────────
  console.log('\n🌐 Loading page...');
  await page.goto('https://hub.the5ers.com/en/overview', {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  await sleep(5000);
  
  console.log(`📍 URL: ${page.url()}`);
  
  // ─── Get data directly from API calls ──────────────────────────────────
  ensureDir();
  
  // 1. Lấy /user
  console.log('\n📡 Fetching user data...');
  try {
    const userResp = await page.request.get(`${API_BASE}/user`, {
      headers: { 'Authorization': `Bearer ${dsCookie.value}` }
    });
    const userData = await userResp.json();
    apiResults['/user'] = userData;
    console.log(`   ✅ User: ${userData?.data?.email || '?'}`);
  } catch(e) {
    console.log(`   ❌ /user: ${e.message}`);
  }
  
  // 2. Lấy /account/logins
  console.log('\n📡 Fetching accounts...');
  try {
    const loginsResp = await page.request.get(`${API_BASE}/account/logins`, {
      headers: { 'Authorization': `Bearer ${dsCookie.value}` }
    });
    const loginsData = await loginsResp.json();
    apiResults['/account/logins'] = loginsData;
    const accounts = loginsData?.data?.logins || [];
    console.log(`   ✅ ${accounts.length} accounts`);
    
    // 3. Lấy balance + stats cho từng account
    const accountDetails = [];
    for (const acc of accounts.slice(0, 30)) {
      const aid = acc.externalId;
      if (!aid) continue;
      
      const detail = { accountId: aid, type: acc.accountType, login: acc.login };
      
      // Balance
      try {
        const balResp = await page.request.get(`${API_BASE}/account/${aid}/balance`, {
          headers: { 'Authorization': `Bearer ${dsCookie.value}` }
        });
        const bal = await balResp.json();
        Object.assign(detail, bal.data || {});
      } catch {}
      
      // Stats  
      try {
        const statsResp = await page.request.get(`${API_BASE}/account/${aid}/stats`, {
          headers: { 'Authorization': `Bearer ${dsCookie.value}` }
        });
        const stats = await statsResp.json();
        Object.assign(detail, stats.data || {});
      } catch {}
      
      accountDetails.push(detail);
      console.log(`   📊 ${aid}: $${detail.balance || 0} | P&L: $${detail.profitAndLoss || 0}`);
    }
    
    // Profile
    const profile = {
      userName: userData?.data ? `${userData.data.firstName || ''} ${userData.data.lastName || ''}`.trim() : '',
      email: userData?.data?.email || '',
      scrapedAt: new Date().toISOString(),
      accounts: accountDetails.map(a => ({
        accountId: a.accountId,
        name: `${a.type || 'evaluation'} #${a.accountId}`,
        type: a.type || 'evaluation',
        status: 'active',
        currency: 'USD',
        balance: a.balance || 0,
        equity: a.equity || 0,
        pnl: a.profitAndLoss || 0,
        totalTrades: a.totalTrades || 0,
        winRate: a.winRate || 0,
      })),
    };
    save('profile.json', profile);
    
  } catch(e) {
    console.log(`   ❌ accounts: ${e.message}`);
  }
  
  // Save raw API data
  save('api-data.json', apiResults);
  
  await browser.close();
  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
