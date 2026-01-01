// Candle data collector - incremental updates only
// For initial 2-year history, run: npx tsx src/scripts/collectHistory.ts
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();
const UPBIT_API_URL = 'https://api.upbit.com/v1';
const REQUEST_DELAY_MS = 100; // 100ms = 초당 10회 (업비트 최대 한도)

let allKRWMarkets: string[] = [];
let candleSchedulerTask: cron.ScheduledTask | null = null;
let isCollecting = false;

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
  try {
    const response = await axios.get<UpbitMarket[]>(`${UPBIT_API_URL}/market/all`);
    const markets = response.data
      .filter(m => m.market.startsWith('KRW-'))
      .map(m => m.market);
    console.log(`📊 Found ${markets.length} KRW markets`);
    return markets;
  } catch (error) {
    console.error('Failed to fetch markets:', error);
    return [];
  }
}

// Get latest candle time from DB
async function getLatestCandleTime(market: string, interval: string): Promise<Date | null> {
  try {
    const latest = await prisma.candle.findFirst({
      where: { market, interval },
      orderBy: { time: 'desc' },
      select: { time: true },
    });
    return latest?.time || null;
  } catch {
    return null;
  }
}

// Fetch only new candles (since last in DB)
async function fetchNewCandles(
  market: string,
  endpoint: string,
  interval: string
): Promise<UpbitCandle[]> {
  const latestInDbRaw = await getLatestCandleTime(market, interval);
  // Compensate for KST storage: subtract 9 hours to get UTC for comparison with API
  const latestInDb = latestInDbRaw ? new Date(latestInDbRaw.getTime() - 9 * 60 * 60 * 1000) : null;
  
  const allCandles: UpbitCandle[] = [];
  let toParam = '';
  
  // Debug: show what we're working with
  if (latestInDb && market === 'KRW-BTC') {
    console.log(`      [DEBUG] ${market} latestInDb: ${latestInDb.toISOString()}`);
  }
  
  // Fetch at most 50 batches (10,000 candles) to catch up larger gaps
  for (let batch = 0; batch < 50; batch++) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    
    let url = `${UPBIT_API_URL}/candles/${endpoint}?market=${market}&count=200`;
    if (toParam) url += `&to=${toParam}`;
    
    try {
      const response = await axios.get<UpbitCandle[]>(url);
      const candles = response.data;
      
      if (candles.length === 0) break;
      
      // Debug: show first batch info for BTC
      if (batch === 0 && market === 'KRW-BTC') {
        console.log(`      [DEBUG] API returned ${candles.length} candles`);
        console.log(`      [DEBUG] Newest: ${candles[0]?.candle_date_time_utc}`);
        console.log(`      [DEBUG] Oldest: ${candles[candles.length - 1]?.candle_date_time_utc}`);
      }
      
      // Check if we've caught up to DB
      if (latestInDb) {
        // API returns UTC time without 'Z' suffix, add it for proper parsing
        const oldestTimeStr = candles[candles.length - 1].candle_date_time_utc;
        const oldestFetched = new Date(oldestTimeStr + 'Z'); // Add Z for UTC
        
        // Debug comparison for BTC
        if (batch === 0 && market === 'KRW-BTC') {
          console.log(`      [DEBUG] oldestFetched: ${oldestFetched.toISOString()}`);
          console.log(`      [DEBUG] latestInDb:    ${latestInDb.toISOString()}`);
          console.log(`      [DEBUG] oldest <= latest? ${oldestFetched <= latestInDb}`);
        }
        
        if (oldestFetched <= latestInDb) {
          // Only keep new ones (also fix timezone for filter)
          const newCandles = candles.filter(c => 
            new Date(c.candle_date_time_utc + 'Z') > latestInDb
          );
          allCandles.push(...newCandles);
          break;
        }
      }
      
      allCandles.push(...candles);
      toParam = candles[candles.length - 1].candle_date_time_utc;
      
      if (candles.length < 200) break;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      break;
    }
  }
  
  // Debug: log fetch stats
  if (allCandles.length > 0) {
    const oldest = allCandles[allCandles.length - 1]?.candle_date_time_utc;
    const newest = allCandles[0]?.candle_date_time_utc;
    console.log(`      → Fetched ${allCandles.length} (${oldest?.slice(0, 16)} ~ ${newest?.slice(0, 16)})`);
  }
  
  return allCandles;
}

// Save candles to database - BATCH INSERT
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
      skipDuplicates: true,
    });
    return result.count;
  } catch {
    return 0;
  }
}

