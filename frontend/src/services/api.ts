const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export async function fetchCandles(symbol: string, limit: number = 30) {
  const response = await fetch(`${API_BASE_URL}/candles/${symbol}?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch candles: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchLatestPrices() {
  const response = await fetch(`${API_BASE_URL}/latest`);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest prices: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchSymbols() {
  const response = await fetch(`${API_BASE_URL}/symbols`);
  if (!response.ok) {
    throw new Error(`Failed to fetch symbols: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchBalances(token: string) {
  const response = await fetch(`${API_BASE_URL}/balance`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.statusText}`);
  }
  return response.json();
}
