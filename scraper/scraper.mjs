#!/usr/bin/env node
/**
 * The5ers Cloud Scraper — GitHub Actions edition
 * 
 * Chiến lược:
 * 1. Dùng fetch thuần với Bearer token (DS)
 * 2. Nếu 401 → thử refresh token qua DSR
 * 3. Nếu refresh fail → dùng Puppeteer headless login
 * 4. Scrape API → save JSON → dashboard build
 */

// ─── Cấu hình ─────────────────────────────────────────────────────────────────
const API = 'https://api.the5ers.com';
const HUB = 'https://hub.the5ers.com';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadSecrets() {
  // GitHub Actions: từ env, Local: từ file
  const cookies = process.env.THE5ERS_COOKIES 
    ? JSON.parse(process.env.THE5ERS_COOKIES) 
    : JSON.parse(require('fs').readFileSync('cookies.json', 'utf-8'));
  
  const ds = cookies.find(c => c.name === 'DS');
  const dsr = cookies.find(c => c.name === 'DSR');
  if (!ds) throw new Error('No DS cookie');
  return { token: ds.value, refreshToken: dsr?.value, cookies };
}

async function apiFetch(path, token) {
  const url = `${API}${path}`;
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'User-Agent': 'the5ers-dashboard/1.0',
      'Origin': HUB,
      'Referer': `${HUB}/en/dashboard`,
    },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`${path} → ${resp.status}: ${JSON.stringify(data).substring(0,100)}`);
  return data;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Refresh Token ────────────────────────────────────────────────────────────

