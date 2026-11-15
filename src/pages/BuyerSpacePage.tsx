import React, { useEffect, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatOrderCurrencyCents, type Currency } from '../shared/commerce';

interface BuyerOrderItem {
  id: number;
  orderNumber: string;
  buyerEmail: string;
  currency: Currency;
  totalDisplayCents: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{ id: number; productTitle: string; grossUsdCents: number }>;
  downloadLinks: Array<{ productId: number; productTitle: string; token: string; expiresAt: string }>;
}

export const BuyerSpacePage: React.FC = () => {
  const { user, token, navigate, showToast } = useApp();
  const [lookupEmail, setLookupEmail] = useState(user?.email || '');
  const [orders, setOrders] = useState<BuyerOrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [refundOrderNumber, setRefundOrderNumber] = useState('');
  const [refundEmail, setRefundEmail] = useState(user?.email || '');
  const [refundReason, setRefundReason] = useState('');

  const fetchOrders = async (emailToQuery?: string) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const query = emailToQuery ? `?email=${encodeURIComponent(emailToQuery)}` : '';
      const res = await fetch(`/api/buyer/orders${query}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      setLookupEmail(user.email);
      setRefundEmail(user.email);
      fetchOrders(user.email);
    }
  }, [user?.email, token]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupEmail.trim()) {
      fetchOrders(lookupEmail.trim());
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/refunds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: refundOrderNumber,
        email: refundEmail,
        reason: refundReason,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Demande de remboursement transmise à l’administrateur.', 'success');
      setRefundOrderNumber('');
      setRefundReason('');
    } else {
      showToast(data.error || 'Impossible de soumettre la demande.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-950">Espace Acheteur &amp; Téléchargements</h1>
          <p className="text-sm text-slate-600 mt-1">
            Consultez vos commandes, vos factures et vos liens de téléchargement temporaires sécurisés.
          </p>
        </div>

        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            type="email"
            required
            value={lookupEmail}
            onChange={(e) => setLookupEmail(e.target.value)}
            placeholder="Email utilisé lors de l'achat"
            aria-label="Rechercher vos commandes par email"
            className="px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg w-64"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-950 hover:bg-blue-600 rounded-lg whitespace-nowrap"
          >
            Rechercher
          </button>
        </form>
      </div>

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-medium text-slate-900">Aucune commande trouvée.</p>
          <p className="text-sm text-slate-600">
            Saisissez l&apos;adresse email utilisée lors de votre paiement ou explorez le catalogue.
          </p>
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg"
          >
            Explorer le catalogue
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div key={ord.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-sm font-bold text-slate-950">#{ord.orderNumber}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(ord.createdAt).toLocaleDateString('fr-FR')} · {ord.paymentMethod.toUpperCase()} · Statut :{' '}
                    <strong className={ord.paymentStatus === 'confirmed' ? 'text-emerald-700' : 'text-amber-700'}>
                      {ord.paymentStatus}
                    </strong>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-base font-bold tabular-nums text-slate-950">
                    {formatOrderCurrencyCents(ord.totalDisplayCents, ord.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/order/${ord.orderNumber}`)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <span>Facture / Détails</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {ord.downloadLinks.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-3">
                  {ord.downloadLinks.map((dl) => (
                    <a
                      key={dl.productId}
                      href={`/api/download/${encodeURIComponent(dl.token)}`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Télécharger : {dl.productTitle}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refund Request Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 max-w-2xl space-y-4">
        <h2 className="text-lg font-display font-bold text-slate-950">Demander un remboursement</h2>
        <p className="text-xs text-slate-600">
          Conformément à notre politique de remboursement, indiquez le numéro de commande et le motif technique.
        </p>
        <form onSubmit={handleRefundSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={refundOrderNumber}
              onChange={(e) => setRefundOrderNumber(e.target.value)}
              placeholder="N° de commande (ex: MGD-2026-1001)"
              className="px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
            />
            <input
              type="email"
              required
              value={refundEmail}
              onChange={(e) => setRefundEmail(e.target.value)}
              placeholder="Email de commande"
              className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <textarea
            required
            rows={2}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="Motif de la demande..."
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-950 hover:bg-blue-600 rounded-lg"
          >
            Soumettre la demande
          </button>
        </form>
      </div>
    </div>
  );
};
