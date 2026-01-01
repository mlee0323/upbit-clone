import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import CoinWidget from '../components/CoinWidget';
import PriceChart from '../components/PriceChart';
import { CoinWidgetSkeleton, ChartSkeleton } from '../components/SkeletonLoader';
import { fetchCandles, fetchLatestPrices } from '../services/api';
import { CoinSymbol, TickerData, LatestPrices } from '../types';

const SYMBOLS: CoinSymbol[] = ['KRW-BTC', 'KRW-ETH', 'KRW-XRP'];
const POLLING_INTERVAL = 1000; // 1 second

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<CoinSymbol>('KRW-BTC');
  const [latestPrices, setLatestPrices] = useState<LatestPrices>({});
  const [chartData, setChartData] = useState<TickerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch latest prices for all coins
  const fetchPrices = useCallback(async () => {
    try {
      const data = await fetchLatestPrices();
      setLatestPrices(data);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching prices:', err);
      setError('서버와 연결할 수 없습니다. 백엔드 서버 상태를 확인해주세요.');
    }
  }, []);

  // Fetch chart data for selected symbol
  const fetchChartData = useCallback(async () => {
    try {
      const data = await fetchCandles(selectedSymbol);
      setChartData(data);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('차트 데이터를 불러올 수 없습니다.');
      setIsLoading(false);
    }
  }, [selectedSymbol]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchPrices();
    fetchChartData();
  }, [fetchPrices, fetchChartData]);

  // Polling interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices();
      fetchChartData();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchPrices, fetchChartData]);

  // Handle symbol change
  const handleSymbolChange = (symbol: CoinSymbol) => {
    setSelectedSymbol(symbol);
    setIsLoading(true);
    setChartData([]);
  };

  return (
    <div className="min-h-screen bg-upbit-bg">
      {/* Header */}
      <header className="bg-upbit-bg-secondary border-b border-upbit-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-upbit-up rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">U</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-upbit-text">Upbit Clone</h1>
              <p className="text-xs text-upbit-text-secondary">실시간 코인 시세</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-upbit-text-secondary">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-upbit-up/20 border-b border-upbit-up px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-upbit-up" />
            <span className="text-upbit-up">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Coin Widgets */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-upbit-text mb-4">주요 코인</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {isLoading && Object.keys(latestPrices).length === 0 ? (
              <>
                <CoinWidgetSkeleton />
                <CoinWidgetSkeleton />
                <CoinWidgetSkeleton />
              </>
            ) : (
              SYMBOLS.map((symbol) => {
                const priceData = latestPrices[symbol];
                return (
                  <CoinWidget
                    key={symbol}
                    symbol={symbol}
                    price={priceData?.current_price || 0}
                    changeRate={priceData?.change_rate || 0}
                    isSelected={selectedSymbol === symbol}
                    onClick={() => handleSymbolChange(symbol)}
                  />
                );
              })
            )}
          </div>
        </section>

        {/* Price Chart */}
        <section>
          <h2 className="text-lg font-semibold text-upbit-text mb-4">실시간 가격 차트</h2>
          {isLoading && chartData.length === 0 ? (
            <ChartSkeleton />
          ) : (
            <PriceChart
              symbol={selectedSymbol}
              data={chartData}
              isLoading={isLoading}
              error={error}
            />
          )}
        </section>

        {/* Footer Info */}
        <footer className="mt-8 text-center text-sm text-upbit-text-secondary">
          <p>데이터 출처: Upbit Open API | 1초마다 자동 갱신</p>
          <p className="mt-1">본 서비스는 교육 목적의 클론 프로젝트입니다.</p>
        </footer>
      </main>
    </div>
  );
}
