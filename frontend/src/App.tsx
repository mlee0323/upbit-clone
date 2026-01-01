import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useEffect } from 'react';
import Home from './pages/Home';
import Exchange from './pages/Exchange';
import Community from './pages/Community';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import CoinTrends from './pages/CoinTrends';
import Balances from './pages/Balances';
import Investments from './pages/Investments';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exchange" element={<Exchange />} />
          <Route path="/community" element={<Community />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/trends" element={<CoinTrends />} />
          <Route path="/balances" element={<Balances />} />
          <Route path="/investments" element={<Investments />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
