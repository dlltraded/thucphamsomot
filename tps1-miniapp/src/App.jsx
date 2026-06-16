import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RequestQuote from './pages/RequestQuote';
import ProductCatalog from './pages/ProductCatalog';
import AboutPage from './pages/AboutPage';
import AdminPage from './pages/AdminPage';
import BottomNav from './components/BottomNav';
import useUserStore from './stores/user';
import { useAppStore } from './stores/appState';
import WelcomePage from './pages/WelcomePage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Hide BottomNav on /admin route
function AppLayout() {
  const { pathname } = useLocation();
  const isAdmin = pathname === '/admin';
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bao-gia" element={<RequestQuote />} />
        <Route path="/san-pham" element={<ProductCatalog />} />
        <Route path="/gioi-thieu" element={<AboutPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      {!isAdmin && <BottomNav />}
    </div>
  );
}

export default function App() {
  const fetchZaloUser = useUserStore((state) => state.fetchZaloUser);
  const hasSeenWelcome = useAppStore((state) => state.hasSeenWelcome);

  useEffect(() => {
    fetchZaloUser();
  }, [fetchZaloUser]);

  if (!hasSeenWelcome) {
    return <WelcomePage />;
  }

  return (
    <HashRouter>
      <ScrollToTop />
      <AppLayout />
    </HashRouter>
  );
}
