// Upbit WebSocket client for real-time market data
import WebSocket from 'ws';
import axios from 'axios';
import { setTickers, setOrderbook, setMarkets, TickerData, OrderbookData, MarketInfo } from './redis.js';
import { broadcastTicker, broadcastOrderbook } from './wsServer.js';
import store from './db.js';

const UPBIT_WS_URL = 'wss://api.upbit.com/websocket/v1';
const UPBIT_API_URL = 'https://api.upbit.com/v1';

// Will be populated from API
let KRW_MARKETS: string[] = [];

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let pingInterval: NodeJS.Timeout | null = null;
const activeOrderbookMarkets = new Set<string>(['KRW-BTC', 'KRW-ETH', 'KRW-XRP']); // Default popular coins

interface UpbitWSTickerData {
  type: 'ticker';
  code: string;
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

interface UpbitWSOrderbookData {
  type: 'orderbook';
  code: string;
  timestamp: number;
  orderbook_units: {
    ask_price: number;
    bid_price: number;
    ask_size: number;
    bid_size: number;
  }[];
}

interface UpbitMarket {
  market: string;
  korean_name: string;
  english_name: string;
}

// Generate UUID for ticket
const generateTicket = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Fetch all KRW markets from Upbit API
async function fetchKRWMarkets(): Promise<string[]> {
  try {
    const response = await axios.get<UpbitMarket[]>(`${UPBIT_API_URL}/market/all`);
    const krwMarkets = response.data
      .filter(m => m.market.startsWith('KRW-'))
      .map(m => m.market);
    
    // Save to Redis
    const marketInfos: MarketInfo[] = response.data
      .filter(m => m.market.startsWith('KRW-'))
      .map(m => ({
        market: m.market,
        korean_name: m.korean_name,
        english_name: m.english_name,
      }));
    await setMarkets(marketInfos);
    
    console.log(`Fetched ${krwMarkets.length} KRW markets`);
    return krwMarkets;
  } catch (error) {
    console.error('Failed to fetch markets:', error);
    // Fallback to popular coins
    return [
      "KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE",
      "KRW-ADA", "KRW-AVAX", "KRW-DOT", "KRW-LINK", "KRW-SHIB",
    ];
  }
}

// Connect to Upbit WebSocket
export async function connectUpbitWebSocket(): Promise<void> {
  // Fetch markets first
  KRW_MARKETS = await fetchKRWMarkets();
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return;
  }

  console.log('Connecting to Upbit WebSocket...');
  ws = new WebSocket(UPBIT_WS_URL);

  ws.on('open', () => {
    console.log('✅ Upbit WebSocket connected');

    updateSubscription();

    // Keep connection alive with ping
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
  });

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'ticker') {
        await handleTickerData(message as UpbitWSTickerData);
      } else if (message.type === 'orderbook') {
        await handleOrderbookData(message as UpbitWSOrderbookData);
      }
    } catch (error) {
      // Ignore parsing errors
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`WebSocket closed: ${code} - ${reason.toString()}`);
    cleanup();
    scheduleReconnect();
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error.message);
    cleanup();
    scheduleReconnect();
  });

  ws.on('pong', () => {
    // Connection is alive
  });
}

// Handle ticker data
async function handleTickerData(data: UpbitWSTickerData): Promise<void> {
  const ticker: TickerData = {
    market: data.code,
    trade_price: data.trade_price,
    signed_change_rate: data.signed_change_rate,
    signed_change_price: data.signed_change_price,
    acc_trade_volume_24h: data.acc_trade_volume_24h,
    acc_trade_price_24h: data.acc_trade_price_24h,
    high_price: data.high_price,
    low_price: data.low_price,
    prev_closing_price: data.prev_closing_price,
    timestamp: data.timestamp,
  };

  // Save to Redis
  await setTickers([ticker]);

  // Broadcast to frontend clients
  broadcastTicker(ticker);

  // Also update in-memory store for order matching
  store.createTickerData({
    symbol: data.code,
    currentPrice: data.trade_price,
    changeRate: data.signed_change_rate * 100,
    volume: data.acc_trade_volume_24h,
  });
}

// Handle orderbook data
async function handleOrderbookData(data: UpbitWSOrderbookData): Promise<void> {
  const orderbook: OrderbookData = {
    market: data.code,
    timestamp: data.timestamp,
    orderbook_units: data.orderbook_units.slice(0, 15),
  };

  await setOrderbook(data.code, orderbook);
  
  // Broadcast to frontend clients
  broadcastOrderbook(data.code, orderbook);
}

// Update Upbit subscription with current markets
export function updateSubscription(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const tickerMarkets = KRW_MARKETS;
  const orderbookMarkets = Array.from(activeOrderbookMarkets);

  const subscribeMessage = JSON.stringify([
    { ticket: generateTicket() },
    { type: 'ticker', codes: tickerMarkets, isOnlyRealtime: false },
    { type: 'orderbook', codes: orderbookMarkets, isOnlyRealtime: false },
  ]);

  ws.send(subscribeMessage);
  console.log(`🔄 Upbit subscription updated: ${tickerMarkets.length} tickers, ${orderbookMarkets.length} orderbooks`);
  console.log(`Active orderbooks: ${orderbookMarkets.join(', ')}`);
}

// Add a market to active orderbook subscriptions
export function subscribeToOrderbook(market: string): void {
  if (!activeOrderbookMarkets.has(market)) {
    // Limit to 15 orderbooks to avoid Upbit limits
    if (activeOrderbookMarkets.size >= 15) {
      const first = activeOrderbookMarkets.values().next().value;
      if (first) activeOrderbookMarkets.delete(first);
    }
    activeOrderbookMarkets.add(market);
    updateSubscription();
  }
}

// Cleanup resources
function cleanup(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  ws = null;
}

// Schedule reconnection
function scheduleReconnect(): void {
  if (reconnectTimeout) return;

  console.log('Reconnecting in 5 seconds...');
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectUpbitWebSocket();
  }, 5000);
}

// Disconnect WebSocket
export function disconnectUpbitWebSocket(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (ws) {
    ws.close();
    cleanup();
  }

  console.log('WebSocket disconnected');
}
