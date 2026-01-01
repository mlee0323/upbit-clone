-- TimescaleDB Candle Table
-- Run this AFTER Prisma migration creates the table

-- Create candles table (if using raw SQL instead of Prisma)
CREATE TABLE IF NOT EXISTS candles (
    time TIMESTAMPTZ NOT NULL,
    market VARCHAR(20) NOT NULL,
    interval VARCHAR(10) NOT NULL, -- 'minutes/1', 'minutes/5', 'days', etc.
    open DECIMAL(30, 10) NOT NULL,
    high DECIMAL(30, 10) NOT NULL,
    low DECIMAL(30, 10) NOT NULL,
    close DECIMAL(30, 10) NOT NULL,
    volume DECIMAL(30, 10) NOT NULL,
    PRIMARY KEY (market, interval, time)
);

-- Convert to TimescaleDB hypertable
-- Note: Run this only ONCE after table creation
SELECT create_hypertable('candles', 'time', if_not_exists => TRUE);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_candles_market_interval_time 
ON candles (market, interval, time DESC);

-- Optional: Set up compression policy (for old data)
-- ALTER TABLE candles SET (
--   timescaledb.compress,
--   timescaledb.compress_segmentby = 'market, interval'
-- );
-- SELECT add_compression_policy('candles', INTERVAL '7 days');

-- Optional: Set up retention policy (delete old data)
-- SELECT add_retention_policy('candles', INTERVAL '1 year');
