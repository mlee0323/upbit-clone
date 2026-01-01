import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, RefreshCcw, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

interface Balance {
  currency: string;
  balance: string;
  avg_buy_price: string;
  available: string;
}

interface Ticker {
  market: string;
  trade_price: number;
  signed_change_rate: number;
}

interface Order {
  id: number;
  market: string;
  side: 'bid' | 'ask';
  ord_type: string;
  price: string | null;
  volume: string;
  remaining_volume: string;
  state: string;
  created_at: string;
}

interface Trade {
  id: number;
  market: string;
  side: 'bid' | 'ask';
  price: string;
  volume: string;
  funds: string;
  fee: string;
  created_at: string;
}

export default function Investments() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [allBalances, setAllBalances] = useState<Balance[]>([]);
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<'holdings' | 'trades' | 'orders'>('holdings');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    fetchData();
    const interval = setInterval(fetchTickers, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn, navigate]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const [balanceRes, ordersRes, tradesRes] = await Promise.all([
        fetch('/api/v1/balance', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/trades', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setAllBalances(data);
        // Fetch tickers for these balances
        const markets = data
          .filter((b: Balance) => b.currency !== 'KRW')
          .map((b: Balance) => `KRW-${b.currency}`)
          .join(',');
        if (markets) {
          fetchTickers(markets);
        }
      }
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (tradesRes.ok) setTrades(await tradesRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const fetchTickers = async (marketList?: string) => {
    try {
      const markets = marketList || allBalances
        .filter((b: Balance) => b.currency !== 'KRW')
        .map((b: Balance) => `KRW-${b.currency}`)
        .join(',');
      
      if (!markets) return;

      const response = await fetch(`/api/v1/ticker?markets=${markets}`);
      if (response.ok) {
        const data: Ticker[] = await response.json();
        const tickerMap: Record<string, Ticker> = {};
        data.forEach(t => {
          tickerMap[t.market] = t;
        });
        setTickers(prev => ({ ...prev, ...tickerMap }));
      }
    } catch (err) {
      console.error('Failed to fetch tickers:', err);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm('정말로 이 주문을 취소하시겠습니까?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/v1/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        alert('주문이 취소되었습니다.');
        fetchData();
      } else {
        const data = await response.json();
        alert(data.detail || '주문 취소에 실패했습니다.');
      }
    } catch (err) {
      console.error('Failed to cancel order:', err);
      alert('주문 취소 중 오류가 발생했습니다.');
    }
  };

  const krwBalance = useMemo(() => {
    return parseFloat(allBalances.find(b => b.currency === 'KRW')?.balance || '0');
  }, [allBalances]);

  const coinHoldings = useMemo(() => {
    return allBalances.filter(b => b.currency !== 'KRW' && parseFloat(b.balance) > 0);
  }, [allBalances]);

  const stats = useMemo(() => {
    let totalPurchase = 0;
    let totalEvaluation = 0;

    coinHoldings.forEach(b => {
      const balance = parseFloat(b.balance);
      const avgPrice = parseFloat(b.avg_buy_price);
      const currentPrice = tickers[`KRW-${b.currency}`]?.trade_price || avgPrice;

      totalPurchase += balance * avgPrice;
      totalEvaluation += balance * currentPrice;
    });

    const totalAssets = krwBalance + totalEvaluation;
    const totalPL = totalEvaluation - totalPurchase;
    const totalReturn = totalPurchase > 0 ? (totalPL / totalPurchase) * 100 : 0;

    return {
      krwBalance,
      totalAssets,
      totalPurchase,
      totalEvaluation,
      totalPL,
      totalReturn
    };
  }, [allBalances, tickers, krwBalance, coinHoldings]);

  // Donut Chart Data
  const chartData = useMemo(() => {
    const data = coinHoldings.map(b => {
      const value = parseFloat(b.balance) * (tickers[`KRW-${b.currency}`]?.trade_price || parseFloat(b.avg_buy_price));
      return { name: b.currency, value };
    });
    data.push({ name: 'KRW', value: krwBalance });
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .map(item => ({ ...item, percent: (item.value / total) * 100 }));
  }, [coinHoldings, tickers, krwBalance]);

  const colors = ['#88B04B', '#3498DB', '#9B59B6', '#F1C40F', '#E67E22', '#E74C3C', '#95A5A6'];

  const renderDonutChart = () => {
    let currentAngle = -90;
    const radius = 70;
    const center = 100;
    const strokeWidth = 30;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="relative w-[200px] h-[200px] flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          {chartData.map((item, i) => {
            const angle = (item.percent / 100) * 360;
            const dashArray = `${(item.percent / 100) * circumference} ${circumference}`;
            const color = colors[i % colors.length];
            currentAngle += angle;
            
            return (
              <circle
                key={item.name}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={0}
                style={{ transform: `rotate(${(currentAngle - angle + 90)}deg)`, transformOrigin: 'center' }}
              />
            );
          })}
          <circle cx={center} cy={center} r={radius - strokeWidth/2 - 5} fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-gray-500">보유 비중</span>
          <span className="text-[11px] text-gray-500">(%)</span>
          <span className="text-lg font-bold mt-1">
            {chartData[0]?.percent.toFixed(1) || '0.0'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />
      
      <div className="pt-[60px] max-w-[1400px] mx-auto px-5 pb-20">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { key: 'holdings', label: '보유코인' },
            { key: 'trades', label: '거래내역' },
            { key: 'orders', label: '미체결' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-10 py-4 text-[16px] font-bold transition-all relative ${
                activeTab === tab.key
                  ? 'text-upbit-header'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-upbit-header" />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'holdings' && (
          <>
            {/* Summary Section */}
            <div className="bg-white border border-gray-200 rounded-sm mb-6 flex">
              {/* Stats Grid */}
              <div className="flex-1 p-8 grid grid-cols-2 gap-x-12 gap-y-6 border-r border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">보유 KRW</span>
                  <div className="text-right">
                    <span className="text-xl font-bold">{stats.krwBalance.toLocaleString()}</span>
                    <span className="text-sm text-gray-400 ml-1">KRW</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">총 보유자산</span>
                  <div className="text-right">
                    <span className="text-xl font-bold">{Math.round(stats.totalAssets).toLocaleString()}</span>
                    <span className="text-sm text-gray-400 ml-1">KRW</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                  <span className="text-gray-500 text-sm">총매수금액</span>
                  <div className="text-right">
                    <span className="text-lg font-bold">{Math.round(stats.totalPurchase).toLocaleString()}</span>
                    <span className="text-sm text-gray-400 ml-1">KRW</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                  <span className="text-gray-500 text-sm">총평가손익</span>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${stats.totalPL > 0 ? 'text-upbit-rise' : stats.totalPL < 0 ? 'text-upbit-fall' : 'text-gray-900'}`}>
                      {stats.totalPL > 0 ? '+' : ''}{Math.round(stats.totalPL).toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400 ml-1">KRW</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">총평가가금액</span>
                  <div className="text-right">
                    <span className="text-lg font-bold">{Math.round(stats.totalEvaluation).toLocaleString()}</span>
                    <span className="text-sm text-gray-400 ml-1">KRW</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">총평가수익률</span>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${stats.totalReturn > 0 ? 'text-upbit-rise' : stats.totalReturn < 0 ? 'text-upbit-fall' : 'text-gray-900'}`}>
                      {stats.totalReturn > 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}
                    </span>
                    <span className={`text-sm ml-1 ${stats.totalReturn > 0 ? 'text-upbit-rise' : stats.totalReturn < 0 ? 'text-upbit-fall' : 'text-gray-400'}`}>%</span>
                  </div>
                </div>
              </div>

              {/* Donut Chart Section */}
              <div className="w-[400px] p-8 flex items-center gap-8">
                {renderDonutChart()}
                <div className="flex-1 space-y-2">
                  {chartData.slice(0, 4).map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="text-gray-600 font-medium">{item.name}</span>
                      </div>
                      <span className="text-gray-500">{item.percent.toFixed(1)}%</span>
                    </div>
                  ))}
                  {chartData.length > 4 && (
                    <div className="text-[10px] text-gray-400 text-right">기타 {chartData.length - 4}종...</div>
                  )}
                </div>
                <button 
                  onClick={fetchData}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">보유코인 목록</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <input type="checkbox" id="hide-small" className="w-4 h-4" />
                  <label htmlFor="hide-small">비상장/소액 코인 숨기기 (평가금액 1만원 미만)</label>
                </div>
              </div>
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">보유코인</th>
                    <th className="py-3 px-4 text-right font-medium">보유수량</th>
                    <th className="py-3 px-4 text-right font-medium">매수평균가</th>
                    <th className="py-3 px-4 text-right font-medium">매수금액</th>
                    <th className="py-3 px-4 text-right font-medium">평가금액</th>
                    <th className="py-3 px-4 text-right font-medium">평가손익(%)</th>
                    <th className="py-3 px-4 text-center font-medium w-24">주문</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {coinHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-gray-400">보유 중인 코인이 없습니다.</td>
                    </tr>
                  ) : (
                    coinHoldings.map((b) => {
                      const balance = parseFloat(b.balance);
                      const avgPrice = parseFloat(b.avg_buy_price);
                      const currentPrice = tickers[`KRW-${b.currency}`]?.trade_price || avgPrice;
                      const purchaseAmount = balance * avgPrice;
                      const evaluationAmount = balance * currentPrice;
                      const pl = evaluationAmount - purchaseAmount;
                      const plRate = purchaseAmount > 0 ? (pl / purchaseAmount) * 100 : 0;

                      return (
                        <tr key={b.currency} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                                {b.currency[0]}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{b.currency}</div>
                                <div className="text-[11px] text-gray-400">{b.currency}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right tabular-nums">
                            <div className="font-bold">{balance.toFixed(8)}</div>
                            <div className="text-[11px] text-gray-400">{b.currency}</div>
                          </td>
                          <td className="py-4 px-4 text-right tabular-nums">
                            <div className="font-medium">{avgPrice.toLocaleString()}</div>
                            <div className="text-[11px] text-gray-400">KRW</div>
                          </td>
                          <td className="py-4 px-4 text-right tabular-nums">
                            <div className="font-medium">{Math.round(purchaseAmount).toLocaleString()}</div>
                            <div className="text-[11px] text-gray-400">KRW</div>
                          </td>
                          <td className="py-4 px-4 text-right tabular-nums">
                            <div className="font-bold">{Math.round(evaluationAmount).toLocaleString()}</div>
                            <div className="text-[11px] text-gray-400">KRW</div>
                          </td>
                          <td className="py-4 px-4 text-right tabular-nums">
                            <div className={`font-bold ${pl > 0 ? 'text-upbit-rise' : pl < 0 ? 'text-upbit-fall' : 'text-gray-900'}`}>
                              {plRate > 0 ? '+' : ''}{plRate.toFixed(2)}%
                            </div>
                            <div className={`text-[11px] ${pl > 0 ? 'text-upbit-rise' : pl < 0 ? 'text-upbit-fall' : 'text-gray-400'}`}>
                              {pl > 0 ? '+' : ''}{Math.round(pl).toLocaleString()} KRW
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button 
                              onClick={() => navigate(`/exchange?code=CRIX.UPBIT.KRW-${b.currency}`)}
                              className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1 mx-auto"
                            >
                              주문 <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'trades' && (
          <div className="bg-white border border-gray-200 rounded-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">거래내역</h3>
            </div>
            {trades.length === 0 ? (
              <div className="py-20 text-center text-gray-400">거래 내역이 없습니다.</div>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">체결시간</th>
                    <th className="py-3 px-4 text-left font-medium">마켓</th>
                    <th className="py-3 px-4 text-center font-medium">구분</th>
                    <th className="py-3 px-4 text-right font-medium">체결가격</th>
                    <th className="py-3 px-4 text-right font-medium">체결수량</th>
                    <th className="py-3 px-4 text-right font-medium">체결금액</th>
                    <th className="py-3 px-4 text-right font-medium">수수료</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {trades.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4 text-gray-500">
                        {new Date(t.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-4 px-4 font-bold">{t.market}</td>
                      <td className={`py-4 px-4 text-center font-bold ${t.side === 'bid' ? 'text-upbit-rise' : 'text-upbit-fall'}`}>
                        {t.side === 'bid' ? '매수' : '매도'}
                      </td>
                      <td className="py-4 px-4 text-right tabular-nums font-medium">{parseFloat(t.price).toLocaleString()}</td>
                      <td className="py-4 px-4 text-right tabular-nums">{parseFloat(t.volume).toFixed(8)}</td>
                      <td className="py-4 px-4 text-right tabular-nums font-bold">{parseFloat(t.funds).toLocaleString()}</td>
                      <td className="py-4 px-4 text-right tabular-nums text-gray-400">{parseFloat(t.fee).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white border border-gray-200 rounded-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">미체결 주문</h3>
            </div>
            {orders.filter(o => o.state === 'wait').length === 0 ? (
              <div className="py-20 text-center text-gray-400">미체결 주문이 없습니다.</div>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">주문시간</th>
                    <th className="py-3 px-4 text-left font-medium">마켓</th>
                    <th className="py-3 px-4 text-center font-medium">구분</th>
                    <th className="py-3 px-4 text-right font-medium">주문가격</th>
                    <th className="py-3 px-4 text-right font-medium">주문수량</th>
                    <th className="py-3 px-4 text-right font-medium">미체결수량</th>
                    <th className="py-3 px-4 text-center font-medium">취소</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.filter(o => o.state === 'wait').map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4 text-gray-500">
                        {new Date(o.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-4 px-4 font-bold">{o.market}</td>
                      <td className={`py-4 px-4 text-center font-bold ${o.side === 'bid' ? 'text-upbit-rise' : 'text-upbit-fall'}`}>
                        {o.side === 'bid' ? '매수' : '매도'}
                      </td>
                      <td className="py-4 px-4 text-right tabular-nums font-medium">
                        {o.price ? parseFloat(o.price).toLocaleString() : '시장가'}
                      </td>
                      <td className="py-4 px-4 text-right tabular-nums">{parseFloat(o.volume).toFixed(8)}</td>
                      <td className="py-4 px-4 text-right tabular-nums font-bold">{parseFloat(o.remaining_volume).toFixed(8)}</td>
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => handleCancelOrder(o.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <XCircle className="w-5 h-5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}
