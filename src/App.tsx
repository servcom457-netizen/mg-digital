import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { StorefrontPage, StoresDirectoryPage } from './pages/StorefrontPage';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { CartPage, CheckoutPage, OrderConfirmationPage } from './pages/CartCheckoutPages';
import { BuyerSpacePage } from './pages/BuyerSpacePage';
import { SellerDashboardPage } from './pages/SellerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import {
  ContactPage,
  PrivacyPage,
  RefundPolicyPage,
  TermsPage,
} from './pages/LegalAndContactPages';

const RouterView: React.FC = () => {
  const { route, toast } = useApp();
  const pathname = route.split('?')[0] || '/';

  let page: React.ReactNode = <HomePage />;

  if (pathname === '/' || pathname === '') {
    page = <HomePage />;
  } else if (pathname === '/catalog') {
    page = <CatalogPage />;
  } else if (pathname === '/categories') {
    page = <CatalogPage initialCategoriesOnly />;
  } else if (pathname === '/stores') {
    page = <StoresDirectoryPage />;
  } else if (pathname.startsWith('/store/')) {
    const slug = pathname.slice('/store/'.length).replace(/\/+$/, '');
    page = <StorefrontPage slug={slug} />;
  } else if (pathname.startsWith('/product/')) {
    const id = Number(pathname.slice('/product/'.length));
    page = <ProductDetailPage productId={id} />;
  } else if (pathname === '/login') {
    page = <LoginPage />;
  } else if (pathname === '/register') {
    page = <RegisterPage />;
  } else if (pathname === '/forgot-password') {
    page = <ForgotPasswordPage />;
  } else if (pathname === '/cart') {
    page = <CartPage />;
  } else if (pathname === '/checkout') {
    page = <CheckoutPage />;
  } else if (pathname.startsWith('/order/')) {
    const orderNumber = pathname.slice('/order/'.length).replace(/\/+$/, '');
    page = <OrderConfirmationPage orderNumber={orderNumber} />;
  } else if (pathname === '/buyer') {
    page = <BuyerSpacePage />;
  } else if (pathname === '/seller' || pathname === '/seller/products/new' || pathname === '/seller/wallet') {
    page = <SellerDashboardPage />;
  } else if (pathname === '/admin') {
    page = <AdminDashboardPage />;
  } else if (pathname === '/terms') {
    page = <TermsPage />;
  } else if (pathname === '/privacy') {
    page = <PrivacyPage />;
  } else if (pathname === '/refund-policy') {
    page = <RefundPolicyPage />;
  } else if (pathname === '/contact') {
    page = <ContactPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1">{page}</main>
      <Footer />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
            toast.type === 'error'
              ? 'bg-rose-600'
              : toast.type === 'success'
                ? 'bg-emerald-700'
                : 'bg-slate-900'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <RouterView />
    </AppProvider>
  );
}
