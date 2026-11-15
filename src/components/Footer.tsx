import React from 'react';
import { useApp } from '../context/AppContext';
import type { Currency, Language } from '../shared/commerce';

export const Footer: React.FC = () => {
  const { t, lang, setLang, currency, setCurrency, navigate } = useApp();

  const handleNav = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <footer className="bg-[#0B1221] text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <div className="font-display text-lg font-bold text-white">Masseillan Global Digital</div>
          <p className="text-sm text-slate-400 leading-relaxed">{t.slogan}</p>
          <p className="text-xs text-slate-400">
            Commission plateforme fixe de 5 % · Haïti &amp; International.
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-display font-semibold text-white">Marketplace</div>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/catalog" onClick={(e) => handleNav(e, '/catalog')} className="hover:text-white transition-colors">
                {t.nav.catalog}
              </a>
            </li>
            <li>
              <a href="/categories" onClick={(e) => handleNav(e, '/categories')} className="hover:text-white transition-colors">
                {t.nav.categories}
              </a>
            </li>
            <li>
              <a href="/stores" onClick={(e) => handleNav(e, '/stores')} className="hover:text-white transition-colors">
                {t.nav.stores}
              </a>
            </li>
            <li>
              <a href="/register?seller=1" onClick={(e) => handleNav(e, '/register?seller=1')} className="hover:text-white transition-colors">
                {t.nav.createStore}
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-display font-semibold text-white">Légal &amp; Support</div>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/terms" onClick={(e) => handleNav(e, '/terms')} className="hover:text-white transition-colors">
                {t.footer.terms}
              </a>
            </li>
            <li>
              <a href="/privacy" onClick={(e) => handleNav(e, '/privacy')} className="hover:text-white transition-colors">
                {t.footer.privacy}
              </a>
            </li>
            <li>
              <a href="/refund-policy" onClick={(e) => handleNav(e, '/refund-policy')} className="hover:text-white transition-colors">
                {t.footer.refunds}
              </a>
            </li>
            <li>
              <a href="/contact" onClick={(e) => handleNav(e, '/contact')} className="hover:text-white transition-colors">
                {t.footer.contact}
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="text-sm font-display font-semibold text-white">Langue &amp; Devise</div>
          <div className="space-y-2">
            <label htmlFor="footer-lang" className="block text-xs text-slate-400">
              Langue d&apos;affichage
            </label>
            <select
              id="footer-lang"
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ht">Kreyòl Ayisyen</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="footer-currency" className="block text-xs text-slate-400">
              Devise
            </label>
            <select
              id="footer-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 font-mono"
            >
              <option value="USD">USD ($)</option>
              <option value="HTG">HTG (Gourdes)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/80 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>{t.footer.copyright}</span>
          <span>MonCash · NatCash · PayPal · USDT (BSC BEP20)</span>
        </div>
      </div>
    </footer>
  );
};
