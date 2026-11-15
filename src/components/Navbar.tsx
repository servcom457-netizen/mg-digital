import React, { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const { t, navigate, route, user, logout, cart } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setMobileOpen(false);
    navigate(path);
  };

  const linkClass = (path: string) =>
    `text-sm font-medium whitespace-nowrap shrink-0 transition-colors underline-offset-8 decoration-2 ${
      route === path
        ? 'text-blue-600 underline'
        : 'text-slate-600 hover:text-slate-900 hover:underline'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => handleNav(e, '/')}
          className="flex items-center gap-2.5 text-base sm:text-lg font-display font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect width="32" height="32" rx="8" fill="#0B1221" />
            <path d="M8 22V10L16 17L24 10V22" stroke="#3B82F6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="22" r="2" fill="#8B5CF6" />
          </svg>
          <span>Masseillan Global Digital</span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Navigation principale" className="hidden lg:flex items-center gap-6">
          <a href="/catalog" onClick={(e) => handleNav(e, '/catalog')} className={linkClass('/catalog')}>
            {t.nav.catalog}
          </a>
          <a href="/categories" onClick={(e) => handleNav(e, '/categories')} className={linkClass('/categories')}>
            {t.nav.categories}
          </a>
          <a href="/stores" onClick={(e) => handleNav(e, '/stores')} className={linkClass('/stores')}>
            {t.nav.stores}
          </a>
          <a href="/buyer" onClick={(e) => handleNav(e, '/buyer')} className={linkClass('/buyer')}>
            {t.nav.buyerSpace}
          </a>
          {user?.role === 'admin' && (
            <a href="/admin" onClick={(e) => handleNav(e, '/admin')} className={linkClass('/admin')}>
              {t.nav.adminSpace}
            </a>
          )}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/cart')}
            aria-label={`${t.nav.cart} (${cart.length})`}
            className="relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.nav.cart}</span>
            <span className="font-mono tabular-nums text-xs font-semibold text-blue-600">({cart.length})</span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={logout}
              className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.logout}
            </button>
          ) : (
            <a
              href="/login"
              onClick={(e) => handleNav(e, '/login')}
              className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.login}
            </a>
          )}

          <button
            type="button"
            onClick={() =>
              navigate(
                user
                  ? user.role === 'buyer'
                    ? '/register?seller=1'
                    : '/seller'
                  : '/register?seller=1'
              )
            }
            className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {user && (user.role === 'seller' || user.role === 'admin') ? t.nav.sellerSpace : t.nav.createStore}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-700 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          <a href="/catalog" onClick={(e) => handleNav(e, '/catalog')} className="block py-2.5 text-sm font-medium text-slate-800">
            {t.nav.catalog}
          </a>
          <a href="/categories" onClick={(e) => handleNav(e, '/categories')} className="block py-2.5 text-sm font-medium text-slate-800">
            {t.nav.categories}
          </a>
          <a href="/stores" onClick={(e) => handleNav(e, '/stores')} className="block py-2.5 text-sm font-medium text-slate-800">
            {t.nav.stores}
          </a>
          <a href="/buyer" onClick={(e) => handleNav(e, '/buyer')} className="block py-2.5 text-sm font-medium text-slate-800">
            {t.nav.buyerSpace}
          </a>
          {user && (user.role === 'seller' || user.role === 'admin') && (
            <a href="/seller" onClick={(e) => handleNav(e, '/seller')} className="block py-2.5 text-sm font-medium text-blue-600">
              {t.nav.sellerSpace}
            </a>
          )}
          {user?.role === 'admin' && (
            <a href="/admin" onClick={(e) => handleNav(e, '/admin')} className="block py-2.5 text-sm font-medium text-violet-700">
              {t.nav.adminSpace}
            </a>
          )}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
              >
                {t.nav.logout}
              </button>
            ) : (
              <a
                href="/login"
                onClick={(e) => handleNav(e, '/login')}
                className="w-full py-2.5 px-4 text-center text-sm font-medium text-slate-800 border border-slate-300 rounded-lg"
              >
                {t.nav.login}
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate(user ? '/seller' : '/register?seller=1');
              }}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg"
            >
              {t.nav.createStore}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
