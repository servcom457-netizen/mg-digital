import React, { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateCommissionSplit, formatMoneyFromUsdCents, type Currency, type Language } from '../shared/commerce';

type SellerTab = 'overview' | 'products' | 'sales' | 'wallet' | 'reviews' | 'store' | 'settings';

interface SellerOverviewPayload {
  store: {
    id: number;
    slug: string;
    name: string;
    tagline: string;
    bio: string;
    accentColor: string;
    country: string;
  } | null;
  wallet: {
    availableUsdCents: number;
    pendingUsdCents: number;
    totalEarnedUsdCents: number;
    totalWithdrawnUsdCents: number;
  };
  products: Array<{
    id: number;
    title: string;
    description: string;
    priceUsdCents: number;
    coverUrl: string;
    fileName: string;
    productType: string;
    salesCount: number;
    status: string;
    categoryId: number;
  }>;
  sales: Array<{
    id: number;
    orderNumber: string;
    buyerName: string;
    buyerEmail: string;
    paymentMethod: string;
    paymentStatus: string;
    productTitle: string;
    grossUsdCents: number;
    platformCommissionUsdCents: number;
    sellerNetUsdCents: number;
    createdAt: string;
  }>;
  walletHistory: Array<{
    id: number;
    type: string;
    amountUsdCents: number;
    commissionUsdCents: number;
    description: string;
    createdAt: string;
  }>;
  withdrawals: Array<{
    id: number;
    amountUsdCents: number;
    payoutMethod: string;
    payoutDestination: string;
    status: string;
    payoutReference: string;
    requestedAt: string;
  }>;
  reviews: Array<{
    id: number;
    authorName: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
}

const COVER_PRESETS = [
  { label: 'Ebook / Livre numérique', url: '/src/assets/images/product_ebook_mastery_1794684628002.jpg' },
  { label: 'Templates Canva / Design', url: '/src/assets/images/product_canva_templates_1794684627701.jpg' },
  { label: 'Logiciels / Packs IA', url: '/src/assets/images/product_ai_prompts_1794684628665.jpg' },
  { label: 'Formations Vidéo / Audio', url: '/src/assets/images/product_video_course_1794684628439.jpg' },
];

export const SellerDashboardPage: React.FC = () => {
  const { user, token, categories, currency, setCurrency, lang, setLang, setAuthSession, store: ctxStore, navigate, showToast } = useApp();
  const [tab, setTab] = useState<SellerTab>('overview');
  const [data, setData] = useState<SellerOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState(user?.fullName || '');

  // Add Product Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pTitle, setPTitle] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPriceUsd, setPPriceUsd] = useState('20');
  const [pCategoryId, setPCategoryId] = useState<number>(0);
  const [pCoverUrl, setPCoverUrl] = useState(COVER_PRESETS[0].url);
  const [pFile, setPFile] = useState<File | null>(null);

  // Edit Product State
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriceUsd, setEditPriceUsd] = useState('');

  // Withdrawal Form State
  const [wdAmount, setWdAmount] = useState('10');
  const [wdMethod, setWdMethod] = useState('moncash');
  const [wdDest, setWdDest] = useState('');

  // Store Customization State
  const [sName, setSName] = useState('');
  const [sSlug, setSSlug] = useState('');
  const [sTagline, setSTagline] = useState('');
  const [sBio, setSBio] = useState('');
  const [sAccent, setSAccent] = useState('#2563EB');
  const [sCountry, setSCountry] = useState('HT');

