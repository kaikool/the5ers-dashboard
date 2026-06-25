DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS accounts;

-- Bảng lưu trữ danh sách tài khoản
CREATE TABLE accounts (
    account_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance NUMERIC NOT NULL,
    equity NUMERIC NOT NULL,
    pnl NUMERIC NOT NULL,
    status TEXT NOT NULL,
    stats JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Bảng lưu chi tiết từng lệnh giao dịch
CREATE TABLE trades (
    trade_id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    entry_price NUMERIC,
    exit_price NUMERIC,
    pips NUMERIC,
    profit NUMERIC,
    open_date TIMESTAMP WITH TIME ZONE NOT NULL,
    close_date TIMESTAMP WITH TIME ZONE
);

-- Bảng lưu trữ lịch sử mua tài khoản (Purchase History)
CREATE TABLE purchases (
    purchase_id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    buying_power NUMERIC,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