async function tryRefreshToken(refreshToken, currentToken) {
  console.log('🔄 Trying refresh token...');
  
  // Cách 1: POST lên The5ers refresh endpoint
  const bodies = [
    null,  // empty
    JSON.stringify({ refreshToken }),
    JSON.stringify({ token: currentToken, refreshToken }),
  ];
  
  const headersList = [
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
    { 'Content-Type': 'application/json', 'Cookie': `DSR=${refreshToken}; DS=${currentToken}` },
    { 'Content-Type': 'application/json', 'x-descope-sdk': 'P37sOCdLJjVCAuLgqv2zMvS61Xbo', 'Authorization': `Bearer ${refreshToken}` },
  ];
  
  for (const hdrs of headersList) {
    for (const body of bodies) {
      try {
        const resp = await fetch(`${API}/authentication/refresh-token`, {
          method: 'POST',
          headers: { ...hdrs, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Origin': HUB },
          body: body || undefined,
        });
        const data = await resp.json();
        if (resp.ok && (data.sessionJwt || data.token)) {
          const newToken = data.sessionJwt || data.token;
          console.log(`   ✅ Token refreshed! ${newToken.substring(0,30)}...`);
          return newToken;
        }
      } catch(e) {}
    }
  }
  
  return null;
}

// ─── Puppeteer Login (fallback) ───────────────────────────────────────────────

async function puppeteerLogin(cookies) {
  console.log('🎭 Trying Puppeteer login...');
  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  
  // Set cookies
  await page.goto(`${HUB}/en`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate((cookies) => {
    for (const c of cookies) {
      const s = c.sameSite?.toLowerCase() || 'lax';
      const sameSite = s === 'no_restriction' ? 'None' : s.charAt(0).toUpperCase() + s.slice(1);
      document.cookie = `${c.name}=${c.value}; path=/; domain=${c.domain?.replace(/^\./, '') || 'hub.the5ers.com'}; secure; SameSite=${sameSite}`;
    }
    localStorage.setItem('is-logged-in', 'true');
    localStorage.setItem('idp-provider', 'descope');
    localStorage.setItem('token-sync-status', 'true');
    localStorage.setItem('DSRCN', 'DSR');
    localStorage.setItem('cx-fingerprint', '1ed2be65-ddf3-4c33-85a6-88613d6fdf7c');
    localStorage.setItem('dls_last_user_login_id', 'phuk.td@gmail.com');
    localStorage.setItem('dls_last_user_display_name', 'Đình Phúc Trần');
  }, cookies);
  
  // Navigate dashboard
  await page.goto(`${HUB}/en/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000);
  
  const url = page.url();
  const title = await page.title();
  const hasAvatar = await page.evaluate(() => !!document.querySelector('[class*="avatar"]'));
  
  if (hasAvatar) {
    console.log(`   ✅ Logged in! ${url}`);
    // Get all cookies for API calls
    const pageCookies = await page.cookies();
    const ds = pageCookies.find(c => c.name === 'DS');
    const dsr = pageCookies.find(c => c.name === 'DSR');
    await browser.close();
    return { token: ds?.value, refreshToken: dsr?.value, mode: 'puppeteer' };
  }
  
  console.log(`   ❌ Login failed. URL: ${url}`);
  await browser.close();
  return null;
}

// ─── Scrape API ───────────────────────────────────────────────────────────────

async function scrapeAll(token) {
  console.log('\n📡 Scraping data...');
  
  // User
  const user = await apiFetch('/user', token);
  const userData = user.data || {};
  console.log(`   👤 ${userData.email || '?'}`);
  
  // Accounts
  const logins = await apiFetch('/account/logins', token);
  const allLogins = logins.data?.logins || userData.tsUsers || [];
  const accounts = allLogins.filter(a => a.externalId).slice(0, 50);
  console.log(`   📊 ${accounts.length} accounts`);
  
  // Detail từng account
  const details = [];
  for (const acc of accounts) {
    const aid = acc.externalId;
    if (!aid) continue;
    
    const detail = { accountId: aid, type: acc.accountType || 'evaluation', login: acc.login };
    
    try { 
      const b = await apiFetch(`/account/${aid}/balance`, token);
      Object.assign(detail, b.data || {});
    } catch {}
    try { 
      const s = await apiFetch(`/account/${aid}/stats`, token);
      Object.assign(detail, s.data || {});
    } catch {}
    
    details.push(detail);
    console.log(`   💰 ${aid}: $${detail.balance || 0} | P&L: $${detail.profitAndLoss || 0}`);
  }
  
  // Profile
  return {
    userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
    email: userData.email || '',
    scrapedAt: new Date().toISOString(),
    accounts: details.map(a => ({
      accountId: a.accountId,
      name: `${a.type || 'account'} #${a.accountId}`,
      type: a.type || 'unknown',
      status: 'active',
      currency: 'USD',
      balance: a.balance || 0,
      equity: a.equity || 0,
      pnl: a.profitAndLoss || 0,
      totalTrades: a.totalTrades || 0,
    })),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  The5ers Cloud Scraper v3.0         ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  // 1. Load secrets
  const { token, refreshToken, cookies } = loadSecrets();
  console.log(`📦 Token: ${token.substring(0,30)}...`);
  
  // 2. Thử fetch API với token hiện tại
  let currentToken = token;
  let mode = 'fetch';
  
  try {
    console.log('\n📡 Testing API with current token...');
    const data = await scrapeAll(currentToken);
    require('fs').writeFileSync('data/profile.json', JSON.stringify(data, null, 2));
    console.log(`\n✅ Done via fetch! ${data.accounts.length} accounts scraped.`);
    return data;
  } catch (err) {
    console.log(`   ❌ ${err.message}`);
    
    // 3. Try refresh
    if (refreshToken) {
      const newToken = await tryRefreshToken(refreshToken, currentToken);
      if (newToken) {
        currentToken = newToken;
        // Update cookies
        const cookiejar = JSON.parse(process.env.THE5ERS_COOKIES || require('fs').readFileSync('cookies.json','utf-8'));
        for (const c of cookiejar) { if (c.name === 'DS') c.value = newToken; }
        require('fs').writeFileSync('cookies.json', JSON.stringify(cookiejar, null, 2));
        
        const data = await scrapeAll(currentToken);
        require('fs').writeFileSync('data/profile.json', JSON.stringify(data, null, 2));
        console.log(`\n✅ Done via refresh!`);
        return data;
      }
      console.log('   ⚠️ Refresh failed.');
    }
    
    // 4. Fallback: Puppeteer
    const result = await puppeteerLogin(cookies);
    if (result) {
      currentToken = result.token;
      const data = await scrapeAll(currentToken);
      require('fs').writeFileSync('data/profile.json', JSON.stringify(data, null, 2));
      console.log(`\n✅ Done via Puppeteer!`);
      return data;
    }
    
    console.log('\n❌ All methods failed. Bố export lại cookies từ Chrome nhé.');
    process.exit(1);
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
