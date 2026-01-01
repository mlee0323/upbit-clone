import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CoinList from '../components/CoinList';
import CoinInfo from '../components/CoinInfo';
import Chart from '../components/Chart';
import OrderBook from '../components/OrderBook';
import OrderForm from '../components/OrderForm';
import { Trade } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

// Generate mock trades (체결 내역)
const generateMockTrades = (currentPrice: number): Trade[] => {
  const trades: Trade[] = [];
  const now = new Date();
  
  for (let i = 0; i < 30; i++) {
    const time = new Date(now.getTime() - i * 5000);
    const priceVariation = currentPrice * (1 + (Math.random() - 0.5) * 0.002);
    
    trades.push({
      id: `trade-${i}`,
      time: time.toISOString(),
      price: priceVariation,
      size: Math.random() * 0.5,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
    });
  }
  
  return trades;
};

export default function Exchange() {
  const [selectedSymbol, setSelectedSymbol] = useState('KRW-BTC');
  const [trades, setTrades] = useState<Trade[]>([]);

  // Use WebSocket for real-time data
  const { coins, orderbooks, isConnected, subscribeOrderbook } = useWebSocket();

  const selectedCoin = coins.find((c) => c.symbol === selectedSymbol) || null;

  // Subscribe to orderbook when symbol changes
  useEffect(() => {
    if (isConnected) {
      subscribeOrderbook(selectedSymbol);
    }
  }, [selectedSymbol, isConnected, subscribeOrderbook]);

  // Update trades when coin changes
  useEffect(() => {
    if (selectedCoin) {
      setTrades(generateMockTrades(selectedCoin.price));
    }
  }, [selectedCoin?.price, selectedSymbol]);

  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />
      
      {/* Main content */}
      <div className="max-w-[1400px] mx-auto pt-[72px] pb-[20px]">
        <div className="flex gap-[10px] items-start">
          {/* Left Section */}
          <div className="flex-1 flex flex-col gap-[10px] min-w-0">
            {/* Coin Info */}
            <CoinInfo coin={selectedCoin} />
            
            {/* Chart - now handles its own data */}
            <div className="h-[450px] flex-shrink-0">
              <Chart 
                symbol={selectedSymbol} 
                realtimePrice={selectedCoin?.price}
              />
            </div>
            
            {/* Order Book + Order Form */}
            <div className="flex gap-[10px] h-[600px] flex-shrink-0">
              <div className="flex-1">
                <OrderBook 
                  asks={orderbooks[selectedSymbol]?.asks || []} 
                  bids={orderbooks[selectedSymbol]?.bids || []}
                  trades={trades}
                  currentPrice={selectedCoin?.price || 0}
                  coin={selectedCoin}
                />
              </div>
              <div className="w-[300px]">
                <OrderForm coin={selectedCoin} />
              </div>
            </div>
          </div>
          
          {/* Right Section - Coin List (Sticky) */}
          <div className="w-[400px] flex-shrink-0 sticky top-[72px] h-[calc(100vh-82px)]">
            <CoinList 
              coins={coins}
              selectedSymbol={selectedSymbol}
              onSelectCoin={setSelectedSymbol}
              isLoading={!isConnected && coins.length === 0}
            />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
