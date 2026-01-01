import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts';
import { TickerData, CoinSymbol, COIN_INFO } from '../types';

interface PriceChartProps {
  symbol: CoinSymbol;
  data: TickerData[];
  isLoading: boolean;
  error: string | null;
}

export default function PriceChart({ symbol, data, isLoading, error }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [latestPrice, setLatestPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#131e31' },
        textColor: '#8b95a5',
      },
      grid: {
        vertLines: { color: '#1e2d45' },
        horzLines: { color: '#1e2d45' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#1e2d45',
      },
      rightPriceScale: {
        borderColor: '#1e2d45',
      },
      crosshair: {
        vertLine: { color: '#4B9AF3', width: 1, style: 2 },
        horzLine: { color: '#4B9AF3', width: 1, style: 2 },
      },
    });

    // Create line series
    const lineSeries = chart.addLineSeries({
      color: '#E15241',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1,
      },
    });

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const chartData: LineData[] = data
      .slice()
      .reverse()
      .map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as Time,
        value: item.current_price,
      }));

    seriesRef.current.setData(chartData);

    // Update latest price and change
    if (data.length > 0) {
      setLatestPrice(data[0].current_price);
      setPriceChange(data[0].change_rate);
    }

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  // Update line color based on price change
  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.applyOptions({
        color: priceChange >= 0 ? '#E15241' : '#4B9AF3',
      });
    }
  }, [priceChange]);

  const coinInfo = COIN_INFO[symbol];
  const displaySymbol = symbol.replace('KRW-', '');
  const isUp = priceChange >= 0;

  const formattedPrice = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(latestPrice);

  if (error) {
    return (
      <div className="bg-upbit-bg-card border border-upbit-border rounded-lg p-6 h-[430px] flex flex-col items-center justify-center">
        <div className="text-upbit-up text-5xl mb-4">⚠️</div>
        <div className="text-lg font-semibold text-upbit-text mb-2">연결 오류</div>
        <div className="text-upbit-text-secondary text-center max-w-md">
          {error}
        </div>
        <div className="text-sm text-upbit-text-secondary mt-4">
          백엔드 서버 연결을 확인해주세요
        </div>
      </div>
    );
  }

  return (
    <div className="bg-upbit-bg-card border border-upbit-border rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold
            ${isUp ? 'bg-upbit-up/20 text-upbit-up' : 'bg-upbit-down/20 text-upbit-down'}
          `}>
            {coinInfo.icon}
          </div>
          <div>
            <span className="font-semibold text-lg">{displaySymbol}</span>
            <span className="text-upbit-text-secondary text-sm ml-2">{coinInfo.name}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${isUp ? 'text-upbit-up' : 'text-upbit-down'}`}>
            {formattedPrice}
          </div>
          <div className={`text-sm ${isUp ? 'text-upbit-up' : 'text-upbit-down'}`}>
            {isUp ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {isLoading && data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-upbit-bg-card/80 z-10">
            <div className="text-upbit-text-secondary">데이터 로딩 중...</div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" />
      </div>
    </div>
  );
}
