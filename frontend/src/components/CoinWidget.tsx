import { TrendingUp, TrendingDown } from 'lucide-react';
import { CoinSymbol, COIN_INFO } from '../types';

interface CoinWidgetProps {
  symbol: CoinSymbol;
  price: number;
  changeRate: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function CoinWidget({ symbol, price, changeRate, isSelected, onClick }: CoinWidgetProps) {
  const coinInfo = COIN_INFO[symbol];
  const isUp = changeRate >= 0;
  const displaySymbol = symbol.replace('KRW-', '');
  
  // Format price with Korean won
  const formattedPrice = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(price);

  // Format change rate
  const formattedChange = `${isUp ? '+' : ''}${changeRate.toFixed(2)}%`;

  return (
    <button
      onClick={onClick}
      className={`
        bg-upbit-bg-card border rounded-lg p-4 min-w-[220px] text-left
        transition-all duration-200 hover:bg-upbit-bg-secondary
        ${isSelected ? 'border-upbit-up ring-1 ring-upbit-up' : 'border-upbit-border'}
      `}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold
          ${isUp ? 'bg-upbit-up/20 text-upbit-up' : 'bg-upbit-down/20 text-upbit-down'}
        `}>
          {coinInfo.icon}
        </div>
        <div>
          <div className="font-semibold text-upbit-text">{displaySymbol}</div>
          <div className="text-xs text-upbit-text-secondary">{coinInfo.name}</div>
        </div>
      </div>
      
      <div className={`text-2xl font-bold mb-1 ${isUp ? 'text-upbit-up' : 'text-upbit-down'}`}>
        {formattedPrice}
      </div>
      
      <div className={`flex items-center gap-1 text-sm ${isUp ? 'text-upbit-up' : 'text-upbit-down'}`}>
        {isUp ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        <span>{formattedChange}</span>
      </div>
    </button>
  );
}
