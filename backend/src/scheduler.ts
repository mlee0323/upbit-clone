import cron from "node-cron";
import axios from "axios";
import store from "./db.js";
import { setTickers, setMarkets, setOrderbook, TickerData, MarketInfo, OrderbookData } from "./redis.js";

const UPBIT_API_BASE = process.env.UPBIT_API_URL || "https://api.upbit.com/v1";

// KRW markets to track (verified active markets)
const KRW_MARKETS = [
  "KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE",
  "KRW-ADA", "KRW-AVAX", "KRW-DOT", "KRW-LINK", "KRW-SHIB",
];

const FEE_RATE = 0.0005;

let tickerSchedulerTask: cron.ScheduledTask | null = null;
let orderSchedulerTask: cron.ScheduledTask | null = null;
let marketSchedulerTask: cron.ScheduledTask | null = null;

interface UpbitTicker {
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

interface UpbitMarket {
  market: string;
  korean_name: string;
  english_name: string;
}

interface UpbitOrderbook {
  market: string;
  timestamp: number;
  orderbook_units: {
    ask_price: number;
    bid_price: number;
    ask_size: number;
    bid_size: number;
  }[];
}

// Fetch and store ticker data
const fetchAndStoreTickers = async (): Promise<void> => {
  try {
    const markets = KRW_MARKETS.join(",");
    const url = `${UPBIT_API_BASE}/ticker?markets=${markets}`;
    
    const response = await axios.get<UpbitTicker[]>(url);

    const tickerData: TickerData[] = response.data.map((t) => ({
      market: t.market,
      trade_price: t.trade_price,
      signed_change_rate: t.signed_change_rate,
      signed_change_price: t.signed_change_price,
      acc_trade_volume_24h: t.acc_trade_volume_24h,
      acc_trade_price_24h: t.acc_trade_price_24h,
      high_price: t.high_price,
      low_price: t.low_price,
      prev_closing_price: t.prev_closing_price,
      timestamp: t.timestamp,
    }));

    // Save to Redis
    await setTickers(tickerData);

    // Also update in-memory store for backward compatibility
    store.createManyTickerData(
      tickerData.map((t) => ({
        symbol: t.market,
        currentPrice: t.trade_price,
        changeRate: t.signed_change_rate * 100,
        volume: t.acc_trade_volume_24h,
      }))
    );

    console.log(`[${new Date().toISOString()}] Redis: Stored ${tickerData.length} tickers`);
    console.log("testing")
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Failed to fetch tickers:", error.message);
    } else {
      console.error("Error storing tickers:", error);
    }
  }
};

// Fetch and store market list
const fetchAndStoreMarkets = async (): Promise<void> => {
  try {
    const response = await axios.get<UpbitMarket[]>(`${UPBIT_API_BASE}/market/all`);
    
    // Filter KRW markets
    const krwMarkets: MarketInfo[] = response.data
      .filter((m) => m.market.startsWith("KRW-"))
      .map((m) => ({
        market: m.market,
        korean_name: m.korean_name,
        english_name: m.english_name,
      }));

    await setMarkets(krwMarkets);
    console.log(`[${new Date().toISOString()}] Redis: Stored ${krwMarkets.length} markets`);
  } catch (error) {
    console.error("Failed to fetch markets:", error);
  }
};

// Fetch and store orderbook for a market
const fetchAndStoreOrderbook = async (market: string): Promise<void> => {
  try {
    const response = await axios.get<UpbitOrderbook[]>(
      `${UPBIT_API_BASE}/orderbook?markets=${market}`
    );

    if (response.data.length > 0) {
      const ob = response.data[0];
      const orderbookData: OrderbookData = {
        market: ob.market,
        timestamp: ob.timestamp,
        orderbook_units: ob.orderbook_units.slice(0, 15), // Top 15
      };

      await setOrderbook(market, orderbookData);
    }
  } catch (error) {
    // Silent fail for orderbook
  }
};

