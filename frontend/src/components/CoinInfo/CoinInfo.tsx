import { useState } from 'react';
import { TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { CoinData, COINS } from '../../types';

interface CoinInfoProps {
  coin: CoinData | null;
  isLoading?: boolean;
}

type TabType = '시세' | '정보' | '마켓 인사이트';

export default function CoinInfo({ coin, isLoading }: CoinInfoProps) {
  const [activeTab, setActiveTab] = useState<TabType>('시세');

  if (isLoading || !coin) {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const isRise = coin.changeRate > 0;
  const isFall = coin.changeRate < 0;
  const [pairId, coinId] = coin.symbol.split('-');
  const coinInfo = COINS[coin.symbol];

  // Mock 52주 데이터
  const high52Week = coin.high * 1.5;
  const low52Week = coin.low * 0.5;

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  };

  const formatVolume = (volume: number) => {
    return volume.toLocaleString('ko-KR', { maximumFractionDigits: 3 });
  };

  const formatVolumeKRW = (volume: number) => {
    const millions = volume / 1000000;
    return millions.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Title Bar with Tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {/* Coin Icon */}
          <img
            src={`https://static.upbit.com/logos/${coinId}.png`}
            alt={coinId}
            className="w-7 h-7"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/28';
            }}
          />
          <div className="flex items-center gap-2">
            <strong className="text-lg font-bold text-gray-900">
              {coinInfo?.nameKr || coinId}
            </strong>
            <span className="text-sm text-gray-500">
              {coinId}/{pairId}
            </span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-4">
          {(['시세', '정보', '마켓 인사이트'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm px-2 py-1 transition-colors ${
                activeTab === tab 
                  ? 'text-upbit-header font-bold' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
          <button className="text-gray-400 hover:text-gray-600 ml-2">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Price Info */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-8">
          {/* Current Price & Change */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold tabular-nums ${
                isRise ? 'text-upbit-rise' : isFall ? 'text-upbit-fall' : 'text-gray-900'
              }`}>
                {formatPrice(coin.price)}
              </span>
              <span className="text-sm text-gray-500">KRW</span>
            </div>
            <div className={`flex items-center gap-2 mt-1 ${
              isRise ? 'text-upbit-rise' : isFall ? 'text-upbit-fall' : 'text-gray-500'
            }`}>
              {isRise && <TrendingUp className="w-4 h-4" />}
              {isFall && <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-medium tabular-nums">
                {isRise ? '+' : ''}{coin.changeRate.toFixed(2)}%
              </span>
              <span className="text-sm tabular-nums">
                {isRise ? '▲' : isFall ? '▼' : ''} {formatPrice(Math.abs(coin.changePrice))}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
            {/* 고가/저가 */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">고가</span>
                <span className="text-upbit-rise tabular-nums">{formatPrice(coin.high)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">저가</span>
                <span className="text-upbit-fall tabular-nums">{formatPrice(coin.low)}</span>
              </div>
            </div>

            {/* 52주 최고/최저 */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">52주 최고</span>
                <span className="text-upbit-rise tabular-nums">{formatPrice(high52Week)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">52주 최저</span>
                <span className="text-upbit-fall tabular-nums">{formatPrice(low52Week)}</span>
              </div>
            </div>

            {/* 거래량/거래대금 */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">거래량(24H)</span>
                <span className="text-gray-900 tabular-nums">{formatVolume(coin.volume)} {coinId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">거래대금(24H)</span>
                <span className="text-gray-900 tabular-nums">{formatVolumeKRW(coin.volume * coin.price)} 백만</span>
              </div>
            </div>

            {/* 전일종가 */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">전일종가</span>
                <span className="text-gray-900 tabular-nums">{formatPrice(coin.price - coin.changePrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
