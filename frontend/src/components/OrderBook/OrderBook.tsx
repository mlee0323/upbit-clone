import { useState, useMemo, useEffect, useRef } from 'react';
import { OrderBookEntry, Trade, CoinData } from '../../types';

interface OrderBookProps {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  trades: Trade[];
  currentPrice: number;
  coin: CoinData | null;
  isLoading?: boolean;
}

type TabType = 'orderbook' | 'trades';

export default function OrderBook({ asks, bids, trades, currentPrice, coin, isLoading }: OrderBookProps) {
  const [activeTab, setActiveTab] = useState<TabType>('orderbook');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  // Scroll to center on mount or coin change
  useEffect(() => {
    if (activeTab === 'orderbook' && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      
      // Only scroll automatically on initial load or when coin changes
      if (!initialScrollDone.current && asks.length > 0 && bids.length > 0) {
        // Use requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (container) {
              // Find the boundary: it's the height of the asks container
              const asksContainer = container.children[0] as HTMLElement;
              if (asksContainer) {
                const asksHeight = asksContainer.offsetHeight;
                const scrollPos = asksHeight - (container.clientHeight / 2);
                container.scrollTo({ top: scrollPos, behavior: 'auto' });
                initialScrollDone.current = true;
              }
            }
          }, 100); // Slightly longer delay to be safe
        });
      }
    }
  }, [activeTab, coin?.symbol, asks.length, bids.length]);

  // Reset initial scroll flag when coin changes
  useEffect(() => {
    initialScrollDone.current = false;
  }, [coin?.symbol]);

  const maxSize = useMemo(() => {
    const askMax = Math.max(...asks.map((a) => a.size), 0);
    const bidMax = Math.max(...bids.map((b) => b.size), 0);
    return Math.max(askMax, bidMax);
  }, [asks, bids]);

  const formatPrice = (price: number) => {
    if (price >= 100) return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    if (price >= 1) return price.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
  };

  const formatSize = (size: number) => {
    if (size >= 100) return size.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    if (size >= 1) return size.toLocaleString('ko-KR', { maximumFractionDigits: 3 });
    return size.toLocaleString('ko-KR', { maximumFractionDigits: 6 });
  };

  const getChangeRate = (price: number) => {
    if (!coin) return 0;
    const prevClose = coin.price - coin.changePrice;
    if (!prevClose) return 0;
    return ((price - prevClose) / prevClose) * 100;
  };

  const coinId = coin?.symbol.split('-')[1] || '';

  if (isLoading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-upbit-header border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200">
      {/* Tabs */}
      <div className="flex bg-gray-50 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('orderbook')}
          className={`flex-1 py-3 text-[13px] font-bold transition-colors ${
            activeTab === 'orderbook' ? 'bg-white text-upbit-header border-b-2 border-upbit-header' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          호가
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`flex-1 py-3 text-[13px] font-bold transition-colors ${
            activeTab === 'trades' ? 'bg-white text-upbit-header border-b-2 border-upbit-header' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          체결
        </button>
      </div>

      {activeTab === 'orderbook' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Table Header */}
          <div className="flex text-[11px] text-gray-400 border-b border-gray-100 bg-white">
            <div className="w-[35%] px-2 py-1.5 text-left">수량</div>
            <div className="w-[30%] px-2 py-1.5 text-center">주문가</div>
            <div className="w-[35%] px-2 py-1.5 text-right">수량</div>
          </div>

          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto scrollbar-hide relative"
          >
            {/* Asks (Sell) */}
            <div className="flex flex-col-reverse">
              {asks.slice(0, 15).map((ask, i) => {
                const sizePercent = (ask.size / maxSize) * 100;
                const changeRate = getChangeRate(ask.price);
                const isCurrent = Math.abs(ask.price - currentPrice) < 0.000001;

                return (
                  <div
                    key={`ask-${i}`}
                    className={`flex items-center text-[12px] h-[45px] border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                      isCurrent ? 'ring-1 ring-inset ring-upbit-header z-10' : ''
                    }`}
                  >
                    {/* Ask Quantity (Left) */}
                    <div className="w-[35%] h-full relative bg-[#f1f4f9]/30">
                      <div 
                        className="absolute right-0 top-[10%] bottom-[10%] bg-[#cfd8dc]/40 transition-all duration-300"
                        style={{ width: `${sizePercent}%` }}
                      />
                      <div className="relative h-full flex items-center px-2 tabular-nums text-gray-600 font-medium">
                        {formatSize(ask.size)}
                      </div>
                    </div>

                    {/* Price (Center) */}
                    <div className={`w-[30%] h-full flex flex-col items-center justify-center border-x border-gray-50 bg-[#f1f4f9]/50 ${
                      changeRate > 0 ? 'text-upbit-rise' : changeRate < 0 ? 'text-upbit-fall' : 'text-gray-900'
                    }`}>
                      <div className="font-bold tabular-nums">{formatPrice(ask.price)}</div>
                      <div className="text-[10px] opacity-80">{changeRate > 0 ? '+' : ''}{changeRate.toFixed(2)}%</div>
                    </div>

                    {/* Empty Right side for Asks */}
                    <div className="w-[35%] h-full bg-white" />
                  </div>
                );
              })}
            </div>

            {/* Boundary / Center Point */}
            <div ref={centerRef} className="h-0" />

            {/* Bids (Buy) */}
            <div className="flex flex-col">
              {bids.slice(0, 15).map((bid, i) => {
                const sizePercent = (bid.size / maxSize) * 100;
                const changeRate = getChangeRate(bid.price);
                const isCurrent = Math.abs(bid.price - currentPrice) < 0.000001;

                return (
                  <div
                    key={`bid-${i}`}
                    className={`flex items-center text-[12px] h-[45px] border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                      isCurrent ? 'ring-1 ring-inset ring-upbit-header z-10' : ''
                    }`}
                  >
                    {/* Empty Left side for Bids */}
                    <div className="w-[35%] h-full bg-white" />

                    {/* Price (Center) */}
                    <div className={`w-[30%] h-full flex flex-col items-center justify-center border-x border-gray-50 bg-[#fdf2f2]/50 ${
                      changeRate > 0 ? 'text-upbit-rise' : changeRate < 0 ? 'text-upbit-fall' : 'text-gray-900'
                    }`}>
                      <div className="font-bold tabular-nums">{formatPrice(bid.price)}</div>
                      <div className="text-[10px] opacity-80">{changeRate > 0 ? '+' : ''}{changeRate.toFixed(2)}%</div>
                    </div>

                    {/* Bid Quantity (Right) */}
                    <div className="w-[35%] h-full relative bg-[#fdf2f2]/30">
                      <div 
                        className="absolute left-0 top-[10%] bottom-[10%] bg-[#f8d7da]/40 transition-all duration-300"
                        style={{ width: `${sizePercent}%` }}
                      />
                      <div className="relative h-full flex items-center justify-end px-2 tabular-nums text-gray-600 font-medium">
                        {formatSize(bid.size)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Footer */}
          <div className="flex text-[11px] font-bold border-t border-gray-200 bg-gray-50">
            <div className="w-[35%] px-2 py-2 text-gray-500">
              수량합계: {formatSize(asks.reduce((acc, cur) => acc + cur.size, 0))}
            </div>
            <div className="w-[30%] px-2 py-2 text-center text-gray-400">
              {coinId}/KRW
            </div>
            <div className="w-[35%] px-2 py-2 text-right text-gray-500">
              수량합계: {formatSize(bids.reduce((acc, cur) => acc + cur.size, 0))}
            </div>
          </div>
        </div>
      ) : (
        /* Trades Tab */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex text-[11px] text-gray-400 border-b border-gray-100 bg-gray-50">
            <div className="w-1/3 px-2 py-2">체결시간</div>
            <div className="w-1/3 px-2 py-2 text-right">체결가</div>
            <div className="w-1/3 px-2 py-2 text-right">체결량</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center text-[11px] py-2 border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <div className="w-1/3 px-2 text-gray-400">
                  {new Date(trade.time).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  })}
                </div>
                <div className={`w-1/3 px-2 text-right font-bold tabular-nums ${
                  trade.side === 'buy' ? 'text-upbit-rise' : 'text-upbit-fall'
                }`}>
                  {formatPrice(trade.price)}
                </div>
                <div className="w-1/3 px-2 text-right text-gray-600 tabular-nums">
                  {formatSize(trade.size)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
