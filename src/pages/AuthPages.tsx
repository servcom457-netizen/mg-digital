import React, { useEffect, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const { navigate, setAuthSession, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Connexion impossible.');
        return;
      }
      setAuthSession(data.token, data.user, data.store);
      showToast(`Bienvenue, ${data.user.fullName}`, 'success');
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'seller') navigate('/seller');
      else navigate('/buyer');
    } catch {
      setError('Erreur réseau lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Échec de la connexion Google.');
        return;
      }
      setAuthSession(data.token, data.user, data.store);
      showToast(`Connecté avec Google (${data.user.email})`, 'success');
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'seller') navigate('/seller');
      else navigate('/buyer');
    } catch {
      setError('Connexion Google annulée ou indisponible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold text-slate-950">Connexion</h1>
          <p className="text-sm text-slate-600">
            Accédez à votre espace acheteur, votre studio vendeur ou l&apos;administration.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-xs font-medium text-slate-700">
              Adresse email
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-700">
                Mot de passe
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="relative py-2">
          <div className="border-t border-slate-200" />
          <span className="bg-white px-2 text-xs text-slate-500 absolute left-1/2 -translate-x-1/2 top-0">
            ou
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 text-sm font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
        >
          Continuer avec Google
        </button>

        <p className="text-xs text-center text-slate-600">
          Pas encore de compte ?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="font-semibold text-blue-600 hover:underline"
          >
            Créer un compte gratuit
          </button>
        </p>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { navigate, route, setAuthSession, showToast, user, token } = useApp();
  const isSellerParam = route.includes('seller=1');
  const [role, setRole] = useState<'buyer' | 'seller'>(isSellerParam ? 'seller' : 'buyer');
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isSellerParam) setRole('seller');
  }, [isSellerParam]);

  // If already logged in as buyer and clicked "Créer ma boutique", allow instant upgrade
  if (user && user.role === 'buyer' && isSellerParam) {
    const handleUpgrade = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        const res = await fetch('/api/auth/upgrade-to-seller', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storeName }),
        });
        const data = await res.json();
        if (res.ok) {
          setAuthSession(data.token || token, data.user, data.store);
          showToast('Votre boutique créateur est prête !', 'success');
          navigate('/seller');
        } else {
          setError(data.error || 'Impossible de créer la boutique.');
        }
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
          <h1 className="text-2xl font-display font-bold text-slate-950">Créer ma boutique vendeur</h1>
          <p className="text-sm text-slate-600">
            Activez votre boutique gratuite liée au compte <strong>{user.email}</strong>.
          </p>
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 rounded-lg">{error}</div>}
          <form onSubmit={handleUpgrade} className="space-y-4">
            <div>
              <label htmlFor="upgrade-store" className="block text-xs font-medium text-slate-700 mb-1">
                Nom de votre boutique
              </label>
              <input
                id="upgrade-store"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: Studio Ayiti Digital"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {loading ? 'Création...' : 'Lancer ma boutique'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role, storeName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Inscription impossible.');
        return;
      }
      setAuthSession(data.token, data.user, data.store);
      showToast('Compte créé avec succès !', 'success');
      navigate(data.user.role === 'seller' || data.user.role === 'admin' ? '/seller' : '/buyer');
    } catch {
      setError('Erreur réseau lors de l’inscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur Google.');
        return;
      }
      setAuthSession(data.token, data.user, data.store);
      showToast('Compte connecté avec Google.', 'success');
      navigate(data.user.role === 'seller' || data.user.role === 'admin' ? '/seller' : '/buyer');
    } catch {
      setError('Inscription Google annulée.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold text-slate-950">Créer un compte</h1>
          <p className="text-sm text-slate-600">
            Rejoignez Masseillan Global Digital gratuitement en tant que vendeur ou acheteur.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setRole('seller')}
            className={`py-2 text-xs font-semibold rounded-md transition-colors ${
              role === 'seller' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
            }`}
          >
            Vendeur (Boutique)
          </button>
          <button
            type="button"
            onClick={() => setRole('buyer')}
            className={`py-2 text-xs font-semibold rounded-md transition-colors ${
              role === 'buyer' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
            }`}
          >
            Acheteur
          </button>
        </div>

        {error && (
          <div role="alert" className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700">
              Nom complet
            </label>
            <input
              id="reg-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Sophia Desrosin"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          {role === 'seller' && (
            <div className="space-y-1.5">
              <label htmlFor="reg-store" className="block text-xs font-medium text-slate-700">
                Nom de votre boutique numérique
              </label>
              <input
                id="reg-store"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: Studio Masseillan"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="block text-xs font-medium text-slate-700">
              Adresse email
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="block text-xs font-medium text-slate-700">
              Mot de passe (8 caractères minimum)
            </label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            {loading ? 'Création du compte...' : role === 'seller' ? 'Créer ma boutique gratuite' : 'Créer mon compte'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={loading}
          className="w-full py-2.5 px-4 text-sm font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
        >
          Continuer avec Google
        </button>

        <p className="text-xs text-center text-slate-600">
          Déjà inscrit ?{' '}
          <button type="button" onClick={() => navigate('/login')} className="font-semibold text-blue-600 hover:underline">
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { navigate, showToast } = useApp();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sandboxHint, setSandboxHint] = useState('');
  const [error, setError] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Erreur lors de la demande.');
      return;
    }
    if (data.sandboxResetCode) {
      setSandboxHint(data.sandboxResetCode);
    }
    setStep('confirm');
    showToast('Demande enregistrée. Vérifiez votre code de réinitialisation.', 'info');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Code invalide ou expiré.');
      return;
    }
    showToast('Mot de passe mis à jour ! Vous pouvez vous connecter.', 'success');
    navigate('/login');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <h1 className="text-2xl font-display font-bold text-slate-950">Réinitialiser le mot de passe</h1>
        {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 rounded-lg">{error}</div>}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-sm text-slate-600">
              Saisissez votre adresse email pour recevoir un code de réinitialisation sécurisé.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Envoyer le code
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {sandboxHint && (
              <div className="p-3 text-xs font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-800">
                Mode Sandbox (sans SMTP) — Code généré : <strong>{sandboxHint}</strong>
              </div>
            )}
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code de réinitialisation"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
            />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe (min 8 car.)"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Valider le nouveau mot de passe
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
