import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();

  const navItems = [
    { path: '/exchange', label: '거래소' },
    { path: '/balances', label: '입출금' },
    { path: '/investments', label: '투자내역' },
    { path: '/trends', label: '코인동향' },
    { path: '/community', label: '커뮤니티' },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignup = () => {
    navigate('/signup');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed w-full h-[60px] bg-upbit-header z-50">
      <section className="relative max-w-[1400px] h-[60px] leading-[60px] px-5 mx-auto flex items-center">
        {/* Logo - 메인 페이지로 이동 */}
        <h1 className="mr-[60px]">
          <Link to="/" className="text-xl font-bold text-white">
            Upbit
          </Link>
        </h1>

        {/* Main Navigation */}
        <nav className="flex items-center gap-10">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-[15px] hover:font-bold transition-all ${
                isActive(item.path)
                  ? 'text-white font-bold'
                  : 'text-upbit-text-light hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side - Auth */}
        <div className="ml-auto flex items-center gap-6">
          {isLoggedIn ? (
            <>
              <Link to="/profile" className="text-[13px] text-white hover:underline">
                {user?.name}님
              </Link>
              <button
                onClick={handleLogout}
                className="text-[13px] text-white hover:underline"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleLogin}
                className="text-[13px] text-white hover:underline"
              >
                로그인
              </button>
              <button
                onClick={handleSignup}
                className="text-[13px] text-white hover:underline"
              >
                회원가입
              </button>
            </>
          )}
        </div>
      </section>
    </header>
  );
}
