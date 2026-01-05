// Redis client for real-time market data
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisConnected = false;

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  family: 4,          // [필수] IPv4 강제
  
  lazyConnect: false, // [변경] false 권장 (시작하자마자 연결 시도)
  
  // [중요 변경] 재접속 전략 수정: 절대 포기하지 마라!
  retryStrategy: (times: number) => {
    // 3번 하고 포기하던 코드 삭제!
    // 재시도 딜레이를 최대 3초까지만 늘리고, 무한히 재시도합니다.
    const delay = Math.min(times * 50, 3000);
    return delay;
  },
  
  maxRetriesPerRequest: null, // [변경] 요청당 재시도 횟수 제한 해제 (혹은 3~5 정도로 설정)
  enableOfflineQueue: true,   // [변경] 연결 끊겨도 명령어를 큐에 쌓아뒀다 재연결되면 실행
});

redis.on('connect', () => {
  redisConnected = true;
  console.log('✅ Redis connected');
});

redis.on('error', (err: Error) => {
  redisConnected = false;
  console.warn('Redis error:', err.message);
});

redis.on('close', () => {
  redisConnected = false;
});

// Try to connect (non-blocking)
redis.connect().catch((err: Error) => {
  console.warn('Redis connection failed, running without cache:', err.message);
});

// ============ Ticker Methods ============

export interface TickerData {
  market: string;
  trade_price: number;
  signed_change_rate: number;
  signed_change_price: number;
  acc_trade_volume_24h: number;
  acc_trade_price_24h: number;
  high_price: number;
  low_price: number;
  prev_closing_price: number;
  timestamp: number;
}

// Save ticker (single market)
export async function setTicker(market: string, data: TickerData): Promise<void> {
  await redis.hset('tickers', market, JSON.stringify(data));
}

// Save multiple tickers
export async function setTickers(tickers: TickerData[]): Promise<void> {
  if (tickers.length === 0) return;
  
  const pipeline = redis.pipeline();
  for (const ticker of tickers) {
    pipeline.hset('tickers', ticker.market, JSON.stringify(ticker));
  }
  await pipeline.exec();
}

// Get all tickers
export async function getAllTickers(): Promise<Record<string, TickerData>> {
  const data = await redis.hgetall('tickers');
  const result: Record<string, TickerData> = {};
  
  for (const [market, json] of Object.entries(data)) {
    try {
      result[market] = JSON.parse(json);
    } catch {
      // Skip invalid JSON
    }
  }
  return result;
}

// Get specific tickers
export async function getTickers(markets: string[]): Promise<TickerData[]> {
  if (markets.length === 0) return [];
  
  const pipeline = redis.pipeline();
  for (const market of markets) {
    pipeline.hget('tickers', market);
  }
  
  const results = await pipeline.exec();
  const tickers: TickerData[] = [];
  
  if (results) {
    for (const [err, data] of results) {
      if (!err && data) {
        try {
          tickers.push(JSON.parse(data as string));
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
  return tickers;
}

// Get single ticker
export async function getTicker(market: string): Promise<TickerData | null> {
  const data = await redis.hget('tickers', market);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ============ Orderbook Methods ============

export interface OrderbookUnit {
  ask_price: number;
  bid_price: number;
  ask_size: number;
  bid_size: number;
}

export interface OrderbookData {
  market: string;
  timestamp: number;
  orderbook_units: OrderbookUnit[];
}

export async function setOrderbook(market: string, data: OrderbookData): Promise<void> {
  await redis.hset('orderbooks', market, JSON.stringify(data));
}

export async function getOrderbook(market: string): Promise<OrderbookData | null> {
  const data = await redis.hget('orderbooks', market);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ============ Markets List ============

export interface MarketInfo {
  market: string;
  korean_name: string;
  english_name: string;
}

export async function setMarkets(markets: MarketInfo[]): Promise<void> {
  await redis.set('markets', JSON.stringify(markets), 'EX', 3600); // 1 hour TTL
}

export async function getMarkets(): Promise<MarketInfo[]> {
  const data = await redis.get('markets');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// ============ Candle Caching ============

export async function setCandlesCache(key: string, data: any, ttlSeconds: number = 60): Promise<void> {
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
}

export async function getCandlesCache(key: string): Promise<any | null> {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Export redis client for direct use if needed
export { redis };
export default redis;