  const loadOverview = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/seller/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as SellerOverviewPayload;
        setData(json);
        if (json.store) {
          setSName(json.store.name);
          setSSlug(json.store.slug);
          setSTagline(json.store.tagline);
          setSBio(json.store.bio);
          setSAccent(json.store.accentColor);
          setSCountry(json.store.country);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categories.length > 0 && pCategoryId === 0) {
      setPCategoryId(categories[0].id);
    }
  }, [categories, pCategoryId]);

  useEffect(() => {
    loadOverview();
  }, [token]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-slate-950">Espace Vendeur</h1>
        <p className="text-sm text-slate-600">Connectez-vous ou créez un compte vendeur pour gérer votre boutique.</p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg">
            Connexion
          </button>
          <button type="button" onClick={() => navigate('/register?seller=1')} className="px-4 py-2 text-sm font-semibold text-slate-800 border border-slate-300 rounded-lg">
            Créer ma boutique
          </button>
        </div>
      </div>
    );
  }

  if (user.role === 'buyer') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-slate-950">Activez votre boutique vendeur</h1>
        <p className="text-sm text-slate-600">Votre compte actuel est un compte acheteur. Créez votre boutique gratuitement en 1 clic.</p>
        <button
          type="button"
          onClick={() => navigate('/register?seller=1')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
        >
          Créer ma boutique
        </button>
      </div>
    );
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', pTitle);
    formData.append('description', pDesc);
    formData.append('priceUsd', pPriceUsd);
    formData.append('categoryId', String(pCategoryId));
    formData.append('coverUrl', pCoverUrl);
    const chosenCat = categories.find((c) => c.id === pCategoryId);
    formData.append('productType', chosenCat?.slug || 'ebook_pdf');
    if (pFile) {
      formData.append('file', pFile);
    }

    const res = await fetch('/api/seller/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Erreur création produit.', 'error');
      return;
    }
    showToast('Produit numérique publié dans votre boutique.', 'success');
    setPTitle('');
    setPDesc('');
    setPFile(null);
    setShowAddProduct(false);
    loadOverview();
  };

  const handleSaveEditProduct = async (id: number) => {
    const res = await fetch(`/api/seller/products/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: editTitle, priceUsd: Number(editPriceUsd) }),
    });
    if (res.ok) {
      showToast('Produit mis à jour.', 'success');
      setEditingProductId(null);
      loadOverview();
    } else {
      showToast('Échec de la mise à jour.', 'error');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await fetch(`/api/seller/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Produit retiré.', 'info');
      loadOverview();
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/seller/withdrawals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amountUsd: Number(wdAmount),
        payoutMethod: wdMethod,
        payoutDestination: wdDest,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Erreur demande de retrait.', 'error');
      return;
    }
    showToast('Demande de retrait enregistrée pour traitement administrateur.', 'success');
    setWdDest('');
    loadOverview();
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/seller/store', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: sName,
        slug: sSlug,
        tagline: sTagline,
        bio: sBio,
        accentColor: sAccent,
        country: sCountry,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Erreur mise à jour boutique.', 'error');
      return;
    }
    showToast('Vitrine personnalisée enregistrée.', 'success');
    loadOverview();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: profileName,
        preferredLang: lang,
        preferredCurrency: currency,
      }),
    });
    const json = await res.json();
    if (res.ok && json.user) {
      setAuthSession(token, json.user, ctxStore);
      showToast('Paramètres du compte enregistrés.', 'success');
    } else {
      showToast(json.error || 'Erreur mise à jour profil.', 'error');
    }
  };

  const pricePreviewCents = Math.max(0, Math.round((Number(pPriceUsd) || 0) * 100));
  const previewSplit = calculateCommissionSplit(pricePreviewCents);

  const confirmedSales = (data?.sales || []).filter((s) => s.paymentStatus === 'confirmed');
  const totalGrossCents = confirmedSales.reduce((acc, s) => acc + s.grossUsdCents, 0);
  const totalCommissionsCents = confirmedSales.reduce((acc, s) => acc + s.platformCommissionUsdCents, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 shrink-0 space-y-2">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="text-xs font-medium text-slate-500">Studio Créateur</div>
            <div className="font-display font-bold text-slate-950 truncate">{data?.store?.name || user.fullName}</div>
            {data?.store && (
              <button
                type="button"
                onClick={() => navigate(`/store/${data.store!.slug}`)}
                className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 hover:underline pt-1"
              >
                <span>/store/{data.store.slug}</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>

          <nav aria-label="Menu vendeur" className="bg-white border border-slate-200 rounded-xl p-2 space-y-1">
            {(
              [
                ['overview', 'Vue générale'],
                ['products', 'Mes produits'],
                ['sales', 'Ventes & Commissions 5 %'],
                ['wallet', 'Portefeuille & Retraits'],
                ['reviews', 'Avis clients'],
                ['store', 'Ma boutique'],
                ['settings', 'Paramètres du compte'],
              ] as Array<[SellerTab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`w-full text-left px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === key ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {loading && !data ? (
            <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ) : (
            <>
              {tab === 'overview' && data && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-2xl font-display font-bold text-slate-950">Tableau de bord vendeur</h1>
                    <button
                      type="button"
                      onClick={() => {
                        setTab('products');
                        setShowAddProduct(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      <span>Ajouter un produit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs text-slate-500">Solde disponible</div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-slate-950 mt-1">
                        {formatMoneyFromUsdCents(data.wallet.availableUsdCents, currency)}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs text-slate-500">Revenus nets cumulés (95 %)</div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-slate-950 mt-1">
                        {formatMoneyFromUsdCents(data.wallet.totalEarnedUsdCents, currency)}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs text-slate-500">Commissions plateforme (5 %)</div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-slate-700 mt-1">
                        {formatMoneyFromUsdCents(totalCommissionsCents, currency)}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs text-slate-500">Ventes confirmées</div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-slate-950 mt-1">
                        {confirmedSales.length}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-1">
                        Brut : ${(totalGrossCents / 100).toFixed(2)} USD
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                      <h2 className="font-display font-semibold text-slate-950">Activité récente des ventes</h2>
                      <button
                        type="button"
                        onClick={() => setTab('sales')}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Voir tout →
                      </button>
                    </div>
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th className="py-3 px-4">Commande</th>
                          <th className="py-3 px-4">Produit</th>
                          <th className="py-3 px-4 text-right">Brut</th>
                          <th className="py-3 px-4 text-right">Commission 5 %</th>
                          <th className="py-3 px-4 text-right">Net Vendeur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.sales.slice(0, 5).map((s) => (
                          <tr key={s.id}>
                            <td className="py-2.5 px-4 font-mono text-xs">{s.orderNumber}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-900">{s.productTitle}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">${(s.grossUsdCents / 100).toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">-${(s.platformCommissionUsdCents / 100).toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">${(s.sellerNetUsdCents / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'products' && data && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-display font-bold text-slate-950">Mes produits numériques</h1>
                    <button
                      type="button"
                      onClick={() => setShowAddProduct((v) => !v)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      <span>{showAddProduct ? 'Fermer le formulaire' : 'Nouveau produit'}</span>
                    </button>
                  </div>

                  {showAddProduct && (
                    <form onSubmit={handleCreateProduct} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                      <h2 className="text-lg font-display font-bold text-slate-950">Publier un nouveau produit</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="prod-title" className="block text-xs font-medium text-slate-700 mb-1">Nom du produit</label>
                          <input
                            id="prod-title"
                            type="text"
                            required
                            value={pTitle}
                            onChange={(e) => setPTitle(e.target.value)}
                            placeholder="Ex: Guide Pratique Exportation"
                            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label htmlFor="prod-cat" className="block text-xs font-medium text-slate-700 mb-1">Catégorie</label>
                          <select
                            id="prod-cat"
                            value={pCategoryId}
                            onChange={(e) => setPCategoryId(Number(e.target.value))}
                            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.nameFr}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="prod-price" className="block text-xs font-medium text-slate-700 mb-1">Prix (USD)</label>
                          <input
                            id="prod-price"
                            type="number"
                            min="1"
                            step="0.5"
                            required
                            value={pPriceUsd}
                            onChange={(e) => setPPriceUsd(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                          />
                          <p className="text-xs text-slate-500 mt-1 font-mono">
                            Commission 5 % : ${(previewSplit.platformCommissionUsdCents / 100).toFixed(2)} · Net vendeur : ${(previewSplit.sellerNetUsdCents / 100).toFixed(2)} USD
                          </p>
                        </div>
                        <div>
                          <label htmlFor="prod-cover" className="block text-xs font-medium text-slate-700 mb-1">Image de couverture</label>
                          <select
                            id="prod-cover"
                            value={pCoverUrl}
                            onChange={(e) => setPCoverUrl(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                          >
                            {COVER_PRESETS.map((cp) => (
                              <option key={cp.url} value={cp.url}>{cp.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="prod-desc" className="block text-xs font-medium text-slate-700 mb-1">Description détaillée</label>
                        <textarea
                          id="prod-desc"
                          required
                          rows={3}
                          value={pDesc}
                          onChange={(e) => setPDesc(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label htmlFor="prod-file" className="block text-xs font-medium text-slate-700 mb-1">
                          Fichier numérique téléchargeable (PDF, ZIP, DOCX, XLSX, MP3, MP4 — max 25 Mo)
                        </label>
                        <input
                          id="prod-file"
                          type="file"
                          onChange={(e) => setPFile(e.target.files?.[0] || null)}
                          className="text-sm text-slate-600"
                        />
                      </div>

                      <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                        Publier le produit
                      </button>
                    </form>
                  )}

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th className="py-3 px-4">Produit</th>
                          <th className="py-3 px-4 text-right">Prix USD</th>
                          <th className="py-3 px-4 text-right">Ventes</th>
                          <th className="py-3 px-4">Statut</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.products
                          .filter((p) => p.status !== 'removed')
                          .map((p) => (
                            <tr key={p.id}>
                              <td className="py-3 px-4 font-medium text-slate-950">
                                {editingProductId === p.id ? (
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="px-2 py-1 text-sm border border-slate-300 rounded"
                                  />
                                ) : (
                                  p.title
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums">
                                {editingProductId === p.id ? (
                                  <input
                                    type="number"
                                    value={editPriceUsd}
                                    onChange={(e) => setEditPriceUsd(e.target.value)}
                                    className="w-20 px-2 py-1 text-sm border border-slate-300 rounded text-right"
                                  />
                                ) : (
                                  `$${(p.priceUsdCents / 100).toFixed(2)}`
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums">{p.salesCount}</td>
                              <td className="py-3 px-4 text-xs text-slate-600">{p.status}</td>
                              <td className="py-3 px-4 text-right">
                                {editingProductId === p.id ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditProduct(p.id)}
                                    className="text-xs font-semibold text-blue-600 mr-3"
                                  >
                                    Enregistrer
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProductId(p.id);
                                      setEditTitle(p.title);
                                      setEditPriceUsd(String(p.priceUsdCents / 100));
                                    }}
                                    aria-label={`Modifier ${p.title}`}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 mr-1"
                                  >
                                    <Pencil className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p.id)}
                                  aria-label={`Supprimer ${p.title}`}
                                  className="p-1.5 text-slate-500 hover:text-rose-600"
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'sales' && data && (
                <div className="space-y-4">
                  <h1 className="text-2xl font-display font-bold text-slate-950">Ventes, Commandes &amp; Commissions 5 %</h1>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th className="py-3 px-4">Commande</th>
                          <th className="py-3 px-4">Produit</th>
                          <th className="py-3 px-4">Statut</th>
                          <th className="py-3 px-4 text-right">Brut</th>
                          <th className="py-3 px-4 text-right">Commission 5 %</th>
                          <th className="py-3 px-4 text-right">Net Vendeur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.sales.map((s) => (
                          <tr key={s.id}>
                            <td className="py-3 px-4 font-mono text-xs">{s.orderNumber}</td>
                            <td className="py-3 px-4 font-medium text-slate-900">{s.productTitle}</td>
                            <td className="py-3 px-4 text-xs">{s.paymentStatus}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">${(s.grossUsdCents / 100).toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">-${(s.platformCommissionUsdCents / 100).toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">${(s.sellerNetUsdCents / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'wallet' && data && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-display font-bold text-slate-950">Mon Portefeuille &amp; Retraits</h1>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs text-slate-500">Disponible pour retrait</div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-slate-950 mt-1">
                        ${(data.wallet.availableUsdCents / 100).toFixed(2)} USD
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs text-slate-500">Retraits en attente</div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-amber-700 mt-1">
                        ${(data.wallet.pendingUsdCents / 100).toFixed(2)} USD
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs text-slate-500">Total déjà versé</div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-emerald-700 mt-1">
                        ${(data.wallet.totalWithdrawnUsdCents / 100).toFixed(2)} USD
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleRequestWithdrawal} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-display font-bold text-slate-950">Demander un retrait</h2>
                    <p className="text-xs text-slate-600">
                      Les demandes sont vérifiées par l&apos;administrateur puis versées manuellement ou via prestataire avec enregistrement de la référence de paiement.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="wd-amount" className="block text-xs font-medium text-slate-700 mb-1">Montant (USD, min $5)</label>
                        <input
                          id="wd-amount"
                          type="number"
                          min="5"
                          step="0.5"
                          required
                          value={wdAmount}
                          onChange={(e) => setWdAmount(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label htmlFor="wd-method" className="block text-xs font-medium text-slate-700 mb-1">Mode de versement</label>
                        <select
                          id="wd-method"
                          value={wdMethod}
                          onChange={(e) => setWdMethod(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                        >
                          <option value="moncash">MonCash (Digicel)</option>
                          <option value="natcash">NatCash (Natcom)</option>
                          <option value="paypal">PayPal</option>
                          <option value="usdt_bep20">USDT BEP20 (BSC)</option>
                          <option value="bank_transfer">Virement bancaire</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="wd-dest" className="block text-xs font-medium text-slate-700 mb-1">Destination (Téléphone, Email ou 0x...)</label>
                        <input
                          id="wd-dest"
                          type="text"
                          required
                          value={wdDest}
                          onChange={(e) => setWdDest(e.target.value)}
                          placeholder="Ex: +509 3700 0000"
                          className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                      Envoyer la demande de retrait
                    </button>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Méthode</th>
                          <th className="py-3 px-4">Destination</th>
                          <th className="py-3 px-4 text-right">Montant</th>
                          <th className="py-3 px-4">Statut</th>
                          <th className="py-3 px-4">Référence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.withdrawals.map((w) => (
                          <tr key={w.id}>
                            <td className="py-3 px-4 text-xs">{new Date(w.requestedAt).toLocaleDateString('fr-FR')}</td>
                            <td className="py-3 px-4 font-mono text-xs">{w.payoutMethod}</td>
                            <td className="py-3 px-4 font-mono text-xs">{w.payoutDestination}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">${(w.amountUsdCents / 100).toFixed(2)}</td>
                            <td className="py-3 px-4 text-xs">{w.status}</td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-500">{w.payoutReference || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'reviews' && data && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h1 className="text-2xl font-display font-bold text-slate-950">Avis clients reçus</h1>
                  {data.reviews.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun avis client pour le moment.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {data.reviews.map((r) => (
                        <div key={r.id} className="py-3 space-y-1">
                          <div className="flex justify-between text-xs text-slate-500">
                            <strong className="text-slate-900">{r.authorName}</strong>
                            <span className="font-mono">{r.rating}/5</span>
                          </div>
                          <p className="text-sm text-slate-700">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'store' && data && (
                <form onSubmit={handleSaveStore} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h1 className="text-2xl font-display font-bold text-slate-950">Personnalisation de ma boutique</h1>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="store-name" className="block text-xs font-medium text-slate-700 mb-1">Nom de la boutique</label>
                      <input
                        id="store-name"
                        type="text"
                        required
                        value={sName}
                        onChange={(e) => setSName(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="store-slug" className="block text-xs font-medium text-slate-700 mb-1">URL personnalisée (/store/...)</label>
                      <input
                        id="store-slug"
                        type="text"
                        required
                        value={sSlug}
                        onChange={(e) => setSSlug(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="store-tagline" className="block text-xs font-medium text-slate-700 mb-1">Slogan / Accroche</label>
                    <input
                      id="store-tagline"
                      type="text"
                      value={sTagline}
                      onChange={(e) => setSTagline(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="store-bio" className="block text-xs font-medium text-slate-700 mb-1">Biographie créateur</label>
                    <textarea
                      id="store-bio"
                      rows={3}
                      value={sBio}
                      onChange={(e) => setSBio(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="store-accent" className="block text-xs font-medium text-slate-700 mb-1">Couleur d&apos;accent</label>
                      <input
                        id="store-accent"
                        type="color"
                        value={sAccent}
                        onChange={(e) => setSAccent(e.target.value)}
                        className="h-10 w-24 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="store-country" className="block text-xs font-medium text-slate-700 mb-1">Pays</label>
                      <input
                        id="store-country"
                        type="text"
                        value={sCountry}
                        onChange={(e) => setSCountry(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                    Enregistrer la vitrine
                  </button>
                </form>
              )}

              {tab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h1 className="text-2xl font-display font-bold text-slate-950">Paramètres du compte</h1>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="prof-name" className="block text-xs font-medium text-slate-700 mb-1">Nom complet</label>
                      <input
                        id="prof-name"
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-email" className="block text-xs font-medium text-slate-700 mb-1">Adresse email</label>
                      <input
                        id="prof-email"
                        type="email"
                        disabled
                        value={user.email}
                        className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="prof-lang" className="block text-xs font-medium text-slate-700 mb-1">Langue préférée</label>
                      <select
                        id="prof-lang"
                        value={lang}
                        onChange={(e) => setLang(e.target.value as Language)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="ht">Kreyòl Ayisyen</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="prof-currency" className="block text-xs font-medium text-slate-700 mb-1">Devise d&apos;affichage</label>
                      <select
                        id="prof-currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as Currency)}
                        className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="HTG">HTG (Gourdes)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                    Enregistrer mes paramètres
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