// Check and execute limit orders when price matches
const checkLimitOrders = async (): Promise<void> => {
  try {
    const openOrders = await store.findOpenOrders();
    const latestTickers = store.getLatestTickers();

    for (const order of openOrders) {
      if (order.ordType !== 'limit' || !order.price) continue;

      const ticker = latestTickers[order.market];
      if (!ticker) continue;

      const currentPrice = ticker.currentPrice;
      let shouldExecute = false;

      if (order.side === 'bid' && currentPrice <= order.price) {
        shouldExecute = true;
      } else if (order.side === 'ask' && currentPrice >= order.price) {
        shouldExecute = true;
      }

      if (shouldExecute) {
        await executeOrder(order.id, order.price);
        console.log(`[${new Date().toISOString()}] Limit order ${order.id} executed at ${order.price}`);
      }
    }
  } catch (error) {
    console.error("Error checking limit orders:", error);
  }
};

// Execute order helper
async function executeOrder(orderId: number, executionPrice: number) {
  const order = await store.findOrderById(orderId);
  if (!order || order.state !== 'wait') return;

  const volume = order.remainingVolume;
  const funds = executionPrice * volume;
  const fee = funds * FEE_RATE;
  const coinCurrency = order.market.split('-')[1];

  if (order.side === 'bid') {
    const krwBalance = (await store.findBalance(order.userId, 'KRW'))!;
    const coinBalance = await store.getOrCreateBalance(order.userId, coinCurrency);

    const totalValue = coinBalance.balance * coinBalance.avgBuyPrice + funds;
    const totalVolume = coinBalance.balance + volume;
    const newAvgPrice = totalVolume > 0 ? totalValue / totalVolume : executionPrice;

    await store.updateBalance(order.userId, 'KRW', {
      balance: krwBalance.balance - funds - fee,
      locked: Math.max(0, krwBalance.locked - funds - fee)
    });

    await store.updateBalance(order.userId, coinCurrency, {
      balance: coinBalance.balance + volume,
      avgBuyPrice: newAvgPrice
    });
  } else {
    const coinBalance = (await store.findBalance(order.userId, coinCurrency))!;
    const krwBalance = await store.getOrCreateBalance(order.userId, 'KRW');

    await store.updateBalance(order.userId, coinCurrency, {
      balance: coinBalance.balance - volume,
      locked: Math.max(0, coinBalance.locked - volume)
    });

    await store.updateBalance(order.userId, 'KRW', {
      balance: krwBalance.balance + funds - fee
    });
  }

  await store.createTrade({
    orderId: order.id,
    userId: order.userId,
    market: order.market,
    side: order.side,
    price: executionPrice,
    volume,
    funds,
    fee
  });

  await store.updateOrder(orderId, {
    remainingVolume: 0,
    state: 'done'
  });
}

export const startScheduler = (): void => {
  console.log("Starting schedulers...");

  // Initial fetch
  fetchAndStoreMarkets();
  fetchAndStoreTickers();

  // Fetch popular orderbooks initially
  KRW_MARKETS.slice(0, 5).forEach((m) => fetchAndStoreOrderbook(m));

  // Ticker: every 3 seconds
  tickerSchedulerTask = cron.schedule("*/3 * * * * *", fetchAndStoreTickers);
  console.log("Ticker scheduler: every 3 seconds");

  // Markets: every 5 minutes
  marketSchedulerTask = cron.schedule("*/5 * * * *", fetchAndStoreMarkets);
  console.log("Market scheduler: every 5 minutes");

  // Order matching: every 2 seconds
  orderSchedulerTask = cron.schedule("*/2 * * * * *", checkLimitOrders);
  console.log("Order scheduler: every 2 seconds");
};

export const stopScheduler = (): void => {
  tickerSchedulerTask?.stop();
  marketSchedulerTask?.stop();
  orderSchedulerTask?.stop();
  tickerSchedulerTask = null;
  marketSchedulerTask = null;
  orderSchedulerTask = null;
  console.log("Schedulers stopped");
};

export { executeOrder };
