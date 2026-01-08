// WebSocket server for broadcasting real-time data to frontend clients
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getAllTickers, getOrderbook, TickerData, sub, pub } from './redis.js';
import store from './db.js';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

// Initialize WebSocket server
export function initWebSocketServer(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    clients.add(ws);

    // Send initial data
    sendInitialData(ws);

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        handleClientMessage(ws, data);
      } catch (error) {
        // Ignore invalid messages
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      clients.delete(ws);
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket client error:', error.message);
      clients.delete(ws);
    });
  });

  console.log('✅ WebSocket server initialized on /ws');

  // [추가] Redis Pub/Sub 구독 설정
  // 다른 서버(upbit-market)에서 보낸 데이터를 받아서 현재 서버에 연결된 클라이언트들에게 뿌려줍니다.
  sub.subscribe('ticker_updates', 'orderbook_updates', (err) => {
    if (err) console.error('Failed to subscribe to Redis channels:', err.message);
    else console.log('✅ Subscribed to Redis ticker/orderbook updates');
  });

  sub.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);
      if (channel === 'ticker_updates') {
        broadcastTicker(data);
        
        // [추가] 로컬 스토어 업데이트 (주문 체결 엔진용)
        store.createTickerData({
          symbol: data.market,
          currentPrice: data.trade_price,
          changeRate: data.signed_change_rate * 100,
          volume: data.acc_trade_volume_24h,
        });
      } else if (channel === 'orderbook_updates') {
        broadcastOrderbook(data.market, data.data);
      }
    } catch (error) {
      // Ignore parsing errors
    }
  });
}

// Send initial ticker data to new client
async function sendInitialData(ws: WebSocket): Promise<void> {
  try {
    const tickers = await getAllTickers();
    if (Object.keys(tickers).length > 0) {
      ws.send(JSON.stringify({
        type: 'tickers',
        data: Object.values(tickers),
      }));
    }
  } catch (error) {
    // Ignore errors
  }
}

// Handle messages from clients
async function handleClientMessage(ws: WebSocket, message: any): Promise<void> {
  if (message.type === 'subscribe_orderbook' && message.market) {
    // [변경] 직접 호출 대신 Redis Pub/Sub으로 수집기(upbit-market)에 알림
    pub.publish('subscription_requests', JSON.stringify({ market: message.market }));

    const orderbook = await getOrderbook(message.market);
    if (orderbook) {
      ws.send(JSON.stringify({
        type: 'orderbook',
        data: orderbook,
      }));
    }
  }
}

// Broadcast ticker update to all clients
export function broadcastTicker(ticker: TickerData): void {
  const message = JSON.stringify({
    type: 'ticker',
    data: ticker,
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast orderbook update to all clients
export function broadcastOrderbook(market: string, orderbook: any): void {
  const message = JSON.stringify({
    type: 'orderbook',
    market,
    data: orderbook,
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Get connected client count
export function getClientCount(): number {
  return clients.size;
}
