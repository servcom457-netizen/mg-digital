import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

type AdminTab = 'overview' | 'withdrawals' | 'payments' | 'users' | 'moderation' | 'audit';

interface AdminPayload {
  kpis: {
    totalUsers: number;
    totalSellers: number;
    totalBuyers: number;
    totalProducts: number;
    totalSales: number;
    grossRevenueUsdCents: number;
    totalCommissionUsdCents: number;
    pendingTransactions: number;
    confirmedTransactions: number;
    failedTransactions: number;
    pendingWithdrawals: number;
  };
  users: Array<{ id: number; email: string; fullName: string; role: string; status: string }>;
  stores: Array<{ id: number; name: string; slug: string; isVerified: boolean; status: string }>;
  products: Array<{ id: number; title: string; priceUsdCents: number; salesCount: number; status: string; storeName: string; categoryName: string }>;
  categories: Array<{ id: number; slug: string; nameFr: string }>;
  orders: Array<{ id: number; orderNumber: string; buyerEmail: string; subtotalUsdCents: number; totalUsdCents: number; platformFeeUsdCents: number; providerFeeUsdCents: number; paymentMethod: string; paymentStatus: string }>;
  withdrawals: Array<{ id: number; sellerName: string; sellerEmail: string; amountUsdCents: number; payoutMethod: string; payoutDestination: string; status: string; payoutReference: string }>;
  refunds: Array<{ id: number; orderId: number; requestedByEmail: string; reason: string; amountUsdCents: number; status: string }>;
  reports: Array<{ id: number; productId: number | null; reporterEmail: string; reason: string; details: string; status: string }>;
  paymentConfigs: Array<{ provider: string; displayName: string; isEnabled: boolean; mode: string; isConfigured: boolean; publicIdentifier: string; feePercentScaled: number }>;
  auditLogs: Array<{ id: number; actorEmail: string; action: string; targetType: string; targetId: string; createdAt: string }>;
}

