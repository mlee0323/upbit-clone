// One-time script to collect 2 years of historical candle data
// Run with: npx tsx src/scripts/collectHistory.ts
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const UPBIT_API_URL = 'https://api.upbit.com/v1';
const REQUEST_DELAY_MS = 200; 

// ... (TIMEFRAMES 등 기존 코드 유지)

async function fetchCandlesSmart(
  market: string,
  endpoint: string,
  interval: string,
  maxCandles: number
): Promise<UpbitCandle[]> {
  const currentCount = await prisma.candle.count({ where: { market, interval } }).catch(() => 0);
  const needed = maxCandles - currentCount;
  
  if (needed <= 0) return [];
  
  const allCandles: UpbitCandle[] = [];
  let toParam = '';
  const batchSize = 200;
  
  while (allCandles.length < needed) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    
    let url = `${UPBIT_API_URL}/candles/${endpoint}?market=${market}&count=${batchSize}`;
    if (toParam) url += `&to=${toParam}`;
    
    try {
      const response = await axios.get<UpbitCandle[]>(url);
      const candles = response.data;
      
      if (candles.length === 0) break;
      
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
