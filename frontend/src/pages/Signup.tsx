import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    agreeTerms: false,
    agreePrivacy: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: '8자 이상', valid: formData.password.length >= 8 },
    { label: '영문 포함', valid: /[a-zA-Z]/.test(formData.password) },
    { label: '숫자 포함', valid: /\d/.test(formData.password) },
    { label: '특수문자 포함', valid: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) },
  ];

  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';
  const allRequirementsMet = passwordRequirements.every((req) => req.valid);
  const canSubmit = formData.email && allRequirementsMet && passwordsMatch && formData.name && formData.agreeTerms && formData.agreePrivacy;

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log(`[SIGNUP] Attempting signup for: ${formData.email}`);
      await signup(formData.email, formData.password, formData.name);
      console.log(`[SIGNUP] Signup successful for: ${formData.email}`);
      navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } });
    } catch (err: any) {
      console.error(`[SIGNUP] Signup failed for: ${formData.email}`, err);
      setError(err.message || '회원가입에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />
      
      <div className="pt-[100px] flex items-center justify-center p-4 pb-20">
        <div className="w-full max-w-md">
          {/* Signup form */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">회원가입</h1>

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
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-upbit-header focus:ring-1 focus:ring-upbit-header"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="홍길동"
                  required
                  className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-upbit-header focus:ring-1 focus:ring-upbit-header"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
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
                {/* Password requirements */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {passwordRequirements.map((req, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded ${
                        req.valid
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {req.valid && <Check className="w-3 h-3 inline mr-1" />}
                      {req.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  className={`w-full h-12 px-4 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none ${
                    formData.confirmPassword
                      ? passwordsMatch
                        ? 'border-green-500 focus:border-green-500'
                        : 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-upbit-header focus:ring-1 focus:ring-upbit-header'
                  }`}
                />
                {formData.confirmPassword && !passwordsMatch && (
                  <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
                )}
              </div>

              {/* Terms */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-upbit-header focus:ring-upbit-header"
                  />
                  <span className="text-sm text-gray-600">
                    <span className="text-red-500">*</span> 이용약관에 동의합니다
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreePrivacy}
                    onChange={(e) => handleChange('agreePrivacy', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-upbit-header focus:ring-upbit-header"
                  />
                  <span className="text-sm text-gray-600">
                    <span className="text-red-500">*</span> 개인정보처리방침에 동의합니다
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full h-12 bg-upbit-header hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">이미 계정이 있으신가요? </span>
              <Link to="/login" className="text-upbit-header font-medium hover:underline">
                로그인
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
