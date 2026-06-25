import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const cookiesStr = fs.readFileSync('cookies.json', 'utf8');
const cookies = JSON.parse(cookiesStr);
const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

const headers = {
  'Cookie': cookieHeader,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/133.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

async function fetchLogins() {
  const res = await fetch('https://api.the5ers.com/api/v1/account/logins', { headers });
  if (!res.ok) throw new Error(`Logins API failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchStats(id) {
  const res = await fetch(`https://api.the5ers.com/api/v1/account/${id}/stats`, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function run() {
  try {
    console.log('Fetching logins...');
    const logins = await fetchLogins();
    fs.writeFileSync(path.join(DATA_DIR, 'logins_raw.json'), JSON.stringify(logins, null, 2));

    const accountList = Array.isArray(logins) ? logins : (logins.data || logins.accounts || []);
    
    const profile = {
      scrapedAt: new Date().toISOString(),
      userName: logins.userName || 'The5ers Trader',
      accounts: accountList.map((a, i) => ({
        accountId: a.id || a.accountId || a.login || `acc-${i}`,
        name: a.name || `Account ${a.id || a.login || i}`,
        balance: a.balance || 0,
        equity: a.equity || 0,
        pnl: a.pnl || 0,
        status: a.status || 'active',
        type: a.type || 'evaluation'
      }))
    };
    fs.writeFileSync(path.join(DATA_DIR, 'profile.json'), JSON.stringify(profile, null, 2));
    console.log(`Saved profile.json with ${profile.accounts.length} accounts.`);
    
    for (const acc of profile.accounts) {
      if (acc.accountId.startsWith('acc-')) continue;
      console.log(`Fetching stats for ${acc.accountId}...`);
      const stats = await fetchStats(acc.accountId);
      if (stats) {
        fs.writeFileSync(path.join(DATA_DIR, `account_${acc.accountId}.json`), JSON.stringify(stats, null, 2));
      }
    }
    
    // Copy to dashboard
    const pubDataDir = path.join(process.cwd(), '../dashboard/public/data');
    if (!fs.existsSync(pubDataDir)) fs.mkdirSync(pubDataDir, { recursive: true });
    fs.copyFileSync(path.join(DATA_DIR, 'profile.json'), path.join(pubDataDir, 'profile.json'));
    
    console.log('Data copied to dashboard/public/data/. Done!');
  } catch (err) {
    console.error('Error fetching data:', err.message);
  }
}

run();
