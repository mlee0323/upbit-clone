export interface TickerData {
  time: string;
  symbol: string;
  current_price: number;
  change_rate: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface CoinData {
  symbol: string;
  name: string;
  nameKr: string;
  price: number;
  changeRate: number;
  changePrice: number;
  volume: number;
  high: number;
  low: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface Trade {
  id: string;
  time: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type MarketType = 'KRW' | 'BTC' | 'USDT';
export type OrderType = 'limit' | 'market' | 'stop-limit';
export type OrderSide = 'buy' | 'sell';

export const COINS: Record<string, { name: string; nameKr: string; icon: string }> = {
  'KRW-BTC': { name: 'Bitcoin', nameKr: '비트코인', icon: '₿' },
  'KRW-ETH': { name: 'Ethereum', nameKr: '이더리움', icon: 'Ξ' },
  'KRW-XRP': { name: 'Ripple', nameKr: '리플', icon: '✕' },
  'KRW-SOL': { name: 'Solana', nameKr: '솔라나', icon: 'S' },
  'KRW-DOGE': { name: 'Dogecoin', nameKr: '도지코인', icon: 'Ð' },
  'KRW-ADA': { name: 'Cardano', nameKr: '에이다', icon: 'A' },
  'KRW-AVAX': { name: 'Avalanche', nameKr: '아발란체', icon: 'A' },
  'KRW-DOT': { name: 'Polkadot', nameKr: '폴카닷', icon: '●' },
  'KRW-LINK': { name: 'Chainlink', nameKr: '체인링크', icon: 'L' },
  'KRW-SHIB': { name: 'Shiba Inu', nameKr: '시바이누', icon: 'S' },
};
export type CoinSymbol = string;

export interface LatestPrices {
  [symbol: string]: TickerData;
}

export const COIN_INFO = COINS;
