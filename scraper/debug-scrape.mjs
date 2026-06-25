#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const BASE_URL = 'https://hub.the5ers.com/en';

function loadCookies() {
  const envCookies = process.env.THE5ERS_COOKIES;
  if (envCookies) return JSON.parse(envCookies);
  const filePath = join(__dirname, 'cookies.json');
  if (existsSync(filePath)) return JSON.parse(readFileSync(filePath, 'utf-8'));
  return null;
}

function normalizeCookies(cookies) {
  return cookies.map(c => {
    let sameSite = 'Lax';
    if (c.sameSite) {
      const s = c.sameSite.toLowerCase();
      if (s === 'strict') sameSite = 'Strict';
      else if (s === 'lax') sameSite = 'Lax';
      else sameSite = 'None';
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
  console.log('The5ers Debug Scraper\n');

  const cookies = loadCookies();
  if (!cookies) { console.error('No cookies'); process.exit(1); }

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });

  await context.addCookies(normalizeCookies(cookies));
  console.log('Cookies injected');
  
  const page = await context.newPage();

  // Track API responses
  const responses = {};
  page.on('response', async r => {
    const url = r.url();
    if (url.includes('api.the5ers.com') || url.includes('/v1/auth/')) {
      try {
        const ct = r.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const json = await r.json().catch(() => null);
          responses[url] = { status: r.status(), data: json };
        } else {
          responses[url] = { status: r.status(), body: (await r.text().catch(() => '')).substring(0, 200) };
        }
      } catch {}
    }
  });

  // Mở trang — thử mở trang chủ trước rồi mới dashboard
  console.log('1. Loading homepage...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log(`   URL: ${page.url()}`);
  console.log(`   Title: "${await page.title()}"`);

  // Check xem có login chưa
  let check = await page.evaluate(() => ({
    url: location.href,
    bodyLen: document.body?.innerText?.length || 0,
    hasEmailInput: !!document.querySelector('input[type="email"]'),
    hasGetStarted: !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Get Started')),
    avatar: !!document.querySelector('[class*="avatar"]'),
    hasLoginForm: !!document.querySelector('form'),
    textSample: (document.body?.innerText || '').substring(0, 500),
  }));
  console.log(`   Login form: ${check.hasEmailInput || check.hasGetStarted}`);
  console.log(`   Avatar: ${check.avatar}`);
  console.log(`   Body len: ${check.bodyLen}`);
  console.log(`   Sample: ${check.textSample.substring(0, 200)}`);

  // Nếu thấy login form, thử dismiss cookie
  if (check.hasEmailInput || check.hasGetStarted) {
    // Accept cookie
    const cookieBtn = await page.$('button:has-text("Allow all")');
    if (cookieBtn) {
      console.log('\n2. Dismissing cookie...');
      await cookieBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Đợi Descope SDK refresh
    console.log('\n3. Waiting for Descope SDK to refresh token...');
    
    // Thử navigate đến /overview hoặc /dashboard 
    for (const path of ['/overview', '/dashboard']) {
      console.log(`   Trying ${path}...`);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
      
      check = await page.evaluate(() => ({
        url: location.href,
        avatar: !!document.querySelector('[class*="avatar"]'),
        textSample: (document.body?.innerText || '').substring(0, 300),
        statsCount: document.querySelectorAll('.ant-statistic').length,
      }));
      console.log(`   URL: ${check.url}, Avatar: ${check.avatar}, Stats: ${check.statsCount}`);
      
      if (check.avatar) {
        console.log('✅ LOGGED IN!');
        break;
      }
    }
  }

  // Log API responses
  console.log('\n📡 API Responses:');
  for (const [url, resp] of Object.entries(responses)) {
    const short = url.replace(/https:\/\/[^/]+/, '');
    if (resp.status >= 200 && resp.status < 300) {
      console.log(`  ✅ ${short} → ${resp.status}`);
    } else {
      console.log(`  ❌ ${short} → ${resp.status} ${JSON.stringify(resp.data || resp.body || '')}`);
    }
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
