#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const API = 'https://api.the5ers.com';
const HUB = 'https://hub.the5ers.com';

// Puppeteer optional
let puppeteerExtra, stealthPlugin;
try {
  puppeteerExtra = require('puppeteer-extra');
  stealthPlugin = require('puppeteer-extra-plugin-stealth');
} catch {}

function loadSecrets() {
  const raw = process.env.THE5ERS_COOKIES
    ? process.env.THE5ERS_COOKIES
    : readFileSync('cookies.json', 'utf-8');
  const cookies = JSON.parse(raw);
  const ds = cookies.find(c => c.name === 'DS');
  const dsr = cookies.find(c => c.name === 'DSR');
  if (!ds) throw new Error('No DS cookie');
  return { token: ds.value, refreshToken: dsr?.value, cookies };
}

async function apiFetch(path, token) {
  const resp = await fetch(`${API}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'User-Agent': 'the5ers-dashboard/1.0',
      'Origin': HUB,
      'Referer': `${HUB}/en/dashboard`,
    },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`${path} → ${resp.status}: ${JSON.stringify(data).slice(0,100)}`);
  return data;
}

async function tryRefreshToken(refreshToken, currentToken) {
  console.log('🔄 Trying refresh token...');
  const bodies = [null, JSON.stringify({ refreshToken }), JSON.stringify({ token: currentToken, refreshToken })];
  const headersList = [
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
    { 'Content-Type': 'application/json', 'Cookie': `DSR=${refreshToken}; DS=${currentToken}` },
  ];
  for (const hdrs of headersList) {
    for (const body of bodies) {
      try {
        const resp = await fetch(`${API}/authentication/refresh-token`, {
          method: 'POST', headers: { ...hdrs, 'User-Agent': 'Mozilla/5.0', 'Origin': HUB },
          body: body || undefined,
        });
        const data = await resp.json();
        if (resp.ok && (data.sessionJwt || data.token)) {
          const t = data.sessionJwt || data.token;
          console.log(`   ✅ Token refreshed! ${t.slice(0,30)}...`);
          return t;
        }
      } catch {}
    }
  }
  return null;
}

async function puppeteerLogin(cookies) {
  if (!puppeteerExtra || !stealthPlugin) {
    console.log('   ⚠️ Puppeteer not available');
    return null;
  }
  console.log('🎭 Trying Puppeteer login...');
  puppeteerExtra.use(stealthPlugin());
  const browser = await puppeteerExtra.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  await page.goto(`${HUB}/en`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate((cks) => {
    for (const c of cks) {
      const s = (c.sameSite || 'lax').toLowerCase();
      const ss = s === 'no_restriction' ? 'None' : s.charAt(0).toUpperCase() + s.slice(1);
      document.cookie = `${c.name}=${c.value}; path=/; domain=${(c.domain || '').replace(/^\./, '') || 'hub.the5ers.com'}; secure; SameSite=${ss}`;
    }
    localStorage.setItem('is-logged-in', 'true');
    localStorage.setItem('idp-provider', 'descope');
    localStorage.setItem('token-sync-status', 'true');
    localStorage.setItem('DSRCN', 'DSR');
    localStorage.setItem('cx-fingerprint', '1ed2be65-ddf3-4c33-85a6-88613d6fdf7c');
    localStorage.setItem('dls_last_user_login_id', 'phuk.td@gmail.com');
    localStorage.setItem('dls_last_user_display_name', 'Đình Phúc Trần');
  }, cookies);
  await page.goto(`${HUB}/en/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));
  const avatar = await page.evaluate(() => !!document.querySelector('[class*="avatar"]'));
  if (avatar) {
    const pageCookies = await page.cookies();
    const ds = pageCookies.find(c => c.name === 'DS');
    const dsr = pageCookies.find(c => c.name === 'DSR');
    await browser.close();
    return { token: ds?.value, refreshToken: dsr?.value };
  }
  await browser.close();
  return null;
}

async function scrapeAll(token) {
  console.log('\n📡 Scraping data...');
  const user = await apiFetch('/user', token);
  const userData = user.data || {};
  console.log(`   👤 ${userData.email || '?'}`);
  const logins = await apiFetch('/account/logins', token);
  const allLogins = logins.data?.logins || userData.tsUsers || [];
  const accounts = allLogins.filter(a => a.externalId).slice(0, 50);
  console.log(`   📊 ${accounts.length} accounts`);
  const details = [];
  for (const acc of accounts) {
    const aid = acc.externalId;
    if (!aid) continue;
    const detail = { accountId: aid, type: acc.accountType || 'evaluation', login: acc.login };
    try { const b = await apiFetch(`/account/${aid}/balance`, token); Object.assign(detail, b.data || {}); } catch {}
    try { const s = await apiFetch(`/account/${aid}/stats`, token); Object.assign(detail, s.data || {}); } catch {}
    details.push(detail);
    console.log(`   💰 ${aid}: $${detail.balance || 0} | P&L: $${detail.profitAndLoss || 0}`);
  }
  return {
    userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
    email: userData.email || '',
    scrapedAt: new Date().toISOString(),
    accounts: details.map(a => ({
      accountId: a.accountId, name: `${a.type || 'account'} #${a.accountId}`,
      type: a.type || 'unknown', status: 'active', currency: 'USD',
      balance: a.balance || 0, equity: a.equity || 0,
      pnl: a.profitAndLoss || 0, totalTrades: a.totalTrades || 0,
    })),
  };
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  The5ers Cloud Scraper v3.0         ║');
  console.log('╚══════════════════════════════════════╝\n');
  const { token, refreshToken, cookies } = loadSecrets();
  console.log(`📦 Token: ${token.slice(0,30)}...`);
  let currentToken = token;
  try {
    const data = await scrapeAll(currentToken);
    writeFileSync('data/profile.json', JSON.stringify(data, null, 2));
    console.log(`\n✅ Done via fetch! ${data.accounts.length} accounts.`);
    return;
  } catch (err) {
    console.log(`   ❌ ${err.message}`);
    if (refreshToken) {
      const newToken = await tryRefreshToken(refreshToken, currentToken);
      if (newToken) {
        currentToken = newToken;
        try {
          const data = await scrapeAll(currentToken);
          writeFileSync('data/profile.json', JSON.stringify(data, null, 2));
          console.log(`\n✅ Done via refresh!`);
          return;
        } catch (e2) {
          console.log(`   ❌ ${e2.message}`);
        }
      }
    }
    const result = await puppeteerLogin(cookies);
    if (result) {
      const data = await scrapeAll(result.token);
      writeFileSync('data/profile.json', JSON.stringify(data, null, 2));
      console.log(`\n✅ Done via Puppeteer!`);
      return;
    }
    console.log('\n❌ All methods failed. Export fresh cookies from Chrome.');
    process.exit(1);
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
