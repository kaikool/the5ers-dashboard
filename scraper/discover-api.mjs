#!/usr/bin/env node
/**
 * API Discovery Script
 * Dùng Playwright inject cookies → intercept API calls từ SPA
 * Mục tiêu: tìm REST API endpoints thật
 */
import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     The5ers API Discovery            ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Đọc cookies từ file
  const cookiesPath = join(__dirname, 'cookies.json');
  if (!existsSync(cookiesPath)) {
    console.error('❌ cookies.json not found!');
    process.exit(1);
  }
  const cookies = JSON.parse(readFileSync(cookiesPath, 'utf-8'));

  // Launch Chromium với channel chrome để dùng Chrome thật
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Inject cookies trước khi load page
  await context.addCookies(cookies.map(c => {
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
      domain: c.domain.startsWith('.') ? c.domain.slice(1) : c.domain,
      path: c.path,
      httpOnly: c.httpOnly || false,
      secure: c.secure || true,
      sameSite: sameSite,
      expires: c.expirationDate ? Math.floor(c.expirationDate) : undefined,
    };
  }));

  const page = await context.newPage();

  // Intercept ALL requests
  const apiCalls = [];
  page.on('request', request => {
    const url = request.url();
    const method = request.method();
    // Chỉ lấy API calls (JSON, XHR, fetch)
    if (url.includes('the5ers') || url.includes('api.') || url.includes('descope')) {
      if (request.resourceType() === 'xhr' || 
          request.resourceType() === 'fetch' ||
          url.includes('/api/') ||
          url.includes('/v1/') ||
          url.includes('.com/api')) {
        apiCalls.push({
          method,
          url,
          resourceType: request.resourceType(),
          headers: request.headers(),
          timestamp: Date.now(),
        });
      }
    }
  });

  // Intercept responses
  const apiResponses = [];
  page.on('response', async response => {
    const url = response.url();
    if (apiCalls.some(c => c.url === url)) {
      try {
        const ct = response.headers()['content-type'] || '';
        let body = null;
        if (ct.includes('json')) {
          body = await response.json().catch(() => null);
        }
        apiResponses.push({
          url,
          status: response.status(),
          contentType: ct,
          headers: response.headers(),
          body: body,
        });
      } catch {}
    }
  });

  // Navigate đến dashboard
  console.log('🌐 Navigating to dashboard...');
  await page.goto('https://hub.the5ers.com/en/dashboard', { 
    waitUntil: 'networkidle', 
    timeout: 60000 
  });
  await page.waitForTimeout(5000);

  // Log URL
  console.log(`📍 URL: ${page.url()}`);
  console.log(`📊 API calls captured: ${apiCalls.length}`);

  // Save API calls
  const output = {
    url: page.url(),
    title: await page.title(),
    apiCalls: apiCalls.map(c => ({
      method: c.method,
      url: c.url,
      resourceType: c.resourceType,
    })),
    apiResponses: apiResponses.map(r => ({
      url: r.url,
      status: r.status,
      contentType: r.contentType,
      bodyPreview: r.body ? JSON.stringify(r.body).substring(0, 500) : null,
    })),
  };

  writeFileSync(join(DATA_DIR, 'api-discovery.json'), JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved to data/api-discovery.json`);

  // Print API calls summary
  console.log('\n📋 API Calls Summary:');
  for (const call of output.apiCalls) {
    const resp = apiResponses.find(r => r.url === call.url);
    console.log(`  ${call.method} ${call.url}`);
    if (resp) console.log(`    → ${resp.status} [${resp.contentType}]`);
  }

  await browser.close();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
