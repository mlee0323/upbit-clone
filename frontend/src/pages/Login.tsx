import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log(`[LOGIN] Attempting login for: ${email}`);
      await login(email, password);
      console.log(`[LOGIN] Login successful for: ${email}`);
      navigate('/');
    } catch (err: any) {
      console.error(`[LOGIN] Login failed for: ${email}`, err);
      setError(err.message || '로그인에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />
      
      <div className="pt-[100px] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Login form */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">로그인</h1>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-upbit-header focus:ring-1 focus:ring-upbit-header"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    required
                    className="w-full h-12 px-4 pr-12 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-upbit-header focus:ring-1 focus:ring-upbit-header"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-upbit-header hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">계정이 없으신가요? </span>
              <Link to="/signup" className="text-upbit-header font-medium hover:underline">
                회원가입
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
