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

  // Mở/đóng lịch sử
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Supabase client chưa được khởi tạo. Vui lòng kiểm tra file .env');
      }

      // Fetch accounts
      const { data: dbAccounts, error: dbError } = await supabase
        .from('accounts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (dbError) throw dbError;

      // Fetch purchases
      const { data: dbPurchases, error: pError } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (pError) throw pError;

      const mappedPurchases: Purchase[] = (dbPurchases || []).map(p => ({
        id: p.purchase_id,
        productName: p.product_name,
        buyingPower: p.buying_power,
        price: p.price,
        currency: p.currency,
        status: p.status,
        createdAt: p.created_at
      }));

      if (dbAccounts && dbAccounts.length > 0) {
        // Map DB accounts to AccountOverview
        const mappedAccounts: AccountOverview[] = dbAccounts.map(acc => ({
          accountId: acc.account_id,
          name: acc.name,
          balance: acc.balance,
          equity: acc.equity,
          pnl: acc.pnl,
          status: acc.status,
          type: acc.type,
          _rawStats: acc.stats // Keep raw stats for DetailPanel
        }));

        // Sắp xếp tài khoản theo ID giảm dần (tương đương với mới nhất xếp trước)
        mappedAccounts.sort((a, b) => Number(b.accountId) - Number(a.accountId));

        setAccounts(mappedAccounts);
        setPurchases(mappedPurchases);
        setProfile({
          userName: 'The5ers Trader',
          scrapedAt: dbAccounts[0].updated_at,
          accounts: mappedAccounts,
          purchases: mappedPurchases
        });
      } else {
        setProfile(null);
        setAccounts([]);
        setPurchases(mappedPurchases);
      }
    } catch (err: any) {
      setError(`Không thể kết nối Supabase: ${err.message || err}`);
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
        .from('trades')
        .select('*')
        .eq('account_id', account.accountId)
        .order('open_date', { ascending: false });

      if (dbError) throw dbError;

      const trades: Trade[] = (dbTrades || []).map(t => ({
        tradeId: t.trade_id,
        instrument: t.symbol,
        direction: (String(t.side).toLowerCase() === '0' || String(t.side).toLowerCase() === 'buy') ? 'buy' : 'sell',
        volume: t.quantity,
        openPrice: t.entry_price,
        closePrice: t.exit_price,
        pnl: t.profit,
        pnlPoints: t.pips || 0,
        fees: 0,
        openTime: t.open_date,
        closeTime: t.close_date,
        duration: getDuration(t.open_date, t.close_date)
      }));
      
      // Sắp xếp lệnh theo thời gian mở giảm dần (mới nhất xếp trước)
      trades.sort((a, b) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime());

      // Reconstruct detail
      const rawStats = account._rawStats || {};
      const winRateRaw = rawStats.winRate || 0;
      
      const detail: AccountDetail = {
        ...account,
        ...rawStats,
        trades,
        stats: rawStats,
        winRate: (winRateRaw > 0 && winRateRaw <= 1) ? winRateRaw * 100 : winRateRaw,
        dailyDrawdown: rawStats.balanceDetails?.dailyProfitAndLoss,
        dailyDrawdownLimit: rawStats.balanceDetails?.allowedDailyLosses,
        maxDrawdown: rawStats.balanceDetails?.profitAndLoss,
        maxDrawdownLimit: rawStats.balanceDetails?.maxLoss ? -rawStats.balanceDetails.maxLoss : undefined
      };

      setDetailData(detail);
    } catch (err) {
      console.error('Lỗi tải lệnh giao dịch:', err);
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
          <h2>⏳ Đang kết nối mây Supabase...</h2>
          <p>Đang đồng bộ dữ liệu Real-time...</p>
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
            Chưa có dữ liệu trên Database. Hãy chạy scraper trước.
          </p>
          {error && <div className="error-state">{error}</div>}
        </div>
      </div>
    );
  }

  const getAgeStatus = (scrapedAt: string) => {
    const ageMs = Date.now() - new Date(scrapedAt).getTime();
    const ageMins = Math.floor(ageMs / 60000);
    if (ageMins < 5) return { text: `Trực tiếp • Vừa xong`, type: 'safe' };
    if (ageMins < 60) return { text: `Trực tiếp • ${ageMins}p trước`, type: 'safe' };
    if (ageMins < 120) return { text: `Đã cập nhật ${Math.floor(ageMins/60)}h trước`, type: 'warning' };
    return { text: `Ngoại tuyến (${Math.floor(ageMins/60)}h)`, type: 'danger' };
  };

  // Tính toán chỉ số tài chính (dựa trên tất cả tài khoản có PnL)
  const totalSpend = purchases.reduce((sum, p) => sum + p.price, 0);
  const totalPNL = accounts.reduce((sum, a) => sum + a.pnl, 0);
  const netROI = totalPNL - totalSpend;

  // Phân nhóm tài khoản
  const activeAccounts = accounts.filter(a => a.status === 'active' || a.status === 'avaiable');
  const disabledAccounts = accounts.filter(a => a.status !== 'active' && a.status !== 'avaiable');

  const getGroupByType = (group: AccountOverview[]) => ({
    funded: group.filter(a => a.type === 'funded'),
    evaluation: group.filter(a => a.type === 'evaluation'),
    demo: group.filter(a => a.type === 'demo')
  });

  const activeGroup = getGroupByType(activeAccounts);
  const disabledGroup = getGroupByType(disabledAccounts);

  const renderSection = (title: string, accounts: AccountOverview[], icon: string, isDimmed = false) => {
    if (accounts.length === 0) return null;
    return (
      <div style={{ marginTop: '24px', opacity: isDimmed ? 0.7 : 1 }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon} {title} ({accounts.length})
        </h3>
        <div className="account-grid">
          {accounts.map((account) => (
            <AccountCard
              key={account.accountId}
              account={account}
              selected={false}
              onClick={() => handleSelectAccount(account)}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {/* Header */}
      {!selectedAccount && (
        <div className="header">
          <div>
            <h1 className="text-hero">Trung Tâm Điều Khiển</h1>
            <div className="header-meta">
              <span>{profile.userName || 'The5ers Trader'}</span>
              <span>•</span>
              <span>{accounts.length} Tài Khoản (Tổng)</span>
            </div>
            
            {/* Thống kê ROI */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tổng Chi Phí Mua TK</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{formatCurrency(totalSpend)}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tổng Lợi Nhuận (P&L)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: totalPNL > 0 ? 'var(--success-neon)' : 'var(--danger-neon)' }}>
                  {formatCurrency(totalPNL)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Lợi Nhuận Ròng (ROI)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: netROI > 0 ? 'var(--success-neon)' : 'var(--danger-neon)' }}>
                  {formatCurrency(netROI)}
                </div>
              </div>
            </div>

          </div>
          <div className="header-actions">
            {profile.scrapedAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                <span className={`status-dot ${getAgeStatus(profile.scrapedAt).type}`} />
                {getAgeStatus(profile.scrapedAt).text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="error-state">{error}</div>}

      {/* Main View: Either Account List OR Detail Panel */}
      {!selectedAccount ? (
        <>
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-dim)' }}>
            🟢 <b>Đang hoạt động ({activeAccounts.length})</b>
          </div>

          {renderSection('Tài Khoản Đã Cấp Vốn (Active)', activeGroup.funded, '🏆')}
          {renderSection('Tài Khoản Đánh Giá (Active)', activeGroup.evaluation, '🎯')}
          {renderSection('Tài Khoản Demo (Active)', activeGroup.demo, '🎓')}

          {disabledAccounts.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-dim)' }}>
                🔴 <b>Đã vô hiệu hóa / Lịch sử ({disabledAccounts.length})</b>
              </div>
              
              <div onClick={() => setShowHistory(!showHistory)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: 'var(--text-base)', marginBottom: 24 }}>
                {showHistory ? '▼' : '▶'} Hiển thị danh sách tài khoản đã đóng
              </div>

              {showHistory && (
                <>
                  {renderSection('Tài Khoản Đã Cấp Vốn (Disable)', disabledGroup.funded, '🏆', true)}
                  {renderSection('Tài Khoản Đánh Giá (Disable)', disabledGroup.evaluation, '🎯', true)}
                  {renderSection('Tài Khoản Demo (Disable)', disabledGroup.demo, '🎓', true)}
                </>
              )}
            </div>
          )}
        </>
      ) : (
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
