#!/usr/bin/env node
/**
 * The5ers Online Scraper — chạy trên GitHub Actions
 * 
 * Cơ chế:
 * 1. Inject cookies (DS + DSR) vào Playwright headless Chromium
 * 2. Descope SDK trong browser tự động refresh token
 * 3. Chờ dashboard load → đọc data từ trang
 * 4. Build dashboard + deploy lên Vercel
 * 
 * Cookies export 1 lần, lưu trong GitHub Secrets.
 * DSR sống 1 tháng (hết 23/07/2026), mỗi tháng update 1 lần.
 */

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const BASE_URL = 'https://hub.the5ers.com/en';

// Nếu chạy trên GitHub Actions, đọc cookies từ env var
// Local: đọc từ cookies.json
function loadCookies() {
  const envCookies = process.env.THE5ERS_COOKIES;
  if (envCookies) {
    return JSON.parse(envCookies);
  }
  const filePath = join(__dirname, 'cookies.json');
  if (existsSync(filePath)) {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }
  return null;
}

function normalizeCookies(cookies) {
  return cookies.map(c => {
    let sameSite = 'Lax';
    if (c.sameSite) {
      const s = c.sameSite.toLowerCase();
      if (s === 'strict') sameSite = 'Strict';
      else if (s === 'lax') sameSite = 'Lax';
      else if (s === 'none' || s === 'no_restriction') sameSite = 'None';
    }
    return {
      name: c.name,
      value: c.value,
      domain: c.domain?.startsWith('.') ? c.domain.slice(1) : c.domain,
      path: c.path || '/',
      httpOnly: c.httpOnly || false,
      secure: c.secure !== false,
      sameSite,
      expires: c.expirationDate ? Math.floor(c.expirationDate) : undefined,
    };
  });
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   The5ers Online Scraper v1.0       ║');
  console.log('╚══════════════════════════════════════╝');

  // Load cookies
  const cookies = loadCookies();
  if (!cookies) {
    console.error('❌ Không tìm thấy cookies.json hoặc env THE5ERS_COOKIES');
    console.error('   Bố export từ Cookie-Editor rồi lưu vào scraper/cookies.json');
    process.exit(1);
  }
  console.log(`📦 Loaded ${cookies.length} cookies`);

  // Launch headless Chromium
  const browser = await chromium.launch({
    headless: !process.env.LOCAL_DEBUG, // mặc định headless
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  // Inject cookies trước khi load
  await context.addCookies(normalizeCookies(cookies));
  console.log('🍪 Cookies injected');

  const page = await context.newPage();

  // Intercept API responses để lấy data
  const apiData = {};
  page.on('response', async response => {
    const url = response.url();
    if (!url.includes('api.the5ers.com')) return;
    try {
      const ct = response.headers()['content-type'] || '';
      if (ct.includes('json')) {
        const json = await response.json().catch(() => null);
        if (json) {
          apiData[url] = json;
        }
      }
    } catch {}
  });

  // Navigate tới dashboard
  console.log('🌐 Loading dashboard...');
  await page.goto(`${BASE_URL}/dashboard`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Đợi Descope SDK refresh + data load
  console.log('⏳ Chờ data load...');
  await page.waitForTimeout(5000);

  // Log URL và title
  console.log(`📍 ${page.url()}`);
  
  // Check login status
  const status = await page.evaluate(() => {
    const hasAvatar = !!document.querySelector('[class*="avatar"], [class*="user-menu"]');
    const stats = Array.from(document.querySelectorAll('.ant-statistic')).map(s => ({
      label: s.querySelector('.ant-statistic-title')?.textContent?.trim(),
      value: s.querySelector('.ant-statistic-content-value')?.textContent?.trim(),
    }));
    const tables = Array.from(document.querySelectorAll('table')).map(t =>
      Array.from(t.querySelectorAll('tr')).map(r =>
        Array.from(r.querySelectorAll('td, th')).map(c => c.textContent.trim())
      )
    );
    const bodyText = document.body?.innerText?.substring(0, 3000) || '';
    return { loggedIn: hasAvatar, stats, tables, bodyText, apiData: {} };
  });

  // Ghi log kết quả
  if (!status.loggedIn) {
    console.log('❌ Chưa đăng nhập! Cookies có thể hết hạn.');
    console.log(`📝 Page text: ${status.bodyText.substring(0, 300)}`);
  } else {
    console.log('✅ Đã đăng nhập!');
    console.log(`📊 Stats: ${status.stats.length}`);
    console.log(`📋 Tables: ${status.tables.length}`);
    status.stats.slice(0, 10).forEach(s => console.log(`   ${s.label}: ${s.value}`));
  }

  // Save raw data
  ensureDir();
  const output = {
    scrapedAt: new Date().toISOString(),
    url: page.url(),
    loggedIn: status.loggedIn,
    stats: status.stats,
    tables: status.tables,
    bodyText: status.bodyText,
    apiResponses: apiData,
  };
  save('dashboard-data.json', JSON.stringify(output, null, 2));

  // Nếu có API data, parse thành profile
  const profile = extractProfile(apiData, status);
  if (profile) {
    save('profile.json', JSON.stringify(profile, null, 2));
  }

  await browser.close();
  console.log('\n✅ Done!');
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function save(name, data) {
  const path = join(DATA_DIR, name);
  writeFileSync(path, data, 'utf-8');
  console.log(`  💾 ${name}`);
}

function extractProfile(apiData, domData) {
  // Parse từ API responses nếu có
  const userResponse = Object.entries(apiData).find(([url]) => url.endsWith('/user'));
  const accountsResponse = Object.entries(apiData).find(([url]) => url.includes('/account/logins'));
  
  if (userResponse) {
    const user = userResponse[1]?.data;
    if (user) {
      return {
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        scrapedAt: new Date().toISOString(),
        accounts: (user.tsUsers || []).map(a => ({
          accountId: a.externalId || a.login,
          name: `${a.accountType || ''} #${a.externalId || a.login}`,
          type: a.accountType || 'evaluation',
          status: 'active',
          balance: 0,
          equity: 0,
          pnl: 0,
          currency: 'USD',
        })),
      };
    }
  }

  // Fallback: parse từ DOM
  if (domData.stats && domData.stats.length > 0) {
    return { userName: '', email: '', scrapedAt: new Date().toISOString(), accounts: [] };
  }

  return null;
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
