import { useState, useEffect } from 'react';
import { Profile, AccountOverview, AccountDetail, Trade, Purchase } from './types';
import AccountCard from './components/AccountCard';
import DetailPanel from './components/DetailPanel';
import { supabase } from './supabaseClient';

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<AccountOverview[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountOverview | null>(null);
  const [detailData, setDetailData] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      if (!supabase) throw new Error('Supabase client chưa được khởi tạo.');

      const { data: dbAccounts, error: dbError } = await supabase
        .from('accounts').select('*').order('updated_at', { ascending: false });
      if (dbError) throw dbError;

      const { data: dbPurchases, error: pError } = await supabase
        .from('purchases').select('*').order('created_at', { ascending: false });
      if (pError) throw pError;

      const mappedPurchases: Purchase[] = (dbPurchases || []).map(p => ({
        id: p.purchase_id, productName: p.product_name, buyingPower: p.buying_power,
        price: p.price, currency: p.currency, status: p.status, createdAt: p.created_at
      }));

      if (dbAccounts && dbAccounts.length > 0) {
        const mappedAccounts: AccountOverview[] = dbAccounts.map(acc => ({
          accountId: acc.account_id, name: acc.name, balance: acc.balance,
          equity: acc.equity, pnl: acc.pnl, status: acc.status, type: acc.type,
          _rawStats: acc.stats
        }));
        mappedAccounts.sort((a, b) => Number(b.accountId) - Number(a.accountId));

        setAccounts(mappedAccounts);
        setPurchases(mappedPurchases);
        setProfile({
          userName: 'The5ers Trader', scrapedAt: dbAccounts[0].updated_at,
          accounts: mappedAccounts, purchases: mappedPurchases
        });
      } else {
        setProfile(null);
        setAccounts([]);
        setPurchases(mappedPurchases);
      }
    } catch (err: any) {
      setError(`Không thể kết nối: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectAccount(account: any) {
    setSelectedAccount(account);
    setDetailData(null);

    try {
      if (!supabase) return;
      const { data: dbTrades, error: dbError } = await supabase
        .from('trades').select('*').eq('account_id', account.accountId)
        .order('open_date', { ascending: false });
      if (dbError) throw dbError;

      const trades: Trade[] = (dbTrades || []).map(t => ({
        tradeId: t.trade_id, instrument: t.symbol,
        direction: (String(t.side).toLowerCase() === '0' || String(t.side).toLowerCase() === 'buy') ? 'buy' : 'sell',
        volume: t.quantity, openPrice: t.entry_price, closePrice: t.exit_price,
        pnl: t.profit, pnlPoints: t.pips || 0, fees: 0,
        openTime: t.open_date, closeTime: t.close_date,
        duration: getDuration(t.open_date, t.close_date)
      }));
      trades.sort((a, b) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime());

      const rawStats = account._rawStats || {};
      const winRateRaw = rawStats.winRate || 0;
      const detail: AccountDetail = {
        ...account, ...rawStats, trades, stats: rawStats,
        winRate: (winRateRaw > 0 && winRateRaw <= 1) ? winRateRaw * 100 : winRateRaw,
        dailyDrawdown: rawStats.balanceDetails?.dailyProfitAndLoss,
        dailyDrawdownLimit: rawStats.balanceDetails?.allowedDailyLosses,
        maxDrawdown: rawStats.balanceDetails?.profitAndLoss,
        maxDrawdownLimit: rawStats.balanceDetails?.maxLoss ? -rawStats.balanceDetails.maxLoss : undefined
      };
      setDetailData(detail);
    } catch (err) {
      console.error('Lỗi tải lệnh:', err);
    }
  }

  function getDuration(open: string, close: string) {
    if (!open || !close) return 'N/A';
    const diffMs = new Date(close).getTime() - new Date(open).getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'N/A';
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    if (diffMins > 0) return `${diffMins}m`;
    return '< 1m';
  }

  function formatCurrency(value: number): string {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return value < 0 ? `-$${formatted}` : `$${formatted}`;
  }

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="app">
        <div className="empty-state">
          <div className="loading-spinner" />
          <h2>Đang kết nối...</h2>
          <p>Đang đồng bộ dữ liệu từ Supabase</p>
        </div>
      </div>
    );
  }

  if (!profile || accounts.length === 0) {
    return (
      <div className="app">
        <div className="empty-state">
          <span className="material-symbols-rounded" style={{ fontSize: 48, color: 'var(--md-outline)' }}>database</span>
          <h2>Chưa có dữ liệu</h2>
          <p>Hãy chạy scraper để đồng bộ dữ liệu tài khoản The5ers.</p>
          {error && <div className="error-banner"><span className="material-symbols-rounded">error</span>{error}</div>}
        </div>
      </div>
    );
  }

  const getDataAge = (scrapedAt: string) => {
    const ageMins = Math.floor((Date.now() - new Date(scrapedAt).getTime()) / 60000);
    if (ageMins < 5) return { text: 'Vừa cập nhật', status: 'live' };
    if (ageMins < 60) return { text: `${ageMins} phút trước`, status: 'live' };
    if (ageMins < 1440) return { text: `${Math.floor(ageMins / 60)}h trước`, status: 'stale' };
    return { text: `${Math.floor(ageMins / 1440)} ngày trước`, status: 'offline' };
  };

  const totalSpend = purchases.reduce((sum, p) => sum + p.price, 0);
  const totalPNL = accounts.reduce((sum, a) => sum + a.pnl, 0);
  const netROI = totalPNL - totalSpend;

  const activeAccounts = accounts.filter(a => a.status === 'active' || a.status === 'avaiable');
  const disabledAccounts = accounts.filter(a => a.status !== 'active' && a.status !== 'avaiable');

  const groupByType = (group: AccountOverview[]) => ({
    funded: group.filter(a => a.type === 'funded'),
    evaluation: group.filter(a => a.type === 'evaluation'),
    demo: group.filter(a => a.type === 'demo')
  });

  const activeGroup = groupByType(activeAccounts);
  const disabledGroup = groupByType(disabledAccounts);
  const age = getDataAge(profile.scrapedAt);

  const renderSection = (title: string, items: AccountOverview[], isDimmed = false) => {
    if (items.length === 0) return null;
    return (
      <div style={{ opacity: isDimmed ? 0.6 : 1 }}>
        <div className="account-grid">
          {items.map(account => (
            <AccountCard
              key={account.accountId}
              account={account}
              onClick={() => handleSelectAccount(account)}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      </div>
    );
  };

  if (selectedAccount) {
    return (
      <div className="app">
        <DetailPanel
          account={selectedAccount}
          detail={detailData}
          onClose={() => { setSelectedAccount(null); setDetailData(null); }}
          formatCurrency={formatCurrency}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {/* ── Top App Bar ── */}
      <div className="top-app-bar">
        <h1>The5ers Dashboard</h1>
        <div className="subtitle">
          <span>{profile.userName}</span>
          <span>•</span>
          <span>{accounts.length} tài khoản</span>
          <span>•</span>
          <div className="status-chip">
            <span className={`status-dot ${age.status}`} />
            {age.text}
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="error-banner">
          <span className="material-symbols-rounded">error</span>
          {error}
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="summary-row">
        <div className="summary-card">
          <div className="summary-label">Tổng chi phí</div>
          <div className="summary-value">{formatCurrency(totalSpend)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Tổng P&L</div>
          <div className="summary-value" style={{ color: totalPNL > 0 ? 'var(--color-profit)' : totalPNL < 0 ? 'var(--color-loss)' : undefined }}>
            {formatCurrency(totalPNL)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">ROI ròng</div>
          <div className="summary-value" style={{ color: netROI > 0 ? 'var(--color-profit)' : netROI < 0 ? 'var(--color-loss)' : undefined }}>
            {formatCurrency(netROI)}
          </div>
        </div>
      </div>

      {/* ── Active Accounts ── */}
      <div className="section-header">
        <div className="section-icon active">
          <span className="material-symbols-rounded">trending_up</span>
        </div>
        <span className="section-title">Đang hoạt động</span>
        <span className="section-count">{activeAccounts.length}</span>
      </div>

      {activeGroup.funded.length > 0 && renderSection('Cấp Vốn', activeGroup.funded)}
      {activeGroup.evaluation.length > 0 && renderSection('Đánh Giá', activeGroup.evaluation)}
      {activeGroup.demo.length > 0 && renderSection('Demo', activeGroup.demo)}

      {activeAccounts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--md-on-surface-variant)', font: 'var(--md-body-medium)' }}>
          Không có tài khoản nào đang hoạt động
        </div>
      )}

      {/* ── Disabled Accounts ── */}
      {disabledAccounts.length > 0 && (
        <>
          <div style={{ margin: '32px 0 8px' }}>
            <div className="md-divider" />
          </div>

          <div
            className={`expansion-header ${showHistory ? 'expanded' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
          >
            <div className="expansion-label">
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>history</span>
              Đã vô hiệu hóa
              <span className="section-count">{disabledAccounts.length}</span>
            </div>
            <span className="material-symbols-rounded expansion-icon">expand_more</span>
          </div>

          {showHistory && (
            <div className="expansion-content">
              {disabledGroup.funded.length > 0 && (
                <>
                  <div className="section-header">
                    <span className="section-title" style={{ font: 'var(--md-label-large)', color: 'var(--md-on-surface-variant)' }}>Cấp Vốn</span>
                    <span className="section-count">{disabledGroup.funded.length}</span>
                  </div>
                  {renderSection('', disabledGroup.funded, true)}
                </>
              )}
              {disabledGroup.evaluation.length > 0 && (
                <>
                  <div className="section-header">
                    <span className="section-title" style={{ font: 'var(--md-label-large)', color: 'var(--md-on-surface-variant)' }}>Đánh Giá</span>
                    <span className="section-count">{disabledGroup.evaluation.length}</span>
                  </div>
                  {renderSection('', disabledGroup.evaluation, true)}
                </>
              )}
              {disabledGroup.demo.length > 0 && (
                <>
                  <div className="section-header">
                    <span className="section-title" style={{ font: 'var(--md-label-large)', color: 'var(--md-on-surface-variant)' }}>Demo</span>
                    <span className="section-count">{disabledGroup.demo.length}</span>
                  </div>
                  {renderSection('', disabledGroup.demo, true)}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