// Fill gaps since last update (quick startup check)
async function fillGaps(): Promise<void> {
  if (isCollecting) return;
  isCollecting = true;
  
  const now = new Date();
  console.log('\n🕯️ ========================================');
  console.log('   Candle Data Update');
  console.log('   (Filling gaps since last run)');
  console.log('========================================\n');
  console.log(`Update time: ${now.toLocaleString('ko-KR')}`);
  
  const existingCount = await prisma.candle.count().catch(() => 0);
  console.log(`Existing candles in DB: ${existingCount.toLocaleString()}`);
  
  if (existingCount === 0) {
    console.log('⚠️ No data in DB. Run: npx tsx src/scripts/collectHistory.ts');
    isCollecting = false;
    return;
  }
  
  console.log(`Markets: ${allKRWMarkets.length}\n`);
  
  // Update all timeframes for all markets
  const timeframes = [
    { interval: 'M1', endpoint: 'minutes/1' },
    { interval: 'M5', endpoint: 'minutes/5' },
    { interval: 'M15', endpoint: 'minutes/15' },
    { interval: 'M60', endpoint: 'minutes/60' },
    { interval: 'D', endpoint: 'days' },
    { interval: 'W', endpoint: 'weeks' },
    { interval: 'Mo', endpoint: 'months' },
  ];
  
  let totalFilled = 0;
  const startTime = Date.now();
  
  for (const tf of timeframes) {
    // Get the latest candle time for a major market to show date range
    const latestBTC = await getLatestCandleTime('KRW-BTC', tf.interval);
    const fromTime = latestBTC ? latestBTC.toISOString().replace('T', ' ').slice(0, 19) : 'N/A';
    const toTime = now.toISOString().replace('T', ' ').slice(0, 19);
    
    console.log(`\n📈 [${tf.interval}] Updating... (${fromTime} → ${toTime})`);
    let tfFilled = 0;
    let tfSkipped = 0;
    
    for (let i = 0; i < allKRWMarkets.length; i++) {
      const market = allKRWMarkets[i];
      const candles = await fetchNewCandles(market, tf.endpoint, tf.interval);
      
      if (candles.length === 0) {
        tfSkipped++;
        if (tfSkipped % 50 === 0) {
          console.log(`   [${i + 1}/${allKRWMarkets.length}] ${tfSkipped} markets already up to date...`);
        }
        continue;
      }
      
      const saved = await saveCandles(candles, tf.interval);
      tfFilled += saved;
      totalFilled += saved;
      console.log(`   [${i + 1}/${allKRWMarkets.length}] ${market}: +${saved} candles`);
    }
    
    console.log(`   ✓ ${tf.interval} done: ${tfFilled.toLocaleString()} new, ${tfSkipped} skipped`);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n========================================');
  console.log(`✅ Update complete!`);
  console.log(`   Total new candles: ${totalFilled.toLocaleString()}`);
  console.log(`   Time elapsed: ${elapsed} minutes`);
  console.log('========================================\n');
  
  isCollecting = false;
}

// Collect latest M1 candles - OPTIMIZED with parallel fetch
async function collectLatestM1(): Promise<void> {
  if (isCollecting) return;
  isCollecting = true;
  
  const allCandles: UpbitCandle[] = [];
  const batchSize = 10; // 10 parallel requests (초당 10회 한도에 맞춤)
  
  for (let i = 0; i < allKRWMarkets.length; i += batchSize) {
    const batch = allKRWMarkets.slice(i, i + batchSize);
    
    // Fetch in parallel
    const promises = batch.map(market => 
      axios.get<UpbitCandle[]>(`${UPBIT_API_URL}/candles/minutes/1?market=${market}&count=3`)
        .then(res => res.data)
        .catch(() => [] as UpbitCandle[])
    );
    
    const results = await Promise.all(promises);
    results.forEach(candles => allCandles.push(...candles));
    
    // Wait 1 second between batches (10 requests per second)
    if (i + batchSize < allKRWMarkets.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Save all at once
  if (allCandles.length > 0) {
    await saveCandles(allCandles, 'M1');
  }
  
  isCollecting = false;
}

// Collect latest for other timeframes - OPTIMIZED
async function collectOtherTimeframes(): Promise<void> {
  if (isCollecting) return;
  isCollecting = true;
  
  const timeframes = [
    { interval: 'M5', endpoint: 'minutes/5' },
    { interval: 'M15', endpoint: 'minutes/15' },
    { interval: 'M60', endpoint: 'minutes/60' },
    { interval: 'D', endpoint: 'days' },
    { interval: 'W', endpoint: 'weeks' },
    { interval: 'Mo', endpoint: 'months' },
  ];
  
  const markets = allKRWMarkets.slice(0, 50); // Top 50
  const batchSize = 10;
  
  for (const tf of timeframes) {
    const allCandles: UpbitCandle[] = [];
    
    for (let i = 0; i < markets.length; i += batchSize) {
      const batch = markets.slice(i, i + batchSize);
      
      const promises = batch.map(market =>
        axios.get<UpbitCandle[]>(`${UPBIT_API_URL}/candles/${tf.endpoint}?market=${market}&count=3`)
          .then(res => res.data)
          .catch(() => [] as UpbitCandle[])
      );
      
      const results = await Promise.all(promises);
      results.forEach(candles => allCandles.push(...candles));
      
      if (i + batchSize < markets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (allCandles.length > 0) {
      await saveCandles(allCandles, tf.interval);
    }
  }
  
  isCollecting = false;
}

// Start scheduler
export function startCandleScheduler(): void {
  console.log('Starting candle update scheduler...');
  
  // Initialize markets and fill gaps FIRST, then start cron jobs
  setTimeout(async () => {
    allKRWMarkets = await fetchAllKRWMarkets();
    
    // Fill gaps first
    await fillGaps();
    
    // Now start real-time updates
    console.log('\n🔄 Real-time updates started:');
    console.log('  - M1: every 1 minute');
    console.log('  - M5/M15/M60/D/W/Mo: every 5 minutes (top 50)\n');
    
    // M1 every minute
    candleSchedulerTask = cron.schedule('* * * * *', collectLatestM1);
    
    // All other timeframes every 5 minutes
    cron.schedule('*/5 * * * *', collectOtherTimeframes);
  }, 5000);
}

// Stop scheduler
export function stopCandleScheduler(): void {
  candleSchedulerTask?.stop();
  candleSchedulerTask = null;
}

// Get count
export async function getCandleCount(): Promise<number> {
  return await prisma.candle.count();
}

// Export for manual history collection
export { fetchNewCandles, saveCandles };
