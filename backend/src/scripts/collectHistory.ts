// One-time script to collect 2 years of historical candle data
// Run with: npx tsx src/scripts/collectHistory.ts
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const UPBIT_API_URL = 'https://api.upbit.com/v1';
const REQUEST_DELAY_MS = 100; 

// Timeframe configurations - 2 years of data
const TIMEFRAMES = [
  { interval: 'M1', endpoint: 'minutes/1', maxCandles: 20000 },
  { interval: 'M5', endpoint: 'minutes/5', maxCandles: 20000 },
  { interval: 'M15', endpoint: 'minutes/15', maxCandles: 20000 },
  { interval: 'M60', endpoint: 'minutes/60', maxCandles: 17520 },
  { interval: 'D', endpoint: 'days', maxCandles: 730 },
  { interval: 'W', endpoint: 'weeks', maxCandles: 104 },
  { interval: 'Mo', endpoint: 'months', maxCandles: 24 },
];

interface UpbitCandle {
  market: string;
  candle_date_time_utc: string;
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  candle_acc_trade_volume: number;
}

interface UpbitMarket {
  market: string;
  korean_name: string;
  english_name: string;
}

// Fetch all KRW markets
async function fetchAllKRWMarkets(): Promise<string[]> {
  const response = await axios.get<UpbitMarket[]>(`${UPBIT_API_URL}/market/all`);
  return response.data
    .filter(m => m.market.startsWith('KRW-'))
    .map(m => m.market);
}

// Get oldest candle time from DB (to know where to continue back in time)
async function getOldestCandleTime(market: string, interval: string): Promise<Date | null> {
  try {
    const oldest = await prisma.candle.findFirst({
      where: { market, interval },
      orderBy: { time: 'asc' },
      select: { time: true },
    });
    return oldest?.time || null;
  } catch {
    return null;
  }
}

// Get candle count for market/interval
async function getCandleCount(market: string, interval: string): Promise<number> {
  try {
    return await prisma.candle.count({ where: { market, interval } });
  } catch {
    return 0;
  }
}

// Fetch candles with pagination - fetch from now to latestInDb
async function fetchCandlesSmart(
  market: string,
  endpoint: string,
  interval: string,
  maxCandles: number
): Promise<UpbitCandle[]> {
  // Get latest candle time in DB for this market/interval
  const latestInDbRaw = await prisma.candle.findFirst({
    where: { market, interval },
    orderBy: { time: 'desc' },
    select: { time: true },
  }).catch(() => null);
  
  // Compensate for KST storage: subtract 9 hours to get UTC for comparison with API
  const latestInDb = latestInDbRaw ? new Date(latestInDbRaw.time.getTime() - 9 * 60 * 60 * 1000) : null;
  
  const allCandles: UpbitCandle[] = [];
  let toParam = '';
  const batchSize = 200;
  
  // Fetch from "now" backwards until we reach latestInDb or hit maxCandles
  while (allCandles.length < maxCandles) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    
    let url = `${UPBIT_API_URL}/candles/${endpoint}?market=${market}&count=${batchSize}`;
    if (toParam) url += `&to=${toParam}`;
    
    try {
      const response = await axios.get<UpbitCandle[]>(url);
      const candles = response.data;
      
      if (candles.length === 0) break;
      
      // If we have data in DB, filter out candles we already have
      if (latestInDb) {
        // API returns UTC time without 'Z' suffix, add it for proper parsing
        const newCandles = candles.filter(c => 
          new Date(c.candle_date_time_utc + 'Z') > latestInDb
        );
        
        if (newCandles.length === 0) {
          // All fetched candles are already in DB, stop
          break;
        }
        
        // Check if oldest fetched is older than or equal to latest in DB
        const oldestFetched = new Date(candles[candles.length - 1].candle_date_time_utc + 'Z');
        if (oldestFetched <= latestInDb) {
          // We've reached existing data, add only new ones and stop
          allCandles.push(...newCandles);
          break;
        }
      }
      
      allCandles.push(...candles);
      toParam = candles[candles.length - 1].candle_date_time_utc;
      
      if (candles.length < batchSize) break;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        console.log('Rate limited, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      break;
    }
  }
  
  return allCandles;
}

// Save candles to database - BATCH INSERT for speed
async function saveCandles(candles: UpbitCandle[], interval: string): Promise<number> {
  if (candles.length === 0) return 0;
  
  const data = candles.map(c => ({
    market: c.market,
    interval: interval,
    time: new Date(new Date(c.candle_date_time_utc + 'Z').getTime() + 9 * 60 * 60 * 1000),
    open: c.opening_price,
    high: c.high_price,
    low: c.low_price,
    close: c.trade_price,
    volume: c.candle_acc_trade_volume,
  }));
  
  try {
    const result = await prisma.candle.createMany({
      data,
      skipDuplicates: true, // 중복 무시
    });
    return result.count;
  } catch (error) {
    // Fallback: 배치 실패 시 개별 저장
    let savedCount = 0;
    for (const candle of candles) {
      try {
        await prisma.candle.upsert({
          where: {
            market_interval_time: {
              market: candle.market,
              interval: interval,
              time: new Date(new Date(candle.candle_date_time_utc + 'Z').getTime() + 9 * 60 * 60 * 1000),
            },
          },
          update: {
            open: candle.opening_price,
            high: candle.high_price,
            low: candle.low_price,
            close: candle.trade_price,
            volume: candle.candle_acc_trade_volume,
          },
          create: {
            market: candle.market,
            interval: interval,
            time: new Date(new Date(candle.candle_date_time_utc + 'Z').getTime() + 9 * 60 * 60 * 1000),
            open: candle.opening_price,
            high: candle.high_price,
            low: candle.low_price,
            close: candle.trade_price,
            volume: candle.candle_acc_trade_volume,
          },
        });
        savedCount++;
      } catch {
        // Ignore
      }
    }
    return savedCount;
  }
}

// Main function - PARALLEL PROCESSING
async function main() {
  console.log('\n🕯️ ========================================');
  console.log('   Historical Candle Collection Script');
  console.log('   (PARALLEL MODE - 5 markets at once)');
  console.log('========================================\n');

  const markets = await fetchAllKRWMarkets();
  console.log(`Found ${markets.length} KRW markets\n`);

  let totalSaved = 0;
  const startTime = Date.now();

  for (const tf of TIMEFRAMES) {
    console.log(`\n📈 [${tf.interval}] Collecting (max ${tf.maxCandles}/market)...`);
    let tfSaved = 0;
    let tfSkipped = 0;
    
    // Sequential processing (rate limit safe)
    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];
      
      const candles = await fetchCandlesSmart(market, tf.endpoint, tf.interval, tf.maxCandles);
      
      if (candles.length === 0) {
        tfSkipped++;
        if (tfSkipped % 20 === 0) {
          console.log(`   [${i + 1}/${markets.length}] ${tfSkipped} markets already complete...`);
        }
        continue;
      }
      
      const saved = await saveCandles(candles, tf.interval);
      tfSaved += saved;
      totalSaved += saved;
      console.log(`   [${i + 1}/${markets.length}] ${market}: +${saved} candles`);
    }
    
    console.log(`   ✓ ${tf.interval} done: ${tfSaved.toLocaleString()} new, ${tfSkipped} skipped`);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n========================================');
  console.log(`✅ Collection complete!`);
  console.log(`   Total candles: ${totalSaved.toLocaleString()}`);
  console.log(`   Time elapsed: ${elapsed} minutes`);
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(console.error);
