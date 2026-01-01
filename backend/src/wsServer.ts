// WebSocket server for broadcasting real-time data to frontend clients
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getAllTickers, getOrderbook, TickerData } from './redis.js';
import { subscribeToOrderbook } from './upbitWs.js';

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
    // Ensure backend is subscribed to this market from Upbit
    subscribeToOrderbook(message.market);

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
