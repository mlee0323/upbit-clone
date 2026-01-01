-- Upbit Clone Database Schema
-- Database: upbit

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. User Balances
CREATE TABLE IF NOT EXISTS user_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    balance DECIMAL(30, 10) DEFAULT 0,
    locked DECIMAL(30, 10) DEFAULT 0,
    avg_buy_price DECIMAL(30, 10) DEFAULT 0,
    UNIQUE(user_id, currency)
);

-- 3. KRW Transactions
CREATE TABLE IF NOT EXISTS krw_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL, -- deposit, withdraw
    amount DECIMAL(20, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    market VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- bid, ask
    ord_type VARCHAR(20) NOT NULL, -- limit, market
    price DECIMAL(30, 10),
    volume DECIMAL(30, 10) NOT NULL,
    remaining_volume DECIMAL(30, 10) NOT NULL,
    state VARCHAR(20) DEFAULT 'wait', -- wait, done, cancel
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_state ON orders(user_id, state);
CREATE INDEX IF NOT EXISTS idx_orders_market_side ON orders(market, side, state);

-- 5. Trades
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    market VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    price DECIMAL(30, 10) NOT NULL,
    volume DECIMAL(30, 10) NOT NULL,
    funds DECIMAL(30, 10) NOT NULL,
    fee DECIMAL(30, 10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Favorites
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    market VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, market)
);

-- 7. Posts
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Comments
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Done!
SELECT 'Tables created successfully!' as status;
