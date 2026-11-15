import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Lock, ShieldAlert, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateCommissionSplit,
  calculateProviderFeeUsdCents,
  formatMoneyFromUsdCents,
  formatOrderCurrencyCents,
  type Currency,
  type PaymentMethod,
} from '../shared/commerce';

export const CartPage: React.FC = () => {
  const { cart, removeFromCart, currency, t, navigate } = useApp();

  const subtotalUsdCents = cart.reduce((acc, item) => acc + item.priceUsdCents, 0);
  const platformCommission = cart.reduce(
    (acc, item) => acc + calculateCommissionSplit(item.priceUsdCents).platformCommissionUsdCents,
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <h1 className="text-3xl font-display font-bold text-slate-950">{t.cart.title}</h1>

      {cart.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <p className="text-base text-slate-700">{t.cart.empty}</p>
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            {t.cart.browseCatalog}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {cart.map((item) => (
              <div key={item.id} className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-950 truncate">{item.title}</h2>
                    <p className="text-xs text-slate-500">{item.storeName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-950">
                    {formatMoneyFromUsdCents(item.priceUsdCents, currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`${t.cart.remove} ${item.title}`}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-display font-bold text-slate-950">Résumé</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">{t.cart.subtotal}</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {formatMoneyFromUsdCents(subtotalUsdCents, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{t.cart.platformFeeIncluded}</span>
                <span className="font-mono tabular-nums">
                  {formatMoneyFromUsdCents(platformCommission, currency)}
                </span>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                {t.cart.providerFeeSeparate}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {t.cart.proceedCheckout}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

export const CheckoutPage: React.FC = () => {
  const { cart, clearCart, user, currency, setCurrency, paymentGateways, t, navigate, showToast } = useApp();
  const [buyerName, setBuyerName] = useState(user?.fullName || '');
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('moncash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-slate-950">Votre panier est vide</h1>
        <button
          type="button"
          onClick={() => navigate('/catalog')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
        >
          Parcourir le catalogue
        </button>
      </div>
    );
  }

  const subtotalUsdCents = cart.reduce((acc, p) => acc + p.priceUsdCents, 0);
  const platformFeeUsdCents = cart.reduce(
    (acc, p) => acc + calculateCommissionSplit(p.priceUsdCents).platformCommissionUsdCents,
    0
  );
  const selectedGateway = paymentGateways.find((g) => g.provider === paymentMethod);
  const providerFeeUsdCents = selectedGateway
    ? calculateProviderFeeUsdCents(
        subtotalUsdCents,
        selectedGateway.feePercentScaled,
        selectedGateway.feeFixedUsdCents
      )
    : 0;
  const totalUsdCents = subtotalUsdCents + providerFeeUsdCents;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName,
          buyerEmail,
          currency,
          paymentMethod,
          productIds: cart.map((p) => p.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible de créer la commande.');
        return;
      }
      clearCart();
      showToast('Référence de paiement générée.', 'success');
      navigate(`/order/${data.order.orderNumber}`);
    } catch {
      setError('Erreur réseau lors de la création de commande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-950">{t.checkout.title}</h1>
        <p className="text-sm text-slate-600 mt-1">{t.checkout.guestAllowed}</p>
      </div>

      {error && (
        <div role="alert" className="p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-slate-950">1. Coordonnées de livraison numérique</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-name" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.checkout.buyerName}
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="checkout-email" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.checkout.buyerEmail}
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="checkout-currency" className="block text-xs font-medium text-slate-700 mb-1">
                Devise d&apos;affichage / règlement
              </label>
              <select
                id="checkout-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              >
                <option value="USD">USD ($)</option>
                <option value="HTG">HTG (Gourdes)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-slate-950">2. {t.checkout.selectPayment}</h2>
            <div className="space-y-3">
              {paymentGateways.map((gw) => (
                <label
                  key={gw.provider}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === gw.provider
                      ? 'border-blue-600 bg-blue-50/40'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={gw.provider}
                    checked={paymentMethod === gw.provider}
                    disabled={!gw.isEnabled}
                    onChange={() => setPaymentMethod(gw.provider)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-950">{gw.displayName}</span>
                      <span className="text-xs font-mono text-slate-500">
                        {gw.mode === 'production'
                          ? gw.isConfigured
                            ? t.checkout.productionBadge
                            : t.checkout.awaitingConfigBadge
                          : t.checkout.sandboxBadge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{gw.instructions}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t.checkout.neverTrustScreenshot}</span>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-display font-bold text-slate-950">Détail transparent des frais</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {cart.map((item) => (
              <li key={item.id} className="py-2.5 flex justify-between gap-3">
                <span className="text-slate-700 truncate">{item.title}</span>
                <span className="font-mono tabular-nums text-slate-950 shrink-0">
                  {formatMoneyFromUsdCents(item.priceUsdCents, currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="pt-3 border-t border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Sous-total produits</span>
              <span className="font-mono tabular-nums font-medium">
                {formatMoneyFromUsdCents(subtotalUsdCents, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Dont commission plateforme (5 %)</span>
              <span className="font-mono tabular-nums">
                {formatMoneyFromUsdCents(platformFeeUsdCents, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Frais prestataire ({selectedGateway?.displayName || paymentMethod})</span>
              <span className="font-mono tabular-nums">
                + {formatMoneyFromUsdCents(providerFeeUsdCents, currency)}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-bold text-slate-950">
              <span>Total à régler</span>
              <span className="font-mono tabular-nums">
                {formatMoneyFromUsdCents(totalUsdCents, currency)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            {loading ? 'Initialisation...' : t.checkout.confirmOrder}
          </button>
        </aside>
      </form>
    </div>
  );
};

interface OrderDetailPayload {
  order: {
    id: number;
    orderNumber: string;
    buyerName: string;
    buyerEmail: string;
    currency: Currency;
    subtotalUsdCents: number;
    platformFeeUsdCents: number;
    providerFeeUsdCents: number;
    totalUsdCents: number;
    totalDisplayCents: number;
    paymentMethod: PaymentMethod;
    paymentStatus: string;
    paymentReference: string;
    providerTransactionId: string | null;
    createdAt: string;
    confirmedAt: string | null;
  };
  items: Array<{
    id: number;
    productId: number;
    productTitle: string;
    grossUsdCents: number;
    platformCommissionUsdCents: number;
    sellerNetUsdCents: number;
  }>;
  paymentIntent: {
    provider: PaymentMethod;
    environment: 'sandbox' | 'production';
    isConfigured: boolean;
    status: string;
    paymentReference: string;
    exactAmountUsd: string;
    exactAmountDisplay: string;
    qrCodeDataUrl: string | null;
    merchantAddress: string | null;
    networkLabel: string | null;
    instructions: string;
  } | null;
  downloadLinks: Array<{
    productId: number;
    productTitle: string;
    token: string;
    expiresAt: string;
    downloadsLeft: number;
  }>;
}

export const OrderConfirmationPage: React.FC<{ orderNumber: string }> = ({ orderNumber }) => {
  const { showToast, navigate } = useApp();
  const [data, setData] = useState<OrderDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [txInput, setTxInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadOrder = () => {
    setLoading(true);
    fetch(`/api/orders/${encodeURIComponent(orderNumber)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrder();
  }, [orderNumber]);

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionHashOrId: txInput }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Vérification en attente ou échouée.', 'error');
      } else if (json.confirmed) {
        showToast('Paiement vérifié et liens de téléchargement générés !', 'success');
        loadOrder();
      } else {
        showToast(json.message || 'Vérification en attente de webhook.', 'info');
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-slate-950">Commande introuvable</h1>
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

  const { order, items, paymentIntent, downloadLinks } = data;
  const isConfirmed = order.paymentStatus === 'confirmed';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-mono text-slate-500">Commande #{order.orderNumber}</p>
            <h1 className="text-2xl font-display font-bold text-slate-950 mt-1">
              {isConfirmed ? 'Commande confirmée et livrée' : 'Paiement en attente de vérification'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Acheteur : {order.buyerName} ({order.buyerEmail})
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                isConfirmed ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {isConfirmed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Confirmée
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  En attente
                </>
              )}
            </span>
            <div className="font-mono text-lg font-bold tabular-nums text-slate-950 mt-1">
              {formatOrderCurrencyCents(order.totalDisplayCents, order.currency)}
            </div>
          </div>
        </div>

        {/* If NOT confirmed, show real payment rail instructions, QR Code, unique reference, BEP20 address & verification */}
        {!isConfirmed && paymentIntent && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start bg-slate-50 border border-slate-200 rounded-xl p-5">
            {paymentIntent.qrCodeDataUrl && (
              <div className="md:col-span-4 flex flex-col items-center bg-white border border-slate-200 rounded-xl p-4">
                <img
                  src={paymentIntent.qrCodeDataUrl}
                  alt={`QR Code ${paymentIntent.provider}`}
                  className="w-44 h-44"
                />
                <span className="text-xs font-mono text-slate-500 mt-2">
                  Réf : {paymentIntent.paymentReference}
                </span>
              </div>
            )}

            <div className="md:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-display font-semibold text-slate-950">
                  Passerelle : {paymentIntent.provider.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-slate-600">
                  {paymentIntent.environment === 'production'
                    ? paymentIntent.isConfigured
                      ? 'Mode Production'
                      : 'En attente de configuration API'
                    : 'Mode Test / Sandbox'}
                </span>
              </div>

              <p className="text-sm text-slate-700">{paymentIntent.instructions}</p>

              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs font-mono">
                <div>
                  Montant exact USD : <strong>${paymentIntent.exactAmountUsd} USD</strong> ({paymentIntent.exactAmountDisplay})
                </div>
                <div>
                  Référence unique : <strong>{paymentIntent.paymentReference}</strong>
                </div>
                {paymentIntent.merchantAddress && (
                  <div className="break-all">
                    Adresse BEP20 officielle : <strong>{paymentIntent.merchantAddress}</strong>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerifyPayment} className="space-y-3 pt-2">
                <div>
                  <label htmlFor="tx-verify-input" className="block text-xs font-medium text-slate-700 mb-1">
                    {order.paymentMethod === 'usdt_bep20'
                      ? 'Hash de transaction on-chain BSC BEP20 (0x...)'
                      : 'ID de transaction fournisseur (ou validation Sandbox)'}
                  </label>
                  <input
                    id="tx-verify-input"
                    type="text"
                    required={order.paymentMethod === 'usdt_bep20'}
                    value={txInput}
                    onChange={(e) => setTxInput(e.target.value)}
                    placeholder={
                      order.paymentMethod === 'usdt_bep20'
                        ? '0x...'
                        : 'Optionnel en mode Sandbox (ex: MC-TEST-991)'
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {verifying
                    ? 'Vérification serveur...'
                    : paymentIntent.environment === 'sandbox'
                      ? 'Vérifier la transaction (Mode Test)'
                      : 'Vérifier le paiement côté serveur'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Confirmed Temporary Download Links */}
        {isConfirmed && (
          <div className="space-y-4">
            <h2 className="text-lg font-display font-bold text-slate-950">
              Vos téléchargements sécurisés (liens temporaires 48h)
            </h2>
            <div className="space-y-3">
              {downloadLinks.map((dl) => (
                <div
                  key={dl.productId}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{dl.productTitle}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      Expire le {new Date(dl.expiresAt).toLocaleString('fr-FR')} · {dl.downloadsLeft} téléchargements restants
                    </div>
                  </div>
                  <a
                    href={`/api/download/${encodeURIComponent(dl.token)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    <span>Télécharger le fichier</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoice Breakdown */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <h2 className="text-sm font-display font-semibold text-slate-950">Facture &amp; répartition transparente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-4">Produit</th>
                  <th className="py-2 px-3 text-right">Prix</th>
                  <th className="py-2 px-3 text-right">Commission 5 %</th>
                  <th className="py-2 pl-3 text-right">Net Vendeur (95 %)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{item.productTitle}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      ${(item.grossUsdCents / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                      ${(item.platformCommissionUsdCents / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-slate-700">
                      ${(item.sellerNetUsdCents / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-slate-500 flex justify-between pt-2">
            <span>Frais prestataire affichés séparément ({order.paymentMethod})</span>
            <span className="font-mono tabular-nums">${(order.providerFeeUsdCents / 100).toFixed(2)} USD</span>
          </div>
        </div>
      </div>
    </div>
  );
};
