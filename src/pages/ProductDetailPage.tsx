import React, { useEffect, useState } from 'react';
import { Flag, FileCheck, ShieldCheck, ShoppingCart, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateCommissionSplit, formatMoneyFromUsdCents } from '../shared/commerce';

interface ProductDetail {
  id: number;
  title: string;
  description: string;
  priceUsdCents: number;
  coverUrl: string;
  fileName: string;
  fileSizeBytes: number;
  productType: string;
  salesCount: number;
  ratingAvgScaled: number;
  reviewsCount: number;
  storeId: number;
  storeSlug: string;
  storeName: string;
  storeTagline: string;
  storeAvatarUrl: string;
  categoryNameFr: string;
}

interface ReviewItem {
  id: number;
  authorName: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export const ProductDetailPage: React.FC<{ productId: number }> = ({ productId }) => {
  const { currency, t, navigate, addToCart, showToast, user } = useApp();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [authorName, setAuthorName] = useState(user?.fullName || '');
  const [authorEmail, setAuthorEmail] = useState(user?.email || '');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportEmail, setReportEmail] = useState(user?.email || '');
  const [reportReason, setReportReason] = useState('Contenu non conforme');
  const [reportDetails, setReportDetails] = useState('');

  const loadProduct = () => {
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setProduct(data.product);
          setReviews(data.reviews || []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-slate-950">Produit introuvable</h1>
        <button
          type="button"
          onClick={() => navigate('/catalog')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
        >
          Retour au catalogue
        </button>
      </div>
    );
  }

  const split = calculateCommissionSplit(product.priceUsdCents);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, authorEmail, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Erreur lors de l’envoi de l’avis.', 'error');
      } else {
        showToast('Avis publié avec succès.', 'success');
        setComment('');
        loadProduct();
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        storeId: product.storeId,
        reporterEmail: reportEmail,
        reason: reportReason,
        details: reportDetails,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Signalement envoyé à l’équipe de modération.', 'success');
      setShowReportModal(false);
      setReportDetails('');
    } else {
      showToast(data.error || 'Erreur lors du signalement.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Cover & Description */}
        <div className="lg:col-span-7 space-y-8">
          <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white">
            <img
              src={product.coverUrl}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-display font-bold text-slate-950">Description détaillée</h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Customer Reviews */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-display font-bold text-slate-950">
              Avis clients ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun avis pour le moment. Soyez le premier à noter ce produit.</p>
            ) : (
              <div className="space-y-5 divide-y divide-slate-100">
                {reviews.map((r) => (
                  <div key={r.id} className="pt-4 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-900">
                        {r.authorName} {r.isVerifiedPurchase ? '· Achat vérifié' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-amber-600 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                        {r.rating}/5
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="pt-6 border-t border-slate-200 space-y-4">
              <h3 className="text-sm font-display font-semibold text-slate-950">{t.product.writeReview}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Votre nom"
                  aria-label="Votre nom"
                  className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="email"
                  required
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  placeholder="Votre email"
                  aria-label="Votre email"
                  className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="review-rating" className="text-xs font-medium text-slate-700">Note :</label>
                <select
                  id="review-rating"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                >
                  <option value={5}>5 / 5</option>
                  <option value={4}>4 / 5</option>
                  <option value={3}>3 / 5</option>
                  <option value={2}>2 / 5</option>
                  <option value={1}>1 / 5</option>
                </select>
              </div>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre retour d'expérience..."
                aria-label="Votre commentaire"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-950 hover:bg-blue-600 rounded-lg transition-colors"
              >
                {submittingReview ? 'Publication...' : 'Publier mon avis'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Sticky Purchase Module */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="text-xs text-slate-500">
                {product.categoryNameFr} · {product.salesCount} {t.product.sales} ·{' '}
                {(product.ratingAvgScaled / 100 || 5).toFixed(1)} ★
              </div>
              <h1 className="text-2xl font-display font-bold text-slate-950 leading-snug">
                {product.title}
              </h1>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="text-3xl font-mono font-bold tabular-nums text-slate-950">
                {formatMoneyFromUsdCents(product.priceUsdCents, currency)}
              </div>
              <p className="text-xs text-slate-500">
                Part créateur (95 %) : ${(split.sellerNetUsdCents / 100).toFixed(2)} USD · Commission plateforme (5 %) : ${(split.platformCommissionUsdCents / 100).toFixed(2)} USD.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  addToCart({
                    id: product.id,
                    title: product.title,
                    priceUsdCents: product.priceUsdCents,
                    coverUrl: product.coverUrl,
                    storeName: product.storeName,
                    storeSlug: product.storeSlug,
                    productType: product.productType,
                  });
                  navigate('/checkout');
                }}
                className="w-full py-3 px-5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {t.product.buyNow}
              </button>

              <button
                type="button"
                onClick={() =>
                  addToCart({
                    id: product.id,
                    title: product.title,
                    priceUsdCents: product.priceUsdCents,
                    coverUrl: product.coverUrl,
                    storeName: product.storeName,
                    storeSlug: product.storeSlug,
                    productType: product.productType,
                  })
                }
                className="w-full py-3 px-5 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                <span>{t.product.addToCart}</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                <span>
                  {t.product.fileInfo} : <strong className="text-slate-900">{product.fileName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                <span>Paiement vérifié : MonCash, NatCash, PayPal &amp; USDT BEP20.</span>
              </div>
            </div>

            {/* Seller card */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={product.storeAvatarUrl || '/src/assets/images/product_ebook_mastery_1794684628002.jpg'}
                  alt={product.storeName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-950">{product.storeName}</div>
                  <div className="text-xs text-slate-500">/store/{product.storeSlug}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/store/${product.storeSlug}`)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
              >
                {t.product.visitStore} →
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600"
              >
                <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.product.reportProduct}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-950">Signaler ce produit</h3>
            <form onSubmit={handleReportSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="Votre email"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="Contenu non conforme">Contenu non conforme</option>
                <option value="Atteinte aux droits d'auteur">Atteinte aux droits d&apos;auteur</option>
                <option value="Fichier corrompu ou trompeur">Fichier corrompu ou trompeur</option>
              </select>
              <textarea
                required
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Expliquez le problème..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Envoyer le signalement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
