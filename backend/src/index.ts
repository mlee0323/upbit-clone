import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRouter, { authenticate } from './routes/auth.js';
import candlesRouter from './routes/candles.js';
import marketRouter from './routes/market.js';
import balanceRouter from './routes/balance.js';
import krwRouter from './routes/krw.js';
import favoritesRouter from './routes/favorites.js';
import ordersRouter from './routes/orders.js';
import tradesRouter from './routes/trades.js';
import communityRouter from './routes/community.js';
import { startScheduler, stopScheduler } from './scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// Public Routes (no auth required)
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', candlesRouter);
app.use('/api/v1', marketRouter);
app.use('/api/v1/community', communityRouter);

// Protected Routes (auth required)
app.use('/api/v1/balance', authenticate, balanceRouter);
app.use('/api/v1/krw', authenticate, krwRouter);
app.use('/api/v1/favorites', authenticate, favoritesRouter);
app.use('/api/v1/orders', authenticate, ordersRouter);
app.use('/api/v1/trades', authenticate, tradesRouter);

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Upbit Clone API is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`Upbit Clone Backend running on http://127.0.0.1:${PORT}`);
  console.log(`배포 테스트`);
  
  // Initialize WebSocket server for frontend clients
  const { initWebSocketServer } = await import('./wsServer.js');
  initWebSocketServer(server);
  
  // Start WebSocket connection for real-time data from Upbit
  const { connectUpbitWebSocket } = await import('./upbitWs.js');
  connectUpbitWebSocket();
  
  // Start candle data collector (stores to DB)
  const { startCandleScheduler } = await import('./candleCollector.js');
  startCandleScheduler();
  
  // Start scheduler for order matching only
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopScheduler();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  stopScheduler();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
