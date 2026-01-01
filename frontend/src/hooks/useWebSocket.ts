// Custom hook for WebSocket connection to backend
import { useState, useEffect, useCallback, useRef } from 'react';
import { CoinData } from '../types';

interface MarketInfo {
  market: string;
  korean_name: string;
  english_name: string;
}

interface TickerData {
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

interface OrderbookUnit {
  ask_price: number;
  bid_price: number;
  ask_size: number;
  bid_size: number;
}

interface OrderbookData {
  market: string;
  timestamp: number;
  orderbook_units: OrderbookUnit[];
}

interface WebSocketMessage {
  type: 'ticker' | 'tickers' | 'orderbook';
  data: any;
  market?: string;
}

export function useWebSocket() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [orderbooks, setOrderbooks] = useState<Record<string, { asks: any[]; bids: any[] }>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [marketsMap, setMarketsMap] = useState<Record<string, MarketInfo>>({});
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  
  // Refs to hold latest state/functions for the stable WebSocket handler
  const marketsMapRef = useRef(marketsMap);
  const tickerToCoinRef = useRef<(ticker: TickerData) => CoinData>(() => ({} as any));

  useEffect(() => {
    marketsMapRef.current = marketsMap;
  }, [marketsMap]);

  // Fetch markets list on mount
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/v1/markets');
        if (response.ok) {
          const markets: MarketInfo[] = await response.json();
          const map: Record<string, MarketInfo> = {};
          markets.forEach(m => { map[m.market] = m; });
          setMarketsMap(map);
        }
      } catch (error) {
        console.error('Failed to fetch markets:', error);
      }
    };
    fetchMarkets();
  }, []);

  const tickerToCoin = useCallback((ticker: TickerData): CoinData => {
    const marketInfo = marketsMapRef.current[ticker.market];
    const name = marketInfo?.korean_name || ticker.market.split('-')[1];
    
    return {
      symbol: ticker.market,
      name: marketInfo?.english_name || name,
      nameKr: name,
      price: ticker.trade_price,
      changeRate: ticker.signed_change_rate * 100,
      changePrice: ticker.signed_change_price,
      volume: ticker.acc_trade_price_24h,
      high: ticker.high_price,
      low: ticker.low_price,
    };
  }, []);

  useEffect(() => {
    tickerToCoinRef.current = tickerToCoin;
  }, [tickerToCoin]);

  // Main WebSocket lifecycle
  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type === 'ticker') {
            const ticker = message.data as TickerData;
            const newCoin = tickerToCoinRef.current(ticker);
            setCoins(prev => {
              const idx = prev.findIndex(c => c.symbol === newCoin.symbol);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = newCoin;
                return updated;
              }
              return [...prev, newCoin];
            });
          } else if (message.type === 'tickers') {
            const tickers = message.data as TickerData[];
            setCoins(tickers.map(tickerToCoinRef.current));
          } else if (message.type === 'orderbook') {
            const ob = message.data as OrderbookData;
            const market = message.market || ob.market;
            if (market) {
              setOrderbooks(prev => ({
                ...prev,
                [market]: {
                  asks: ob.orderbook_units.map(u => ({ price: u.ask_price, size: u.ask_size, total: u.ask_price * u.ask_size })),
                  bids: ob.orderbook_units.map(u => ({ price: u.bid_price, size: u.bid_size, total: u.bid_price * u.bid_size }))
                }
              }));
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsConnected(false);
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        if (isMounted) setIsConnected(false);
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Empty dependency array ensures this only runs once

  const subscribeOrderbook = useCallback((market: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe_orderbook', market }));
    }
  }, []);

  return { coins, orderbooks, isConnected, subscribeOrderbook };
}
