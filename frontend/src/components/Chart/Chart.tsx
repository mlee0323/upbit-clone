import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { ChevronDown, Settings, BarChart2 } from 'lucide-react';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  current_price?: number;
}

interface ChartProps {
  symbol: string;
  realtimePrice?: number;
  onIntervalChange?: (interval: string) => void;
}

const INTERVAL_MAP: Record<string, string> = {
  '1m': 'M1',
  '5m': 'M5',
  '15m': 'M15',
  '1h': 'M60',
  '1d': 'D',
  '1w': 'W',
  '1M': 'Mo',
};

const TIME_INTERVALS = [
  { value: '1m', label: '1분' },
  { value: '5m', label: '5분' },
  { value: '15m', label: '15분' },
  { value: '1h', label: '1시간' },
  { value: '1d', label: '일' },
  { value: '1w', label: '주' },
  { value: '1M', label: '월' },
];

export default function Chart({ symbol, realtimePrice, onIntervalChange }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('1m');
  const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const lastFittedRef = useRef<string>('');

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e0e0e0',
        rightOffset: 5, // Add space on the right for the latest candle
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
        autoScale: true,
        alignLabels: true,
        borderVisible: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
        minimumWidth: 100,
        entireTextOnly: true,
      },
      crosshair: {
        vertLine: { color: '#999', width: 1, style: 2, labelBackgroundColor: '#f5f5f5' },
        horzLine: { color: '#999', width: 1, style: 2, labelBackgroundColor: '#f5f5f5' },
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#c84a31',
      downColor: '#1261c4',
      borderUpColor: '#c84a31',
      borderDownColor: '#1261c4',
      wickUpColor: '#c84a31',
      wickDownColor: '#1261c4',
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#e0e0e0',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch candle data
  const fetchCandleData = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiInterval = INTERVAL_MAP[selectedInterval] || 'M1';
      console.log(`[Chart] Fetching: /api/v1/candles/${symbol}?interval=${apiInterval}&limit=500`);
      const response = await fetch(`/api/v1/candles/${symbol}?interval=${apiInterval}&limit=500`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      console.log(`[Chart] Fetched data count: ${data.length}`);
      setChartData(data);
    } catch (error) {
      console.error('[Chart] Failed to fetch candle data:', error);
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, selectedInterval]);

  useEffect(() => {
    fetchCandleData();
  }, [fetchCandleData]);

  // Auto refresh every 30 seconds for M1
  useEffect(() => {
    if (selectedInterval !== '1m') return;
    const interval = setInterval(fetchCandleData, 30000);
    return () => clearInterval(interval);
  }, [selectedInterval, fetchCandleData]);

  // Update latest candle when realtimePrice changes
  useEffect(() => {
    if (!candleSeriesRef.current || !realtimePrice || chartData.length === 0) return;

    const lastCandle = chartData[chartData.length - 1];
    const apiInterval = INTERVAL_MAP[selectedInterval] || 'M1';
    
    // CRITICAL: Force KST display by shifting timestamps by 9 hours
    const KST_OFFSET = 9 * 60 * 60;
    
    // Use regular 'now'. Since API returns no-Z strings, new Date() treats them as local.
    const now = new Date();
    let candleTime: number;
    
    const timestamp = now.getTime();
    if (apiInterval === 'M1') candleTime = Math.floor(timestamp / 60000) * 60000;
    else if (apiInterval === 'M5') candleTime = Math.floor(timestamp / 300000) * 300000;
    else if (apiInterval === 'M15') candleTime = Math.floor(timestamp / 900000) * 900000;
    else if (apiInterval === 'M60') candleTime = Math.floor(timestamp / 3600000) * 3600000;
    else candleTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Safety check: never update with a time older than the last candle
    const lastCandleTime = new Date(lastCandle.time).getTime();
    if (candleTime < lastCandleTime) {
      candleTime = lastCandleTime;
    }

    try {
      candleSeriesRef.current.update({
        time: (candleTime / 1000 + KST_OFFSET) as Time,
        open: lastCandle.close,
        high: Math.max(lastCandle.high, realtimePrice),
        low: Math.min(lastCandle.low, realtimePrice),
        close: realtimePrice,
      });
    } catch (e) {
      // Ignore update errors to prevent crash
    }
  }, [realtimePrice, selectedInterval, chartData]);

  // Update chart when data changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || chartData.length === 0) return;

    console.log(`[Chart] Raw data count: ${chartData.length}`);

    const candleData = chartData
      .filter(item => item.time && item.open !== undefined && item.close !== undefined)
      .map(item => ({
        // Shift by 9 hours for KST display
        time: (new Date(item.time).getTime() / 1000 + 9 * 3600) as Time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    const volumeData = chartData
      .filter(item => item.time && item.volume !== undefined)
      .map(item => ({
        time: (new Date(item.time).getTime() / 1000 + 9 * 3600) as Time,
        value: item.volume,
        color: item.close >= item.open ? 'rgba(200, 74, 49, 0.5)' : 'rgba(18, 97, 196, 0.5)',
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    console.log(`[Chart] Filtered candle count: ${candleData.length}, First: ${candleData[0]?.time}, Last: ${candleData[candleData.length-1]?.time}`);

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    const fitKey = `${symbol}-${selectedInterval}`;
    if (chartRef.current && lastFittedRef.current !== fitKey) {
      // Scroll to show the most recent data, user can drag left to see older data
      chartRef.current.timeScale().scrollToRealTime();
      lastFittedRef.current = fitKey;
    }
  }, [chartData, symbol, selectedInterval]);

  const handleIntervalChange = (interval: string) => {
    setSelectedInterval(interval);
    setShowIntervalDropdown(false);
    onIntervalChange?.(interval);
  };

  const selectedLabel = TIME_INTERVALS.find(i => i.value === selectedInterval)?.label || selectedInterval;

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-800">{symbol}</span>
          <div className="relative">
            <button
              onClick={() => setShowIntervalDropdown(!showIntervalDropdown)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 font-medium"
            >
              {selectedLabel}
              <ChevronDown className={`w-3 h-3 transition-transform ${showIntervalDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showIntervalDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[80px]">
                {TIME_INTERVALS.map((interval) => (
                  <button
                    key={interval.value}
                    onClick={() => handleIntervalChange(interval.value)}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 ${
                      selectedInterval === interval.value ? 'bg-gray-100 text-upbit-header font-bold' : 'text-gray-700'
                    }`}
                  >
                    {interval.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">
            <BarChart2 className="w-3 h-3" /> 지표
          </button>
          <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">
            <Settings className="w-3 h-3" /> 설정
          </button>
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        {isLoading && chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-gray-400">차트 로딩 중...</div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
