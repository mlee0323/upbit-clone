import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownCircle, ArrowUpCircle, History } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

interface Balance {
  currency: string;
  balance: string;
  locked: string;
  available: string;
}

interface Transaction {
  id: number;
  type: 'deposit' | 'withdraw';
  amount: string;
  created_at: string;
}

export default function Balances() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [krwBalance, setKrwBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isLoggedIn, navigate]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    
    // Fetch KRW balance
    try {
      const balanceRes = await fetch('/api/v1/balance/KRW', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (balanceRes.ok) {
        setKrwBalance(await balanceRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }

    // Fetch transaction history
    try {
      const historyRes = await fetch('/api/v1/krw/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (historyRes.ok) {
        setTransactions(await historyRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleSubmit = async () => {
    if (!amount) return;
    
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/krw/${activeTab}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '처리에 실패했습니다');
      }

      setSuccess(activeTab === 'deposit' ? '입금이 완료되었습니다!' : '출금이 완료되었습니다!');
      setAmount('');
      fetchData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [10000, 50000, 100000, 500000, 1000000];

  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />
      
      <div className="pt-[80px] max-w-[800px] mx-auto px-4 pb-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">입출금</h1>

        {/* Balance Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="text-sm text-gray-500 mb-2">보유 KRW</div>
          <div className="text-3xl font-bold text-gray-900 mb-4">
            {parseFloat(krwBalance?.balance || '0').toLocaleString()} 원
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-500">주문가능: </span>
              <span className="font-medium">{parseFloat(krwBalance?.available || '0').toLocaleString()} 원</span>
            </div>
            <div>
              <span className="text-gray-500">주문중: </span>
              <span className="font-medium">{parseFloat(krwBalance?.locked || '0').toLocaleString()} 원</span>
            </div>
          </div>
        </div>

        {/* Deposit/Withdraw Form */}
        <div className="bg-white rounded-lg shadow mb-6">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'deposit'
                  ? 'text-upbit-rise border-b-2 border-upbit-rise'
                  : 'text-gray-500'
              }`}
            >
              <ArrowDownCircle className="w-5 h-5 inline mr-2" />
              입금
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'withdraw'
                  ? 'text-upbit-fall border-b-2 border-upbit-fall'
                  : 'text-gray-500'
              }`}
            >
              <ArrowUpCircle className="w-5 h-5 inline mr-2" />
              출금
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-600 text-sm">
                {success}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">금액 (원)</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="금액을 입력하세요"
                className="w-full h-12 px-4 border border-gray-300 rounded-lg text-lg focus:outline-none focus:border-upbit-header"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  +{quickAmount.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !amount}
              className={`w-full py-4 rounded-lg font-bold text-white transition-colors disabled:opacity-50 ${
                activeTab === 'deposit'
                  ? 'bg-upbit-rise hover:bg-red-600'
                  : 'bg-upbit-fall hover:bg-blue-600'
              }`}
            >
              {isSubmitting ? '처리 중...' : activeTab === 'deposit' ? '입금하기' : '출금하기'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              {activeTab === 'deposit' ? '최소 입금: 1,000원' : '최소 출금: 5,000원'}
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <h2 className="font-medium">거래 내역</h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              거래 내역이 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex justify-between items-center">
                  <div>
                    <span className={`font-medium ${tx.type === 'deposit' ? 'text-upbit-rise' : 'text-upbit-fall'}`}>
                      {tx.type === 'deposit' ? '입금' : '출금'}
                    </span>
                    <div className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <div className={`text-lg font-medium ${tx.type === 'deposit' ? 'text-upbit-rise' : 'text-upbit-fall'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}{parseFloat(tx.amount).toLocaleString()} 원
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
