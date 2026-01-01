import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer/Footer';
import { CoinData, COINS } from '../types';
import { TrendingUp, TrendingDown, BarChart3, Info, Zap, Activity, ChevronRight, Clock } from 'lucide-react';

interface TickerResponse {
  market: string;
  trade_price: number;
  signed_change_rate: number;
  signed_change_price: number;
  acc_trade_price_24h: number;
  high_price: number;
  low_price: number;
}

export default function CoinTrends() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTickers();
    const interval = setInterval(fetchTickers, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTickers = async () => {
    try {
      const markets = Object.keys(COINS).join(',');
      const response = await fetch(`/api/v1/ticker?markets=${markets}`);
      if (response.ok) {
        const data: TickerResponse[] = await response.json();
        const mappedCoins: CoinData[] = data.map(t => ({
          symbol: t.market,
          name: COINS[t.market]?.name || t.market,
          nameKr: COINS[t.market]?.nameKr || t.market,
          price: t.trade_price,
          changeRate: t.signed_change_rate * 100,
          changePrice: t.signed_change_price,
          volume: t.acc_trade_price_24h,
          high: t.high_price,
          low: t.low_price,
        }));
        setCoins(mappedCoins);
      }
    } catch (err) {
      console.error('Failed to fetch tickers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const topGainers = useMemo(() => [...coins].sort((a, b) => b.changeRate - a.changeRate).slice(0, 6), [coins]);
  const topLosers = useMemo(() => [...coins].sort((a, b) => a.changeRate - b.changeRate).slice(0, 6), [coins]);
  const topVolume = useMemo(() => [...coins].sort((a, b) => b.volume - a.volume).slice(0, 6), [coins]);

  const formatPrice = (price: number) => {
    if (price >= 100) return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    if (price >= 1) return price.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000000) return `${(volume / 1000000000000).toFixed(1)}조`;
    if (volume >= 100000000) return `${(volume / 100000000).toFixed(0)}억`;
    return `${(volume / 10000).toFixed(0)}만`;
  };

  const FearAndGreedIndex = () => {
    const value = 65; // Mock value
    const getStatus = (v: number) => {
      if (v >= 75) return { label: '매우 탐욕', color: 'text-upbit-rise', bg: 'bg-upbit-rise' };
      if (v >= 55) return { label: '탐욕', color: 'text-orange-500', bg: 'bg-orange-500' };
      if (v >= 45) return { label: '중립', color: 'text-gray-500', bg: 'bg-gray-500' };
      if (v >= 25) return { label: '공포', color: 'text-upbit-fall', bg: 'bg-upbit-fall' };
      return { label: '매우 공포', color: 'text-blue-800', bg: 'bg-blue-800' };
    };
    const status = getStatus(value);

    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            공포-탐욕 지수
          </h3>
          <Info className="w-4 h-4 text-gray-300 cursor-help" />
        </div>
        <div className="flex items-end gap-6">
          <div className="relative w-32 h-16 overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-gray-100" />
            <div 
              className={`absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-transparent border-t-orange-500 border-r-orange-500 transition-all duration-1000`}
              style={{ transform: `rotate(${(value / 100) * 180 - 135}deg)` }}
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl font-black text-gray-900">
              {value}
            </div>
          </div>
          <div className="pb-1">
            <div className={`text-xl font-bold ${status.color}`}>{status.label}</div>
            <div className="text-xs text-gray-400 mt-1">어제보다 +5p 상승</div>
          </div>
        </div>
      </div>
    );
  };

  const MarketSummary = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-upbit-header" />
            시장 요약
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">상승 종목</div>
            <div className="text-lg font-bold text-upbit-rise">124 <span className="text-xs font-normal">개</span></div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">하락 종목</div>
            <div className="text-lg font-bold text-upbit-fall">82 <span className="text-xs font-normal">개</span></div>
          </div>
          <div className="col-span-2 pt-2 border-t border-gray-50">
            <div className="text-xs text-gray-400 mb-1">24시간 거래대금</div>
            <div className="text-lg font-bold text-gray-900">12.4 <span className="text-xs font-normal text-gray-500">조 KRW</span></div>
          </div>
        </div>
      </div>
    );
  };

  const CoinItem = ({ coin, index, showVolume = false }: { coin: CoinData; index: number; showVolume?: boolean }) => {
    const isUp = coin.changeRate >= 0;

    return (
      <Link
        to={`/exchange?code=CRIX.UPBIT.${coin.symbol}`}
        className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-sm transition-colors group"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-300 w-4">{index + 1}</span>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400">
              {coin.symbol.split('-')[1][0]}
            </div>
            <div>
              <div className="text-[13px] font-bold text-gray-900 group-hover:text-upbit-header">{coin.nameKr}</div>
              <div className="text-[11px] text-gray-400">{coin.symbol.split('-')[1]}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[13px] font-bold tabular-nums ${isUp ? 'text-upbit-rise' : coin.changeRate < 0 ? 'text-upbit-fall' : 'text-gray-900'}`}>
            {showVolume ? formatVolume(coin.volume) : formatPrice(coin.price)}
          </div>
          <div className={`text-[11px] tabular-nums ${isUp ? 'text-upbit-rise' : coin.changeRate < 0 ? 'text-upbit-fall' : 'text-gray-400'}`}>
            {isUp ? '+' : ''}{coin.changeRate.toFixed(2)}%
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />

      <main className="max-w-[1400px] mx-auto px-5 pt-[80px] pb-20">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">코인동향</h1>
          <div className="text-sm text-gray-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            2025.12.30 11:58 기준
          </div>
        </div>

        {/* Top Indicators */}
        <div className="flex gap-6 mb-8">
          <FearAndGreedIndex />
          <MarketSummary />
          <div className="bg-upbit-header rounded-sm p-6 flex-1 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                오늘의 급등 코인
              </h3>
              <div className="text-3xl font-black mb-1">{topGainers[0]?.nameKr || '-'}</div>
              <div className="text-lg font-bold text-blue-200">+{topGainers[0]?.changeRate.toFixed(2) || '0.00'}%</div>
              <Link 
                to={`/exchange?code=CRIX.UPBIT.${topGainers[0]?.symbol}`}
                className="mt-6 inline-flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
              >
                지금 확인하기 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
          </div>
        </div>

        {isLoading ? (
          <div className="py-40 text-center">
            <div className="inline-block w-8 h-8 border-4 border-upbit-header border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-gray-400">데이터를 불러오는 중입니다...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Gainers */}
            <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-upbit-rise" />
                  상승률 TOP
                </h2>
                <Link to="/exchange" className="text-[11px] text-gray-400 hover:text-gray-600">더보기</Link>
              </div>
              <div className="p-2 divide-y divide-gray-50">
                {topGainers.map((coin, i) => (
                  <CoinItem key={coin.symbol} coin={coin} index={i} />
                ))}
              </div>
            </div>

            {/* Top Losers */}
            <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-upbit-fall" />
                  하락률 TOP
                </h2>
                <Link to="/exchange" className="text-[11px] text-gray-400 hover:text-gray-600">더보기</Link>
              </div>
              <div className="p-2 divide-y divide-gray-50">
                {topLosers.map((coin, i) => (
                  <CoinItem key={coin.symbol} coin={coin} index={i} />
                ))}
              </div>
            </div>

            {/* Top Volume */}
            <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  거래대금 TOP
                </h2>
                <Link to="/exchange" className="text-[11px] text-gray-400 hover:text-gray-600">더보기</Link>
              </div>
              <div className="p-2 divide-y divide-gray-50">
                {topVolume.map((coin, i) => (
                  <CoinItem key={coin.symbol} coin={coin} index={i} showVolume />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

