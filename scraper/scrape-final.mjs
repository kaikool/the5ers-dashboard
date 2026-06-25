#!/usr/bin/env node
/**
 * The5ers Local Scraper — bản cuối
 * 
 * Dùng Playwright mở Chrome thật của bố (có session sẵn).
 * Không cần token, không cần cookies export.
 * Browser tự refresh session, không lo hết hạn.
 * 
 * Chạy: node scrape-final.mjs
 * Task Scheduler: cứ thế add là chạy auto mỗi sáng.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const BASE_URL = 'https://hub.the5ers.com/en';
const CHROME_PROFILE = 'C:\\Users\\phuct\\AppData\\Local\\Google\\Chrome\\User Data';

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function save(filename, data) {
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✅ ${filename}`);
}

function darwin(text) {
  try {
    // Extract numbers from text, handle $, %, negative in parens
    if (!text || typeof text !== 'string') return null;
    let s = text.trim();
    if (!s) return null;
    const negative = s.startsWith('(') && s.endsWith(')');
    if (negative) s = s.slice(1, -1);
    s = s.replace(/[$€£%+,]/g, '').trim();
    const num = parseFloat(s);
    if (isNaN(num)) return null;
    return negative ? -num : num;
  } catch { return null; }
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   The5ers Local Scraper v1.0        ║');
  console.log('╚══════════════════════════════════════╝\n');

  // 1. Mở Chrome thật của bố (giữ nguyên session, cookies tự refresh)
  console.log('🚀 Mở Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: [
      `--user-data-dir=${CHROME_PROFILE}`,
      '--profile-directory=Default',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
    ],
  });
  
  const context = browser.contexts()[0];
  await context.setViewportSize({ width: 1440, height: 900 });
  const page = await context.newPage();

  // 2. Navigate tới dashboard
  console.log('🌐 Navigate to dashboard...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  const url = page.url();
  const title = await page.title();
  console.log(`📍 ${url}`);
  console.log(`📄 ${title}`);

  // Check login
  const loggedIn = await page.evaluate(() => {
    const hasAvatar = document.querySelector('[class*="avatar"], [class*="user-menu"]');
    const hasLoginForm = document.querySelector('input[type="email"]');
    return { loggedIn: !!hasAvatar, hasLoginForm: !!hasLoginForm, text: document.body?.innerText?.substring(0, 500) || '' };
  });

  if (!loggedIn.loggedIn) {
    console.log('\n❌ Chưa login! Đợi bố login thủ công trong Chrome...');
    console.log('⏳ 5 phút...');
    try {
      await page.waitForSelector('[class*="avatar"]', { timeout: 300000 });
      console.log('✅ Login detected!');
      await page.waitForTimeout(3000);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    } catch {
      console.log('❌ Timeout!');
      await browser.close();
      process.exit(1);
    }
  } else {
    console.log('✅ Đã login!');
  }

  // 3. Scrape: đọc text từ dashboard
  // Cách đơn giản nhất: export toàn bộ text + table data
  ensureDir();

  const data = await page.evaluate(() => {
    const result = {};
    
    // Lấy tất cả text node 
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent.trim();
      if (t) texts.push(t);
    }
    result.allText = texts;

    // Lấy table data
    const tables = document.querySelectorAll('table, [role="table"], .ant-table');
    result.tables = Array.from(tables).map(table => {
      const rows = table.querySelectorAll('tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td, th, [class*="ant-table-cell"]');
        return Array.from(cells).map(c => c.textContent.trim());
      });
    });

    // Lấy statistic values (Ant Design)
    const stats = document.querySelectorAll('.ant-statistic');
    result.statistics = Array.from(stats).map(stat => ({
      label: stat.querySelector('.ant-statistic-title')?.textContent?.trim() || '',
      value: stat.querySelector('.ant-statistic-content-value')?.textContent?.trim() || '',
    }));

    // Lấy account cards
    const cards = document.querySelectorAll('[class*="account-card"], [class*="AccountCard"], .ant-card');
    result.cards = Array.from(cards).map(card => ({
      text: card.textContent?.trim()?.substring(0, 1000) || '',
      html: card.innerHTML?.substring(0, 500) || '',
    }));

    // Lấy heading structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    result.headings = Array.from(headings).map(h => `${h.tagName}: ${h.textContent?.trim()}`);

    // Lấy links 
    const links = document.querySelectorAll('a[href*="account"], a[href*="dashboard"], a[href*="trading"]');
    result.links = Array.from(links).map(a => ({ href: a.href, text: a.textContent?.trim()?.substring(0, 100) }));

    return result;
  });

  save('raw-data.json', {
    url: url,
    title: title,
    scrapedAt: new Date().toISOString(),
    ...data,
  });

  // In summary
  console.log(`\n📊 Raw data: ${data.allText?.length || 0} text nodes, ${data.tables?.length || 0} tables`);
  console.log(`   Statistics: ${data.statistics?.length || 0}`);
  console.log(`   Cards: ${data.cards?.length || 0}`);

  // In sample text
  if (data.allText) {
    const sample = data.allText.filter(t => t.length > 3 && t.length < 200).slice(0, 30);
    console.log('\n📝 Sample text:');
    sample.forEach(t => console.log(`  - ${t}`));
  }

  await browser.close();
  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
