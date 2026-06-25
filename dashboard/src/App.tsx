import { useState, useEffect } from 'react';
import { Profile, AccountOverview, AccountDetail } from './types';
import AccountCard from './components/AccountCard';
import DetailPanel from './components/DetailPanel';

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<AccountOverview[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountOverview | null>(null);
  const [detailData, setDetailData] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'scraper' | 'sample'>('scraper');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Try loading from scraper output first
      const resp = await fetch('/data/profile.json');
      if (resp.ok) {
        const json: Profile = await resp.json();
        setProfile(json);
        setAccounts(json.accounts || []);
        setDataSource('scraper');
        setLoading(false);
        return;
      }

      // Fallback: check if running in dev mode at root /data
      const altResp = await fetch('/data/profile.json');
      if (altResp.ok) {
        const json: Profile = await altResp.json();
        setProfile(json);
        setAccounts(json.accounts || []);
        setDataSource('scraper');
        setLoading(false);
        return;
      }

      // No data found — show instructions
      setProfile(null);
      setAccounts([]);
      setDataSource('scraper');
    } catch (err) {
      setError(`Không thể tải dữ liệu: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectAccount(account: AccountOverview) {
    setSelectedAccount(account);
    setDetailData(null);

    // Try loading account detail
    try {
      const resp = await fetch(`/data/account_${account.accountId}.json`);
      if (resp.ok) {
        const json: AccountDetail = await resp.json();
        setDetailData(json);
      } else {
        // Try with shorter ID
        const shortResp = await fetch(`/data/account_${account.accountId}.json`);
        if (shortResp.ok) {
          setDetailData(await shortResp.json());
        }
      }
    } catch {
      // Detail not available — that's fine
    }
  }

  function formatCurrency(value: number): string {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return value < 0 ? `-$${formatted}` : `$${formatted}`;
  }

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="app">
        <div className="empty-state">
          <h2>⏳ Loading...</h2>
          <p>Đang tải dữ liệu từ scraper...</p>
        </div>
      </div>
    );
  }

  if (!profile || accounts.length === 0) {
    return (
      <div className="app">
        <div className="empty-state">
          <h2>📊 The5ers Dashboard</h2>
          <p style={{ marginBottom: 16 }}>
            Chưa có dữ liệu. Chạy scraper trước để lấy dữ liệu từ hub.
          </p>

          <div className="instructions">
            <h3>Cách dùng:</h3>
            <ol>
              <li><code>cd scraper &amp;&amp; node scrape.mjs</code></li>
              <li>Login thủ công trong trình duyệt hiện ra</li>
              <li>Copy thư mục <code>scraper/data/</code> vào <code>dashboard/public/data/</code></li>
              <li><code>cd dashboard &amp;&amp; npm run dev</code></li>
              <li>Mở <code>http://localhost:5173</code></li>
            </ol>
          </div>

          {error && <div className="error-state">{error}</div>}
        </div>
      </div>
    );
  }

  const getAgeStatus = (scrapedAt: string) => {
    const ageMs = Date.now() - new Date(scrapedAt).getTime();
    const ageMins = Math.floor(ageMs / 60000);
    if (ageMins < 60) return { text: `Tươi (${ageMins}m)`, type: 'success' };
    if (ageMins < 120) return { text: `Warning (${Math.floor(ageMins/60)}h)`, type: 'warning' };
    return { text: `Stale (${Math.floor(ageMins/60)}h)`, type: 'danger' };
  };

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div>
          <h1>Premium Dashboard</h1>
          <div className="header-meta">
            {profile.userName && <span>{profile.userName} · </span>}
            {profile.scrapedAt && (
              <span>Cập nhật: {new Date(profile.scrapedAt).toLocaleString('vi-VN')}</span>
            )}
          </div>
        </div>
        <div className="header-actions">
          {profile.scrapedAt && (
            <div className={`status-badge loaded`} style={{ color: `var(--${getAgeStatus(profile.scrapedAt).type})`, borderColor: `var(--${getAgeStatus(profile.scrapedAt).type})` }}>
              Data: {getAgeStatus(profile.scrapedAt).text}
            </div>
          )}
          <div className="status-badge loaded">
            {accounts.length} tài khoản
          </div>
        </div>
      </div>

      {/* Error */}
      {error && <div className="error-state">{error}</div>}

      {/* Account Cards */}
      <div className="account-grid">
        {accounts.map((account) => (
          <AccountCard
            key={account.accountId}
            account={account}
            selected={selectedAccount?.accountId === account.accountId}
            onClick={() => handleSelectAccount(account)}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>

      {/* Detail Panel */}
      {selectedAccount && (
        <DetailPanel
          account={selectedAccount}
          detail={detailData}
          onClose={() => { setSelectedAccount(null); setDetailData(null); }}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

export default App;