export const AdminDashboardPage: React.FC = () => {
  const { user, token, navigate, showToast, refreshBootstrap } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutRefs, setPayoutRefs] = useState<Record<number, string>>({});
  const [newCatName, setNewCatName] = useState('');

  const loadAdmin = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, [token]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-slate-950">Accès Administrateur Requis</h1>
        <p className="text-sm text-slate-600">Connectez-vous avec un compte administrateur pour gérer la marketplace.</p>
        <button type="button" onClick={() => navigate('/login')} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg">
          Se connecter
        </button>
      </div>
    );
  }

  const handleWithdrawalAction = async (id: number, status: 'approved' | 'paid' | 'rejected') => {
    const payoutReference = payoutRefs[id] || '';
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, payoutReference }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Action impossible.', 'error');
      return;
    }
    showToast(`Retrait #${id} mis à jour (${status}).`, 'success');
    loadAdmin();
  };

  const handleToggleUserStatus = async (id: number, currentStatus: string) => {
    const next = currentStatus === 'active' ? 'suspended' : 'active';
    const res = await fetch(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      showToast(`Compte ${next === 'suspended' ? 'suspendu' : 'réactivé'}.`, 'info');
      loadAdmin();
    }
  };

  const handleProductModeration = async (id: number, status: string) => {
    const res = await fetch(`/api/admin/products/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast('Statut produit mis à jour.', 'info');
      loadAdmin();
    }
  };

  const handleUpdatePaymentConfig = async (
    provider: string,
    patch: { isEnabled: boolean; mode: string; publicIdentifier: string }
  ) => {
    const res = await fetch(`/api/admin/payment-configs/${provider}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      showToast(`Configuration ${provider} enregistrée.`, 'success');
      await refreshBootstrap();
      loadAdmin();
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nameFr: newCatName }),
    });
    if (res.ok) {
      showToast('Catégorie ajoutée.', 'success');
      setNewCatName('');
      await refreshBootstrap();
      loadAdmin();
    }
  };

  const handleRefundAction = async (id: number, status: string) => {
    const res = await fetch(`/api/admin/refunds/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast(`Remboursement #${id} : ${status}.`, 'info');
      loadAdmin();
    }
  };

  const handleReportAction = async (id: number, status: string) => {
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast('Signalement traité.', 'info');
      loadAdmin();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-950">Tableau de bord Administrateur</h1>
          <p className="text-xs text-slate-500">Supervision globale, commissions de 5 %, retraits et passerelles de paiement.</p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg">
          {(
            [
              ['overview', 'Vue & Commissions'],
              ['withdrawals', 'Retraits'],
              ['payments', 'Passerelles'],
              ['users', 'Utilisateurs & Boutiques'],
              ['moderation', 'Produits & Signalements'],
              ['audit', 'Journal d’audit'],
            ] as Array<[AdminTab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : (
        data && (
          <>
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Utilisateurs (Vendeurs / Acheteurs)</div>
                    <div className="text-xl font-mono font-bold tabular-nums text-slate-950 mt-1">
                      {data.kpis.totalUsers} ({data.kpis.totalSellers}/{data.kpis.totalBuyers})
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Produits actifs</div>
                    <div className="text-xl font-mono font-bold tabular-nums text-slate-950 mt-1">{data.kpis.totalProducts}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Chiffre d&apos;affaires brut</div>
                    <div className="text-xl font-mono font-bold tabular-nums text-slate-950 mt-1">
                      ${(data.kpis.grossRevenueUsdCents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Total Commissions (5 %)</div>
                    <div className="text-xl font-mono font-bold tabular-nums text-blue-600 mt-1">
                      ${(data.kpis.totalCommissionUsdCents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Transactions (OK / Attente / Échec)</div>
                    <div className="text-xl font-mono font-bold tabular-nums text-slate-950 mt-1">
                      {data.kpis.confirmedTransactions} / {data.kpis.pendingTransactions} / {data.kpis.failedTransactions}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                  <div className="px-5 py-4 border-b border-slate-200 font-display font-semibold text-slate-950">
                    Journal des commandes &amp; commissions
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-3 px-4">Commande</th>
                        <th className="py-3 px-4">Acheteur</th>
                        <th className="py-3 px-4">Passerelle</th>
                        <th className="py-3 px-4">Statut</th>
                        <th className="py-3 px-4 text-right">Brut Produit</th>
                        <th className="py-3 px-4 text-right">Commission 5 %</th>
                        <th className="py-3 px-4 text-right">Frais Prestataire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.orders.map((o) => (
                        <tr key={o.id}>
                          <td className="py-2.5 px-4 font-mono text-xs">{o.orderNumber}</td>
                          <td className="py-2.5 px-4 text-xs">{o.buyerEmail}</td>
                          <td className="py-2.5 px-4 font-mono text-xs">{o.paymentMethod}</td>
                          <td className="py-2.5 px-4 text-xs">{o.paymentStatus}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">${((o.subtotalUsdCents ?? o.totalUsdCents) / 100).toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-600">${(o.platformFeeUsdCents / 100).toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">${((o.providerFeeUsdCents ?? 0) / 100).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'withdrawals' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <div className="px-5 py-4 border-b border-slate-200 font-display font-semibold text-slate-950">
                  Gestion des demandes de retrait vendeurs ({data.kpis.pendingWithdrawals} en attente)
                </div>
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-3 px-4">Vendeur</th>
                      <th className="py-3 px-4">Méthode &amp; Destination</th>
                      <th className="py-3 px-4 text-right">Montant</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Référence &amp; Décision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-950">{w.sellerName}</div>
                          <div className="text-xs text-slate-500">{w.sellerEmail}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {w.payoutMethod} · {w.payoutDestination}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                          ${(w.amountUsdCents / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-xs">{w.status}</td>
                        <td className="py-3 px-4">
                          {w.status === 'pending' || w.status === 'approved' ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                placeholder="Réf. virement réelle"
                                value={payoutRefs[w.id] || ''}
                                onChange={(e) => setPayoutRefs({ ...payoutRefs, [w.id]: e.target.value })}
                                className="px-2 py-1 text-xs font-mono border border-slate-300 rounded w-36"
                              />
                              <button
                                type="button"
                                onClick={() => handleWithdrawalAction(w.id, 'paid')}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 rounded"
                              >
                                Marquer payé
                              </button>
                              <button
                                type="button"
                                onClick={() => handleWithdrawalAction(w.id, 'rejected')}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 rounded"
                              >
                                Refuser
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-slate-500">{w.payoutReference || 'Clôturé'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'payments' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.paymentConfigs.map((cfg) => (
                  <div key={cfg.provider} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display font-bold text-slate-950">{cfg.displayName}</h2>
                      <span className="text-xs font-mono text-slate-500">
                        {cfg.isConfigured ? 'Clés serveur détectées' : 'Clés serveur en attente'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cfg.isEnabled}
                          onChange={(e) =>
                            handleUpdatePaymentConfig(cfg.provider, {
                              isEnabled: e.target.checked,
                              mode: cfg.mode,
                              publicIdentifier: cfg.publicIdentifier,
                            })
                          }
                        />
                        <span>Passerelle activée</span>
                      </label>
                      <select
                        value={cfg.mode}
                        onChange={(e) =>
                          handleUpdatePaymentConfig(cfg.provider, {
                            isEnabled: cfg.isEnabled,
                            mode: e.target.value,
                            publicIdentifier: cfg.publicIdentifier,
                          })
                        }
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                      >
                        <option value="sandbox">Mode Test (Sandbox)</option>
                        <option value="production">Mode Production</option>
                      </select>
                    </div>
                    <div className="text-xs font-mono text-slate-600 break-all">
                      Identifiant public : {cfg.publicIdentifier}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                  <div className="px-5 py-3.5 border-b border-slate-200 font-display font-semibold text-slate-950">
                    Comptes utilisateurs ({data.users.length})
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2.5 px-4">Utilisateur</th>
                        <th className="py-2.5 px-4">Rôle</th>
                        <th className="py-2.5 px-4">Statut</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.users.map((u) => (
                        <tr key={u.id}>
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-slate-900">{u.fullName}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </td>
                          <td className="py-2.5 px-4 text-xs font-mono">{u.role}</td>
                          <td className="py-2.5 px-4 text-xs">{u.status}</td>
                          <td className="py-2.5 px-4 text-right">
                            {u.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u.id, u.status)}
                                className="text-xs font-semibold text-blue-600 hover:underline"
                              >
                                {u.status === 'active' ? 'Suspendre' : 'Réactiver'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                  <div className="px-5 py-3.5 border-b border-slate-200 font-display font-semibold text-slate-950">
                    Boutiques ({data.stores.length})
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2.5 px-4">Boutique</th>
                        <th className="py-2.5 px-4">URL</th>
                        <th className="py-2.5 px-4">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.stores.map((s) => (
                        <tr key={s.id}>
                          <td className="py-2.5 px-4 font-medium text-slate-900">{s.name}</td>
                          <td className="py-2.5 px-4 font-mono text-xs">/store/{s.slug}</td>
                          <td className="py-2.5 px-4 text-xs">{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'moderation' && (
              <div className="space-y-6">
                <form onSubmit={handleAddCategory} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nouvelle catégorie (ex: Musique & Beats)"
                    className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg flex-1 min-w-[220px]"
                  />
                  <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg">
                    Ajouter la catégorie
                  </button>
                </form>

                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                  <div className="px-5 py-3.5 border-b border-slate-200 font-display font-semibold text-slate-950">
                    Modération des produits ({data.products.length})
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2.5 px-4">Produit</th>
                        <th className="py-2.5 px-4">Boutique</th>
                        <th className="py-2.5 px-4">Statut</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.products.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-4 font-medium text-slate-900">{p.title}</td>
                          <td className="py-2.5 px-4 text-xs text-slate-600">{p.storeName}</td>
                          <td className="py-2.5 px-4 text-xs">{p.status}</td>
                          <td className="py-2.5 px-4 text-right">
                            {p.status !== 'removed' ? (
                              <button
                                type="button"
                                onClick={() => handleProductModeration(p.id, 'removed')}
                                className="text-xs font-semibold text-rose-600 hover:underline"
                              >
                                Retirer (non conforme)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleProductModeration(p.id, 'published')}
                                className="text-xs font-semibold text-blue-600 hover:underline"
                              >
                                Rétablir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <h2 className="font-display font-semibold text-slate-950">Remboursements ({data.refunds.length})</h2>
                    {data.refunds.length === 0 ? (
                      <p className="text-xs text-slate-500">Aucune demande.</p>
                    ) : (
                      data.refunds.map((rf) => (
                        <div key={rf.id} className="p-3 border border-slate-200 rounded-lg space-y-2 text-xs">
                          <div className="flex justify-between font-medium">
                            <span>{rf.requestedByEmail}</span>
                            <span className="font-mono">${(rf.amountUsdCents / 100).toFixed(2)} · {rf.status}</span>
                          </div>
                          <p className="text-slate-600">{rf.reason}</p>
                          {rf.status === 'pending' && (
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleRefundAction(rf.id, 'processed')} className="text-emerald-700 font-semibold">Approuver &amp; Rembourser</button>
                              <button type="button" onClick={() => handleRefundAction(rf.id, 'rejected')} className="text-rose-600 font-semibold">Refuser</button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <h2 className="font-display font-semibold text-slate-950">Signalements ({data.reports.length})</h2>
                    {data.reports.length === 0 ? (
                      <p className="text-xs text-slate-500">Aucun signalement.</p>
                    ) : (
                      data.reports.map((rp) => (
                        <div key={rp.id} className="p-3 border border-slate-200 rounded-lg space-y-2 text-xs">
                          <div className="flex justify-between font-medium">
                            <span>{rp.reason}</span>
                            <span>{rp.status}</span>
                          </div>
                          <p className="text-slate-600">{rp.details}</p>
                          {rp.status === 'open' && (
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleReportAction(rp.id, 'resolved')} className="text-blue-600 font-semibold">Marquer résolu</button>
                              <button type="button" onClick={() => handleReportAction(rp.id, 'dismissed')} className="text-slate-500 font-semibold">Classer</button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === 'audit' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <div className="px-5 py-3.5 border-b border-slate-200 font-display font-semibold text-slate-950">
                  Journal d&apos;audit de sécurité
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 px-4">Horodatage</th>
                      <th className="py-2.5 px-4">Acteur</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Cible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {data.auditLogs.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2 px-4">{new Date(l.createdAt).toLocaleString('fr-FR')}</td>
                        <td className="py-2 px-4">{l.actorEmail}</td>
                        <td className="py-2 px-4 font-semibold">{l.action}</td>
                        <td className="py-2 px-4">{l.targetType}:{l.targetId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
};
