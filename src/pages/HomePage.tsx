import React, { useEffect, useState } from 'react';
import { ArrowRight, Globe, Lock, ShieldCheck, Store, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard, type ProductCardData } from '../components/ProductCard';
import type { Currency, Language } from '../shared/commerce';

interface StoreCardItem {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  accentColor: string;
  avatarUrl: string;
  country: string;
  isVerified: boolean;
  productsCount: number;
  totalSales: number;
}

export const HomePage: React.FC = () => {
  const { t, lang, setLang, currency, setCurrency, categories, paymentGateways, navigate } = useApp();
  const [popularProducts, setPopularProducts] = useState<ProductCardData[]>([]);
  const [topStores, setTopStores] = useState<StoreCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetch('/api/products?sort=popular'), fetch('/api/stores')])
      .then(async ([pRes, sRes]) => {
        if (!active) return;
        const pData = pRes.ok ? await pRes.json() : { products: [] };
        const sData = sRes.ok ? await sRes.json() : { stores: [] };
        setPopularProducts((pData.products || []).slice(0, 6));
        setTopStores((sData.stores || []).slice(0, 3));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const getCategoryTitle = (c: (typeof categories)[number]) =>
    lang === 'en' ? c.nameEn : lang === 'ht' ? c.nameHt : c.nameFr;

  return (
    <div className="bg-slate-50">
      {/* Hero Showcase */}
      <section className="bg-[#0B1221] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between gap-8">
              <div className="space-y-5">
                <p className="text-sm font-medium text-blue-400 tracking-wide">
                  Masseillan Global Digital · Haïti &amp; International
                </p>
                <h1
                  className="font-display font-bold tracking-tight text-white leading-[1.1]"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
                >
                  {t.hero.headline}
                </h1>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                  {t.hero.subheadline}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/register?seller=1')}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{t.hero.ctaPrimary}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/catalog')}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-100 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {t.hero.ctaSecondary}
                  </button>
                </div>

                {/* Language & Multi-Currency Controls */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800" role="group" aria-label="Sélection de la langue">
                    {(['fr', 'en', 'ht'] as Language[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLang(code)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          lang === code ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {code === 'fr' ? 'FR' : code === 'en' ? 'EN' : 'HT'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800" role="group" aria-label="Sélection de la devise">
                    {(['USD', 'HTG', 'EUR'] as Currency[]).map((cur) => (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => setCurrency(cur)}
                        className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                          currency === cur ? 'bg-violet-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {cur}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-64 sm:h-80 lg:h-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                <img
                  src="/src/assets/images/hero_digital_creator_1794684627453.jpg"
                  alt="Espace de travail d'un créateur numérique Masseillan Global Digital"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-column summary strip below hero */}
          <div className="mt-10 pt-8 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-xl font-mono font-semibold tabular-nums text-white">5 %</div>
              <div className="text-sm text-slate-300 mt-1">{t.hero.statCommission}</div>
            </div>
            <div>
              <div className="text-xl font-mono font-semibold tabular-nums text-white">USD · HTG · EUR</div>
              <div className="text-sm text-slate-300 mt-1">{t.hero.statCurrencies}</div>
            </div>
            <div>
              <div className="text-xl font-mono font-semibold tabular-nums text-white">4 Passerelles</div>
              <div className="text-sm text-slate-300 mt-1">{t.hero.statMethods}</div>
            </div>
            <div>
              <div className="text-xl font-mono font-semibold tabular-nums text-white">48 heures</div>
              <div className="text-sm text-slate-300 mt-1">{t.hero.statDelivery}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-950">{t.sections.categoriesTitle}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.sections.categoriesSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
          >
            {t.sections.viewAll} →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.slice(0, 10).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/catalog?category=${cat.slug}`)}
              className="text-left bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-4 transition-colors"
            >
              <div className="text-sm font-display font-semibold text-slate-950">{getCategoryTitle(cat)}</div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-1">{cat.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Popular Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-950">{t.sections.popularProductsTitle}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.sections.popularProductsSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
          >
            {t.sections.viewAll} →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Top Creator Storefronts */}
      <section className="bg-white border-y border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-950">{t.sections.topStoresTitle}</h2>
              <p className="text-sm text-slate-600 mt-1">{t.sections.topStoresSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/stores')}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
            >
              {t.sections.viewAll} →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topStores.map((st) => (
              <article
                key={st.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={st.avatarUrl || '/src/assets/images/product_ebook_mastery_1794684628002.jpg'}
                      alt={st.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                    />
                    <div>
                      <h3 className="font-display font-semibold text-slate-950">{st.name}</h3>
                      <p className="text-xs font-mono text-slate-500">/store/{st.slug}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{st.tagline}</p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span className="tabular-nums">
                    {st.productsCount} produits · {st.totalSales} ventes
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/store/${st.slug}`)}
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Ouvrir →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Benefits + 4 Payment Methods */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-14">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-950 mb-8">{t.sections.benefitsTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
              <Store className="w-5 h-5 text-blue-600" aria-hidden="true" />
              <h3 className="font-display font-semibold text-slate-950">Boutique personnalisée gratuite</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Créez votre vitrine URL dédiée, ajoutez vos produits numériques et publiez en quelques minutes.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
              <Wallet className="w-5 h-5 text-violet-600" aria-hidden="true" />
              <h3 className="font-display font-semibold text-slate-950">Commission fixe 5 % transparente</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sur une vente de 20 USD, 1 USD revient à la plateforme et 19 USD sont crédités à votre portefeuille.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
              <Globe className="w-5 h-5 text-blue-600" aria-hidden="true" />
              <h3 className="font-display font-semibold text-slate-950">Multilingue &amp; Multi-devises</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Vendez en Haïti et partout dans le monde en français, anglais et créole avec conversion USD, HTG, EUR.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
              <Lock className="w-5 h-5 text-slate-900" aria-hidden="true" />
              <h3 className="font-display font-semibold text-slate-950">Téléchargements protégés</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Chaque commande confirmée génère des liens signés expirant automatiquement avec suivi des téléchargements.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Mandatory Payment Rails */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold text-slate-950">{t.sections.paymentsTitle}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.sections.paymentsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {paymentGateways.map((gw) => (
              <div key={gw.provider} className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-semibold text-slate-950">{gw.displayName}</span>
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{gw.instructions}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 text-xs font-mono text-slate-500 flex items-center justify-between">
                  <span>{gw.mode === 'production' ? (gw.isConfigured ? 'Production active' : 'Config requise') : 'Mode Sandbox'}</span>
                  <span className="tabular-nums">
                    Frais {(gw.feePercentScaled / 100).toFixed(2)}%
                    {gw.feeFixedUsdCents > 0 ? ` + $${(gw.feeFixedUsdCents / 100).toFixed(2)}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials (Claim-to-Proof with full attribution) */}
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-950 mb-8">{t.sections.testimonialsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <blockquote className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                « Avant Masseillan Global Digital, mes clients en Haïti ne pouvaient pas payer mes guides PDF facilement. Aujourd’hui, j’encaisse par MonCash et PayPal dans le même tableau de bord avec 95 % de revenu net. »
              </p>
              <footer className="text-xs text-slate-500 pt-3 border-t border-slate-100">
                <strong className="block text-sm font-semibold text-slate-950">Claire-Anne Jean-Baptiste</strong>
                Fondatrice, Atelier Masseillan Éditions · Port-au-Prince
              </footer>
            </blockquote>

            <blockquote className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                « Le lien personnalisé /store/caribbean-design-lab nous permet de partager notre catalogue Canva directement sur Instagram et de recevoir nos paiements en USDT BEP20 ou HTG sans friction. »
              </p>
              <footer className="text-xs text-slate-500 pt-3 border-t border-slate-100">
                <strong className="block text-sm font-semibold text-slate-950">Marc-Antoine Pierre</strong>
                Directeur Créatif, Caribbean Design Lab · Cap-Haïtien
              </footer>
            </blockquote>

            <blockquote className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                « Les acheteurs reçoivent leurs liens temporaires sécurisés immédiatement après confirmation serveur, et nous suivons chaque commission de 5 % et chaque retrait en toute transparence. »
              </p>
              <footer className="text-xs text-slate-500 pt-3 border-t border-slate-100">
                <strong className="block text-sm font-semibold text-slate-950">Nadia Toussaint</strong>
                Formatrice, Haiti Tech Academy · Montréal
              </footer>
            </blockquote>
          </div>
        </div>
      </section>
    </div>
  );
};
