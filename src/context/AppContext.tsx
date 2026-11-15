import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Currency, Language, PaymentMethod } from '../shared/commerce';
import { TRANSLATIONS, type Translations } from '../shared/i18n';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: 'admin' | 'seller' | 'buyer';
  preferredLang: string;
  preferredCurrency: string;
}

export interface StoreSummary {
  id: number;
  ownerId: number;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  accentColor: string;
  bannerUrl: string;
  avatarUrl: string;
  country: string;
  isVerified: boolean;
  status: string;
}

export interface CategoryItem {
  id: number;
  slug: string;
  nameFr: string;
  nameEn: string;
  nameHt: string;
  description: string;
  sortOrder: number;
}

export interface PaymentGatewayInfo {
  provider: PaymentMethod;
  displayName: string;
  isEnabled: boolean;
  mode: 'sandbox' | 'production';
  isConfigured: boolean;
  publicIdentifier: string;
  feePercentScaled: number;
  feeFixedUsdCents: number;
  instructions: string;
}

export interface CartProduct {
  id: number;
  title: string;
  priceUsdCents: number;
  coverUrl: string;
  storeName: string;
  storeSlug: string;
  productType: string;
}

interface AppContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  route: string;
  navigate: (to: string) => void;
  user: AuthUser | null;
  store: StoreSummary | null;
  token: string | null;
  setAuthSession: (token: string | null, user: AuthUser | null, store: StoreSummary | null) => void;
  logout: () => void;
  categories: CategoryItem[];
  paymentGateways: PaymentGatewayInfo[];
  cart: CartProduct[];
  addToCart: (product: CartProduct) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  refreshBootstrap: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('mgd_lang') : null;
    return saved === 'en' || saved === 'ht' ? saved : 'fr';
  });
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('mgd_currency') : null;
    return saved === 'HTG' || saved === 'EUR' ? saved : 'USD';
  });
  const [route, setRoute] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'
  );
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? window.sessionStorage.getItem('mgd_session') : null
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGatewayInfo[]>([]);
  const [cart, setCart] = useState<CartProduct[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('mgd_cart') : null;
      return saved ? (JSON.parse(saved) as CartProduct[]) : [];
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3800);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    window.localStorage.setItem('mgd_lang', newLang);
  };

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    window.localStorage.setItem('mgd_currency', newCurrency);
  };

  const navigate = useCallback((to: string) => {
    if (window.location.pathname + window.location.search !== to) {
      window.history.pushState({}, '', to);
    }
    setRoute(to);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setRoute(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setAuthSession = useCallback(
    (nextToken: string | null, nextUser: AuthUser | null, nextStore: StoreSummary | null) => {
      setToken(nextToken);
      setUser(nextUser);
      setStore(nextStore);
      if (nextToken) {
        window.sessionStorage.setItem('mgd_session', nextToken);
      } else {
        window.sessionStorage.removeItem('mgd_session');
      }
    },
    []
  );

  const logout = useCallback(() => {
    setAuthSession(null, null, null);
    showToast('Vous êtes déconnecté.', 'info');
    navigate('/');
  }, [navigate, setAuthSession, showToast]);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setPaymentGateways(data.paymentGateways || []);
      }
    } catch (err) {
      console.error('Bootstrap fetch error:', err);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setStore(null);
      return;
    }
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          setAuthSession(null, null, null);
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setStore(data.store);
      })
      .catch(() => {
        setAuthSession(null, null, null);
      });
  }, [token, setAuthSession]);

  const addToCart = useCallback(
    (product: CartProduct) => {
      setCart((prev) => {
        if (prev.some((p) => p.id === product.id)) {
          showToast('Ce produit numérique est déjà dans votre panier.', 'info');
          return prev;
        }
        const next = [...prev, product];
        window.localStorage.setItem('mgd_cart', JSON.stringify(next));
        showToast('Produit ajouté au panier.', 'success');
        return next;
      });
    },
    [showToast]
  );

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      window.localStorage.setItem('mgd_cart', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    window.localStorage.removeItem('mgd_cart');
  }, []);

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t: TRANSLATIONS[lang],
        currency,
        setCurrency,
        route,
        navigate,
        user,
        store,
        token,
        setAuthSession,
        logout,
        categories,
        paymentGateways,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        toast,
        showToast,
        refreshBootstrap,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
