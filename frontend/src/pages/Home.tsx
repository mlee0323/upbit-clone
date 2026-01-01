import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { TrendingUp, TrendingDown, Shield, Zap, Globe } from 'lucide-react';

export default function Home() {
  // Mock trending coins data
  const trendingCoins = [
    { symbol: 'BTC', name: '비트코인', price: 140250000, change: 2.34 },
    { symbol: 'ETH', name: '이더리움', price: 5120000, change: 1.87 },
    { symbol: 'XRP', name: '리플', price: 3250, change: -0.52 },
    { symbol: 'SOL', name: '솔라나', price: 285000, change: 5.12 },
    { symbol: 'DOGE', name: '도지코인', price: 520, change: -1.23 },
  ];

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-[60px] bg-gradient-to-b from-upbit-header to-blue-800 text-white">
        <div className="max-w-[1400px] mx-auto px-5 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">
            신뢰할 수 있는 디지털 자산 거래소
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            업계 최고 수준의 보안과 편리한 서비스를 경험해보세요
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/exchange"
              className="px-8 py-3 bg-white text-upbit-header font-bold rounded-lg hover:bg-gray-100 transition-colors"
            >
              거래 시작하기
            </Link>
            <Link
              to="/community"
              className="px-8 py-3 border border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              커뮤니티
            </Link>
          </div>
        </div>
      </section>

      {/* Trending Coins */}
      <section className="max-w-[1400px] mx-auto px-5 -mt-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">실시간 시세</h2>
            <Link to="/exchange" className="text-sm text-upbit-header hover:underline">
              더보기 →
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {trendingCoins.map((coin) => (
              <Link
                key={coin.symbol}
                to={`/exchange?symbol=KRW-${coin.symbol}`}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={`https://static.upbit.com/logos/${coin.symbol}.png`}
                    alt={coin.symbol}
                    className="w-6 h-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/24';
                    }}
                  />
                  <span className="font-medium text-gray-900">{coin.name}</span>
                </div>
                <div className="text-lg font-bold text-gray-900 tabular-nums">
                  {formatPrice(coin.price)}
                  <span className="text-xs text-gray-500 ml-1">KRW</span>
                </div>
                <div className={`text-sm font-medium ${coin.change >= 0 ? 'text-upbit-rise' : 'text-upbit-fall'}`}>
                  {coin.change >= 0 ? <TrendingUp className="inline w-3 h-3 mr-1" /> : <TrendingDown className="inline w-3 h-3 mr-1" />}
                  {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1400px] mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
          왜 Upbit인가요?
        </h2>
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-upbit-header" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">최고 수준의 보안</h3>
            <p className="text-gray-600 text-sm">
              업계 최고 수준의 보안 시스템으로 고객님의 자산을 안전하게 보호합니다.
            </p>
          </div>
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-upbit-header" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">빠른 거래 속도</h3>
            <p className="text-gray-600 text-sm">
              초당 수십만 건의 거래를 처리할 수 있는 최첨단 매칭 엔진을 제공합니다.
            </p>
          </div>
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-upbit-header" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">다양한 코인</h3>
            <p className="text-gray-600 text-sm">
              비트코인, 이더리움 등 다양한 암호화폐를 한 곳에서 거래하세요.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-upbit-header py-16">
        <div className="max-w-[1400px] mx-auto px-5">
          <div className="grid grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-3xl font-bold mb-2">900만+</div>
              <div className="text-blue-200">가입 회원 수</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">₩10조+</div>
              <div className="text-blue-200">24시간 거래대금</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">200+</div>
              <div className="text-blue-200">상장 코인 수</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">24/7</div>
              <div className="text-blue-200">고객 지원</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1400px] mx-auto px-5 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          지금 바로 시작하세요
        </h2>
        <p className="text-gray-600 mb-8">
          간편한 회원가입으로 수 분 내에 거래를 시작할 수 있습니다.
        </p>
        <Link
          to="/exchange"
          className="inline-block px-8 py-3 bg-upbit-header text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          거래소 바로가기
        </Link>
      </section>

      <Footer />
    </div>
  );
}
