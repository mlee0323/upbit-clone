import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { getCandlesCache, setCandlesCache } from '../redis.js';

const router = Router();

// Use slave DB for read operations (chart data) - falls back to master if not configured
// We use the Tailscale IP for cross-cluster access
const slaveDbUrl = process.env.DB_SLAVE_HOST 
  ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_SLAVE_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  : process.env.DATABASE_URL;

const prismaRead = new PrismaClient({
  datasources: slaveDbUrl ? { db: { url: slaveDbUrl } } : undefined,
});

console.log(`[Candles] Using read DB: ${process.env.DB_SLAVE_HOST || 'default (master)'}`);

const UPBIT_API_URL = 'https://api.upbit.com/v1';

// Get candle data for a specific symbol
// First tries Redis, then DB, falls back to Upbit API
router.get('/candles/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || 'M1';
    const limit = parseInt(req.query.limit as string) || 500;

    const cacheKey = `candles:${symbol}:${interval}:${limit}`;

    // 1. Try Redis cache first
    try {
      const cachedData = await getCandlesCache(cacheKey);
      if (cachedData) {
        console.log(`[Candles] Cache hit: ${cacheKey}`);
        return res.json(cachedData);
      }
    } catch (err) {
      console.warn('[Candles] Redis cache error:', err);
    }

    // 2. Try to get from database
    try {
      const candles = await prismaRead.candle.findMany({
        where: { 
          market: symbol,
          interval: interval,
        },
        select: {
          time: true,
          open: true,
          high: true,
          low: true,
          close: true,
          volume: true,
        },
        orderBy: { time: 'desc' },
        take: limit,
      });

      if (candles.length > 0) {
        const result = candles.map(c => ({
          time: c.time.toISOString().replace('Z', ''),
          symbol: symbol,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          current_price: Number(c.close),
          volume: Number(c.volume),
          change_rate: 0,
        })).reverse();

        // Save to Redis cache (TTL varies by interval)
        const ttl = interval === 'M1' ? 30 : interval.startsWith('M') ? 60 : 3600;
        await setCandlesCache(cacheKey, result, ttl).catch(() => {});
        
        return res.json(result);
      }
    } catch (dbError) {
      console.log('[Candles] DB not available, using Upbit API');
    }

    // 3. Fallback to Upbit API
    const endpoint = interval === 'D' ? 'days' : 
                     interval === 'W' ? 'weeks' : 
                     interval === 'Mo' ? 'months' : 
                     `minutes/${interval.replace('M', '')}`;
    
    const url = `${UPBIT_API_URL}/candles/${endpoint}?market=${symbol}&count=${limit}`;
    const response = await axios.get(url);
    
    const result = response.data.map((c: any) => ({
      time: c.candle_date_time_utc,
      symbol: symbol,
      open: c.opening_price,
      high: c.high_price,
      low: c.low_price,
      close: c.trade_price,
      current_price: c.trade_price,
      volume: c.candle_acc_trade_volume,
      change_rate: 0,
    })).reverse();

    // Cache the API result too
    await setCandlesCache(cacheKey, result, 60).catch(() => {});

    res.json(result);

  } catch (error) {
    console.error('Error fetching candles:', error);
    res.status(500).json({ detail: '데이터 조회 중 오류가 발생했습니다' });
  }
});

// Get available intervals
router.get('/intervals', (_req: Request, res: Response) => {
  res.json({ 
    intervals: [
      { code: 'M1', name: '1분' },
      { code: 'M5', name: '5분' },
      { code: 'M15', name: '15분' },
      { code: 'M60', name: '1시간' },
      { code: 'D', name: '일' },
      { code: 'W', name: '주' },
      { code: 'Mo', name: '월' },
    ]
  });
});

export default router;
