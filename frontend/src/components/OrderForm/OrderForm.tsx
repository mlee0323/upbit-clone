import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoinData } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface OrderFormProps {
  coin: CoinData | null;
  onOrderSuccess?: () => void;
}

interface Balance {
  currency: string;
  balance: string;
  locked: string;
  available: string;
}

type TabType = 'buy' | 'sell';
type OrderType = 'limit' | 'market';

export default function OrderForm({ coin, onOrderSuccess }: OrderFormProps) {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [total, setTotal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balances, setBalances] = useState<Balance[]>([]);

  const coinId = coin?.symbol.split('-')[1] || '';
  const krwBalance = balances.find(b => b.currency === 'KRW');
  const coinBalance = balances.find(b => b.currency === coinId);

  // Fetch balances
  useEffect(() => {
    if (isLoggedIn) {
      fetchBalances();
    }
  }, [isLoggedIn]);

  const fetchBalances = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBalances(data);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    if (value && quantity) {
      setTotal((parseFloat(value) * parseFloat(quantity)).toString());
    }
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    if (price && value) {
      setTotal((parseFloat(price) * parseFloat(value)).toString());
    } else if (orderType === 'market' && coin && value) {
      setTotal((coin.price * parseFloat(value)).toString());
    }
  };

  const handleTotalChange = (value: string) => {
    setTotal(value);
    const priceToUse = orderType === 'market' ? coin?.price : parseFloat(price);
    if (priceToUse && value) {
      setQuantity((parseFloat(value) / priceToUse).toString());
    }
  };

  const handlePercentage = (percent: number) => {
    const availableKRW = parseFloat(krwBalance?.available || '0');
    const availableCoin = parseFloat(coinBalance?.available || '0');
    const priceToUse = orderType === 'market' ? coin?.price : parseFloat(price);
    
    if (activeTab === 'buy' && priceToUse) {
      const maxQuantity = availableKRW / priceToUse;
      const qty = maxQuantity * (percent / 100);
      setQuantity(qty.toFixed(8));
      setTotal((qty * priceToUse).toFixed(0));
    } else if (activeTab === 'sell') {
      const qty = availableCoin * (percent / 100);
      setQuantity(qty.toFixed(8));
      if (priceToUse) {
        setTotal((qty * priceToUse).toFixed(0));
      }
    }
  };

  const handleSubmit = async () => {
    if (!coin || !quantity) return;
    
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const orderData = {
        market: coin.symbol,
        side: activeTab === 'buy' ? 'bid' : 'ask',
        ord_type: orderType,
        volume: quantity,
        price: orderType === 'limit' ? price : undefined
      };

      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '주문에 실패했습니다');
      }

      setSuccess(orderType === 'market' ? '주문이 체결되었습니다!' : '주문이 등록되었습니다!');
      setQuantity('');
      setTotal('');
      if (orderType === 'limit') setPrice('');
      
      // Refresh balances
      fetchBalances();
      onOrderSuccess?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  if (!coin) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <span className="text-gray-400">코인을 선택해주세요</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Buy/Sell Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            activeTab === 'buy'
              ? 'text-upbit-rise border-b-2 border-upbit-rise bg-red-50'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          매수
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            activeTab === 'sell'
              ? 'text-upbit-fall border-b-2 border-upbit-fall bg-blue-50'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          매도
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Order Type */}
        <div className="flex gap-2 mb-4">
          {[
            { type: 'limit' as OrderType, label: '지정가' },
            { type: 'market' as OrderType, label: '시장가' },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                orderType === type
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-green-600 text-xs">
            {success}
          </div>
        )}

        {/* Available Balance */}
        <div className="flex justify-between text-sm mb-4">
          <span className="text-gray-500">
            {activeTab === 'buy' ? '주문가능' : '보유'}
          </span>
          <span className="text-gray-900 tabular-nums">
            {activeTab === 'buy' 
              ? `${parseFloat(krwBalance?.available || '0').toLocaleString()} KRW`
              : `${parseFloat(coinBalance?.available || '0').toFixed(8)} ${coinId}`
            }
          </span>
        </div>

        {/* Price Input (for limit orders) */}
        {orderType === 'limit' && (
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">주문가격 (KRW)</label>
            <div className="relative group">
              <input
                type="text"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value.replace(/,/g, ''))}
                placeholder={coin.price.toLocaleString('ko-KR')}
                className="w-full h-11 pl-3 pr-16 border border-gray-200 rounded text-right text-[15px] tabular-nums focus:outline-none focus:border-upbit-header focus:ring-1 focus:ring-upbit-header transition-all bg-gray-50 focus:bg-white"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  onClick={() => handlePriceChange(coin.price.toString())}
                  className="text-[11px] font-bold text-upbit-header bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
                >
                  현재가
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Market Price Info */}
        {orderType === 'market' && (
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <span className="text-xs text-gray-500">현재 시장가: </span>
            <span className="text-sm font-medium">{coin.price.toLocaleString()} KRW</span>
          </div>
        )}

        {/* Quantity Input */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">주문수량 ({coinId})</label>
          <input
            type="text"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder="0"
            className="w-full h-11 px-3 border border-gray-200 rounded text-right text-[15px] tabular-nums focus:outline-none focus:border-upbit-header focus:ring-1 focus:ring-upbit-header transition-all bg-gray-50 focus:bg-white"
          />
        </div>

        {/* Percentage Buttons */}
        <div className="flex gap-2 mb-3">
          {[10, 25, 50, 100].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentage(percent)}
              className="flex-1 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* Total Input */}
        <div className="mb-6">
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">주문총액 (KRW)</label>
          <input
            type="text"
            value={total}
            onChange={(e) => handleTotalChange(e.target.value.replace(/,/g, ''))}
            placeholder="0"
            className="w-full h-11 px-3 border border-gray-200 rounded text-right text-[15px] tabular-nums font-bold focus:outline-none focus:border-upbit-header focus:ring-1 focus:ring-upbit-header transition-all bg-gray-50 focus:bg-white"
          />
        </div>

        {/* Submit Button */}
        {isLoggedIn ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !quantity || (orderType === 'limit' && !price)}
            className={`w-full py-3 rounded font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'buy'
                ? 'bg-upbit-rise hover:bg-red-600'
                : 'bg-upbit-fall hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? '처리 중...' : activeTab === 'buy' ? '매수' : '매도'}
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded font-bold text-white bg-gray-400 hover:bg-gray-500 transition-colors"
          >
            로그인 후 이용 가능
          </button>
        )}

        {/* Min Order Notice */}
        <p className="text-center text-xs text-gray-400 mt-3">
          최소주문금액: 5,000 KRW
        </p>
      </div>
    </div>
  );
}
