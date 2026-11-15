import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const TermsPage: React.FC = () => (
  <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
    <h1 className="text-3xl font-display font-bold text-slate-950">Conditions Générales d&apos;Utilisation</h1>
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 text-sm text-slate-700 leading-relaxed">
      <p>
        <strong>1. Objet :</strong> Masseillan Global Digital est une marketplace internationale dédiée à la vente de produits numériques (ebooks, formations vidéo, modèles Canva/Excel/Word, logiciels, audio et packs de prompts IA).
      </p>
      <p>
        <strong>2. Commission de 5 % :</strong> La plateforme prélève automatiquement une commission fixe de 5 % sur chaque vente confirmée. Les frais éventuels des prestataires de paiement (MonCash, NatCash, PayPal, réseau BSC BEP20) sont affichés séparément lors du passage en caisse.
      </p>
      <p>
        <strong>3. Propriété intellectuelle :</strong> Chaque vendeur garantit être l&apos;auteur ou le détenteur des droits de commercialisation des fichiers numériques publiés dans sa boutique.
      </p>
      <p>
        <strong>4. Vérification des paiements :</strong> Aucune commande n&apos;est validée sur la base d&apos;une simple capture d&apos;écran. La livraison s&apos;effectue uniquement après confirmation API, webhook signé ou validation on-chain BEP20.
      </p>
    </div>
  </article>
);

export const PrivacyPage: React.FC = () => (
  <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
    <h1 className="text-3xl font-display font-bold text-slate-950">Politique de Confidentialité</h1>
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 text-sm text-slate-700 leading-relaxed">
      <p>
        Nous collectons uniquement les données nécessaires au traitement des commandes, à l&apos;émission des factures, à la génération des liens de téléchargement temporaires et au versement des revenus vendeurs.
      </p>
      <p>
        Les mots de passe sont chiffrés via dérivation cryptographique `scrypt` avec sel unique. Les clés API et secrets de passerelles de paiement résident exclusivement sur nos serveurs sécurisés.
      </p>
    </div>
  </article>
);

export const RefundPolicyPage: React.FC = () => (
  <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
    <h1 className="text-3xl font-display font-bold text-slate-950">Politique de Remboursement</h1>
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 text-sm text-slate-700 leading-relaxed">
      <p>
        En raison de la nature instantanée des biens numériques téléchargeables, un remboursement est accordé dans un délai de 7 jours lorsque le fichier s&apos;avère corrompu, non conforme à la description ou inaccessible malgré l&apos;assistance technique.
      </p>
      <p>
        Les acheteurs peuvent soumettre une demande directement depuis leur Espace Acheteur avec leur numéro de commande.
      </p>
    </div>
  </article>
);

export const ContactPage: React.FC = () => {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast('Votre message a été envoyé à notre équipe.', 'success');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        showToast(json.error || 'Erreur lors de l’envoi.', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-950">Contactez Masseillan Global Digital</h1>
        <p className="text-sm text-slate-600 mt-1">
          Support vendeurs, assistance acheteurs ou configuration de passerelles de paiement.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom"
            aria-label="Votre nom"
            className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre email"
            aria-label="Votre email"
            className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
          />
        </div>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Objet de votre message"
          aria-label="Objet"
          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
        />
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Comment pouvons-nous vous aider ?"
          aria-label="Message"
          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
        />
        <button
          type="submit"
          disabled={sending}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          {sending ? 'Envoi...' : 'Envoyer le message'}
        </button>
      </form>
    </div>
  );
};
