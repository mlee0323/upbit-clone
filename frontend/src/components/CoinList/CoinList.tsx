import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Star, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { CoinData } from '../../types';

interface CoinListProps {
  coins: CoinData[];
  selectedSymbol: string;
  onSelectCoin: (symbol: string) => void;
  isLoading?: boolean;
}

type SortField = 'name' | 'price' | 'change' | 'volume';
type SortDirection = 'asc' | 'desc';
type TabType = 'KRW' | 'BTC' | 'USDT' | 'hold' | 'interest';

export default function CoinList({ coins, selectedSymbol, onSelectCoin, isLoading }: CoinListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('KRW');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showKorean, setShowKorean] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('upeth_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  // Track price changes for highlight effect
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down' | null>>({});
  const prevPricesRef = useRef<Record<string, number>>({});

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('upeth_favorites', JSON.stringify([...favorites]));
  }, [favorites]);
  
  // Detect price changes and trigger flash effect
  useEffect(() => {
    const newFlashes: Record<string, 'up' | 'down' | null> = {};
    
    coins.forEach(coin => {
      const prevPrice = prevPricesRef.current[coin.symbol];
      if (prevPrice !== undefined && prevPrice !== coin.price) {
        newFlashes[coin.symbol] = coin.price > prevPrice ? 'up' : 'down';
      }
      prevPricesRef.current[coin.symbol] = coin.price;
    });
    
    if (Object.keys(newFlashes).length > 0) {
      setPriceFlash(prev => ({ ...prev, ...newFlashes }));
      
      // Clear flash after animation
      setTimeout(() => {
        setPriceFlash(prev => {
          const updated = { ...prev };
          Object.keys(newFlashes).forEach(key => {
            updated[key] = null;
          });
          return updated;
        });
      }, 100);
    }
  }, [coins]);

  const tabs = [
    { type: 'KRW' as TabType, label: '원화' },
    { type: 'BTC' as TabType, label: 'BTC' },
    { type: 'USDT' as TabType, label: 'USDT' },
    { type: 'hold' as TabType, label: '보유' },
    { type: 'interest' as TabType, label: '관심' },
  ];

  const filteredAndSortedCoins = useMemo(() => {
    let filtered = coins.filter((coin) => {
      // Search filter
      const matchesSearch = 
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.nameKr.includes(searchQuery) ||
        coin.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === 'interest') {
        return favorites.has(coin.symbol);
      }
      if (activeTab === 'hold') {
        return false; // No holdings in demo
      }
      if (activeTab === 'KRW') {
        return coin.symbol.startsWith('KRW-');
      }
      if (activeTab === 'BTC') {
        return coin.symbol.startsWith('BTC-');
      }
      if (activeTab === 'USDT') {
        return coin.symbol.startsWith('USDT-');
      }
      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.nameKr.localeCompare(b.nameKr);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'change':
          comparison = a.changeRate - b.changeRate;
          break;
        case 'volume':
          comparison = a.volume - b.volume;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [coins, searchQuery, activeTab, sortField, sortDirection, favorites]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const toggleFavorite = useCallback((e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    }
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
  };

  const formatVolume = (volume: number) => {
    const millions = volume / 1000000;
    return millions.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 opacity-30">↕</span>;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-3 h-3 ml-0.5 inline" /> : 
      <ChevronDown className="w-3 h-3 ml-0.5 inline" />;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 px-3 bg-gray-100 border border-gray-200 rounded text-sm focus:outline-none focus:border-upbit-header focus:ring-1 focus:ring-upbit-header"
          />
        </div>
      </div>

      {/* Tab Header */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === tab.type
                ? 'text-upbit-header border-b-2 border-upbit-header'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub Header - Column headers */}
      <table className="w-full border-b border-gray-200 bg-gray-50">
        <colgroup>
          <col width="26" />
          <col width="26" />
          <col width="*" />
          <col width="88" />
          <col width="68" />
          <col width="78" />
        </colgroup>
        <thead>
          <tr className="text-[11px] text-gray-500">
            <th colSpan={3} className="py-2 text-left pl-2">
              <button 
                onClick={() => setShowKorean(!showKorean)}
                className="hover:text-gray-700 flex items-center gap-1"
              >
                {showKorean ? '한글명' : '영문명'}
                <RefreshCw className="w-3 h-3" />
              </button>
            </th>
            <th className="py-2 text-right pr-2">
              <button 
                onClick={() => handleSort('price')}
                className="hover:text-gray-700"
              >
                현재가<SortIcon field="price" />
              </button>
            </th>
            <th className="py-2 text-right pr-2">
              <button 
                onClick={() => handleSort('change')}
                className="hover:text-gray-700"
              >
                전일대비<SortIcon field="change" />
              </button>
            </th>
            <th className="py-2 text-right pr-3">
              <button 
                onClick={() => handleSort('volume')}
                className="hover:text-gray-700"
              >
                거래대금<SortIcon field="volume" />
              </button>
            </th>
          </tr>
        </thead>
      </table>

      {/* Coin List - Fill remaining height with scroll */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            로딩 중...
          </div>
        ) : filteredAndSortedCoins.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            {activeTab === 'hold' ? '보유한 코인이 없습니다' : 
             activeTab === 'interest' ? '관심 코인이 없습니다' : 
             '검색 결과가 없습니다'}
          </div>
        ) : (
          filteredAndSortedCoins.map((coin) => {
            const isSelected = coin.symbol === selectedSymbol;
            const isRise = coin.changeRate > 0;
            const isFall = coin.changeRate < 0;
            const [_, coinId] = coin.symbol.split('-');

            return (
              <table
                key={coin.symbol}
                onClick={() => onSelectCoin(coin.symbol)}
                className={`w-full cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                <colgroup>
                  <col width="26" />
                  <col width="26" />
                  <col width="*" />
                  <col width="88" />
                  <col width="68" />
                  <col width="78" />
                </colgroup>
                <tbody>
                  <tr>
                    {/* Favorite */}
                    <td className="py-2 pl-2">
                      <button
                        onClick={(e) => toggleFavorite(e, coin.symbol)}
                        className="p-1"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            favorites.has(coin.symbol)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300 hover:text-yellow-400'
                          }`}
                        />
                      </button>
                    </td>
                    {/* Mini Candle - placeholder */}
                    <td>
                      <div className="w-3 h-4 flex flex-col items-center justify-center">
                        <div className={`w-0.5 h-1 ${isRise ? 'bg-upbit-rise' : isFall ? 'bg-upbit-fall' : 'bg-gray-400'}`} />
                        <div className={`w-2 h-2 ${isRise ? 'bg-upbit-rise' : isFall ? 'bg-upbit-fall' : 'bg-gray-400'}`} />
                        <div className={`w-0.5 h-1 ${isRise ? 'bg-upbit-rise' : isFall ? 'bg-upbit-fall' : 'bg-gray-400'}`} />
                      </div>
                    </td>
                    {/* Coin Name */}
                    <td className="py-2">
                      <div className="font-medium text-[12px] text-gray-900">
                        {showKorean ? coin.nameKr : coin.name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {coinId}<span className="text-gray-300">/{activeTab === 'KRW' ? 'KRW' : activeTab}</span>
                      </div>
                    </td>
                    {/* Price with flash effect */}
                    <td className={`text-right pr-2 text-[12px] font-medium tabular-nums ${
                      isRise ? 'text-upbit-rise' : isFall ? 'text-upbit-fall' : 'text-gray-900'
                    }`}>
                      <span className={`inline-flex items-center justify-end w-[75px] h-full py-2 transition-all duration-100 ${
                        priceFlash[coin.symbol] === 'up' 
                          ? 'border-2 border-upbit-rise' 
                          : priceFlash[coin.symbol] === 'down'
                            ? 'border-2 border-upbit-fall'
                            : 'border-2 border-transparent'
                      }`}>
                        {formatPrice(coin.price)}
                      </span>
                    </td>
                    {/* Change */}
                    <td className={`py-2 text-right pr-2 text-[11px] tabular-nums ${
                      isRise ? 'text-upbit-rise' : isFall ? 'text-upbit-fall' : 'text-gray-500'
                    }`}>
                      <div>{isRise ? '+' : ''}{coin.changeRate.toFixed(2)}%</div>
                      <div className="text-[10px]">{formatPrice(Math.abs(coin.changePrice))}</div>
                    </td>
                    {/* Volume */}
                    <td className="py-2 text-right pr-3 text-[11px] text-gray-600 tabular-nums">
                      {formatVolume(coin.volume)}
                      <span className="text-[10px] text-gray-400 ml-0.5">백만</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          })
        )}
      </div>
    </div>
  );
}
