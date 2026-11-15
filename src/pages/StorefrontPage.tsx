import React, { useEffect, useState } from 'react';
import { CheckCircle2, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard, type ProductCardData } from '../components/ProductCard';

interface StoreFull {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  accentColor: string;
  bannerUrl: string;
  avatarUrl: string;
  country: string;
  isVerified: boolean;
}

export const StoresDirectoryPage: React.FC = () => {
  const { navigate } = useApp();
  const [stores, setStores] = useState<Array<StoreFull & { productsCount: number; totalSales: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stores')
      .then((res) => res.json())
      .then((data) => setStores(data.stores || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-950">Boutiques créateurs</h1>
          <p className="text-sm text-slate-600 mt-1">
            Explorez les vitrines numériques officielles hébergées sur Masseillan Global Digital.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/register?seller=1')}
          className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
        >
          Ouvrir ma boutique
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stores.map((st) => (
            <article key={st.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={st.avatarUrl || '/src/assets/images/product_ebook_mastery_1794684628002.jpg'}
                    alt={st.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-display font-semibold text-slate-950">{st.name}</h2>
                      {st.isVerified && <CheckCircle2 className="w-4 h-4 text-blue-600" aria-label="Boutique vérifiée" />}
                    </div>
                    <p className="text-xs font-mono text-slate-500">/store/{st.slug}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{st.tagline}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="tabular-nums">{st.productsCount} produits · {st.totalSales} ventes</span>
                <button
                  type="button"
                  onClick={() => navigate(`/store/${st.slug}`)}
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Visiter →
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export const StorefrontPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { navigate } = useApp();
  const [store, setStore] = useState<StoreFull | null>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stores/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStore(data.store);
          setProducts(
            (data.products || []).map((p: ProductCardData) => ({
              ...p,
              storeName: data.store.name,
              storeSlug: data.store.slug,
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-slate-950">Boutique introuvable</h1>
        <button
          type="button"
          onClick={() => navigate('/stores')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
        >
          Voir les boutiques
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 pb-16">
      {/* Beacons-inspired Personalized Creator Banner */}
      <section className="bg-[#0B1221] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-start md:items-center gap-8">
          <img
            src={store.avatarUrl || '/src/assets/images/product_ebook_mastery_1794684628002.jpg'}
            alt={store.name}
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-700 shrink-0"
          />
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-display font-bold text-white">{store.name}</h1>
              {store.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-400">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Boutique vérifiée
                </span>
              )}
            </div>
            <p className="text-base text-slate-200">{store.tagline}</p>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">{store.bio}</p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                masseillanglobal.com/store/{store.slug}
              </span>
              <span>· Pays : {store.country}</span>
              <span>· {products.length} produits publiés</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        <h2 className="text-xl font-display font-bold text-slate-950 mb-6">
          Catalogue de {store.name}
        </h2>
        {products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
            Ce créateur n&apos;a pas encore publié de produits numériques.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
