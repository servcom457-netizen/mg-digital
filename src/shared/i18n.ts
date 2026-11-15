import type { Language } from './commerce';

export interface Translations {
  brandName: string;
  slogan: string;
  nav: {
    catalog: string;
    categories: string;
    stores: string;
    sellerSpace: string;
    buyerSpace: string;
    adminSpace: string;
    login: string;
    createStore: string;
    logout: string;
    cart: string;
  };
  hero: {
    headline: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    statCommission: string;
    statCurrencies: string;
    statMethods: string;
    statDelivery: string;
  };
  sections: {
    categoriesTitle: string;
    categoriesSubtitle: string;
    popularProductsTitle: string;
    popularProductsSubtitle: string;
    topStoresTitle: string;
    topStoresSubtitle: string;
    benefitsTitle: string;
    paymentsTitle: string;
    paymentsSubtitle: string;
    testimonialsTitle: string;
    viewAll: string;
  };
  product: {
    addToCart: string;
    buyNow: string;
    sales: string;
    reviews: string;
    soldBy: string;
    visitStore: string;
    fileInfo: string;
    commissionNote: string;
    writeReview: string;
    reportProduct: string;
  };
  cart: {
    title: string;
    empty: string;
    browseCatalog: string;
    subtotal: string;
    platformFeeIncluded: string;
    providerFeeSeparate: string;
    proceedCheckout: string;
    remove: string;
  };
  checkout: {
    title: string;
    guestAllowed: string;
    buyerName: string;
    buyerEmail: string;
    selectPayment: string;
    confirmOrder: string;
    awaitingConfigBadge: string;
    sandboxBadge: string;
    productionBadge: string;
    neverTrustScreenshot: string;
  };
  footer: {
    terms: string;
    privacy: string;
    refunds: string;
    contact: string;
    copyright: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  fr: {
    brandName: 'Masseillan Global Digital',
    slogan: 'Votre talent mérite un marché mondial.',
    nav: {
      catalog: 'Catalogue',
      categories: 'Catégories',
      stores: 'Boutiques',
      sellerSpace: 'Espace vendeur',
      buyerSpace: 'Mes achats',
      adminSpace: 'Administration',
      login: 'Connexion',
      createStore: 'Créer ma boutique',
      logout: 'Déconnexion',
      cart: 'Panier',
    },
    hero: {
      headline: 'Votre talent mérite un marché mondial.',
      subheadline:
        'Créez votre boutique numérique en quelques minutes et encaissez en USD, HTG ou EUR via MonCash, NatCash, PayPal et USDT BEP20 avec une commission fixe et transparente de 5 %.',
      ctaPrimary: 'Créer ma boutique',
      ctaSecondary: 'Explorer le catalogue',
      statCommission: '5 % de commission fixe',
      statCurrencies: '3 devises (USD · HTG · EUR)',
      statMethods: '4 modes de paiement vérifiés',
      statDelivery: 'Livraison sécurisée & temporaire',
    },
    sections: {
      categoriesTitle: 'Catégories de produits numériques',
      categoriesSubtitle: 'Ebooks, formations vidéo, modèles Canva, packs de prompts IA et logiciels prêts à télécharger.',
      popularProductsTitle: 'Produits populaires',
      popularProductsSubtitle: 'Ressources numériques sélectionnées auprès des meilleurs créateurs.',
      topStoresTitle: 'Meilleures boutiques créateurs',
      topStoresSubtitle: 'Chaque vendeur dispose de sa propre vitrine personnalisée et d’un portefeuille dédié.',
      benefitsTitle: 'Conçu pour Haïti et le marché international',
      paymentsTitle: 'Modes de paiement vérifiés',
      paymentsSubtitle: 'Transactions protégées contre les doubles paiements avec vérification serveur et webhook.',
      testimonialsTitle: 'Ils vendent sur Masseillan Global Digital',
      viewAll: 'Tout voir',
    },
    product: {
      addToCart: 'Ajouter au panier',
      buyNow: 'Acheter maintenant',
      sales: 'ventes',
      reviews: 'avis',
      soldBy: 'Vendu par',
      visitStore: 'Visiter la boutique',
      fileInfo: 'Fichier numérique inclus',
      commissionNote: 'Inclut 5 % de frais plateforme ; frais prestataire affichés séparément au paiement.',
      writeReview: 'Laisser un avis',
      reportProduct: 'Signaler ce produit',
    },
    cart: {
      title: 'Votre panier',
      empty: 'Votre panier numérique est vide.',
      browseCatalog: 'Parcourir le catalogue',
      subtotal: 'Sous-total produits',
      platformFeeIncluded: 'Commission plateforme (5 % incluse dans le prix vendeur)',
      providerFeeSeparate: 'Frais prestataire paiement (estimés séparément)',
      proceedCheckout: 'Passer au paiement',
      remove: 'Retirer',
    },
    checkout: {
      title: 'Finaliser votre commande',
      guestAllowed: 'Achat rapide autorisé sans création de compte.',
      buyerName: 'Nom complet',
      buyerEmail: 'Adresse email de réception',
      selectPayment: 'Choisissez votre mode de paiement',
      confirmOrder: 'Générer la référence de paiement',
      awaitingConfigBadge: 'En attente de configuration API',
      sandboxBadge: 'Mode Test / Sandbox',
      productionBadge: 'Mode Production',
      neverTrustScreenshot: 'Sécurité : un paiement n’est jamais validé sur simple capture d’écran ; vérification API, webhook ou on-chain obligatoire.',
    },
    footer: {
      terms: 'Conditions générales',
      privacy: 'Confidentialité',
      refunds: 'Politique de remboursement',
      contact: 'Contact',
      copyright: '© 2026 Masseillan Global Digital. Tous droits réservés.',
    },
  },
  en: {
    brandName: 'Masseillan Global Digital',
    slogan: 'Your talent deserves a global market.',
    nav: {
      catalog: 'Catalog',
      categories: 'Categories',
      stores: 'Stores',
      sellerSpace: 'Seller Studio',
      buyerSpace: 'My Purchases',
      adminSpace: 'Admin',
      login: 'Sign in',
      createStore: 'Create my store',
      logout: 'Sign out',
      cart: 'Cart',
    },
    hero: {
      headline: 'Your talent deserves a global market.',
      subheadline:
        'Launch your digital storefront in minutes and accept USD, HTG, or EUR via MonCash, NatCash, PayPal, and USDT BEP20 with a transparent flat 5% platform fee.',
      ctaPrimary: 'Create my store',
      ctaSecondary: 'Explore catalog',
      statCommission: '5% flat platform fee',
      statCurrencies: '3 currencies (USD · HTG · EUR)',
      statMethods: '4 verified payment rails',
      statDelivery: 'Protected temporary downloads',
    },
    sections: {
      categoriesTitle: 'Digital Product Categories',
      categoriesSubtitle: 'PDF ebooks, video courses, Canva templates, AI prompt packs, and ready-to-use software.',
      popularProductsTitle: 'Popular Products',
      popularProductsSubtitle: 'Curated digital assets from verified independent creators.',
      topStoresTitle: 'Top Creator Storefronts',
      topStoresSubtitle: 'Every seller gets a custom storefront URL and dedicated internal earnings wallet.',
      benefitsTitle: 'Built for Haiti and International Commerce',
      paymentsTitle: 'Verified Payment Methods',
      paymentsSubtitle: 'Double-payment protection with server-side verification, signed webhooks, and on-chain checks.',
      testimonialsTitle: 'Creators Selling Worldwide',
      viewAll: 'View all',
    },
    product: {
      addToCart: 'Add to cart',
      buyNow: 'Buy now',
      sales: 'sales',
      reviews: 'reviews',
      soldBy: 'Sold by',
      visitStore: 'Visit store',
      fileInfo: 'Digital deliverable included',
      commissionNote: 'Includes 5% platform fee; payment provider fees are shown separately at checkout.',
      writeReview: 'Write a review',
      reportProduct: 'Report product',
    },
    cart: {
      title: 'Your Cart',
      empty: 'Your digital cart is empty.',
      browseCatalog: 'Browse catalog',
      subtotal: 'Products subtotal',
      platformFeeIncluded: 'Platform commission (5% included in seller split)',
      providerFeeSeparate: 'Payment gateway fee (displayed separately)',
      proceedCheckout: 'Proceed to checkout',
      remove: 'Remove',
    },
    checkout: {
      title: 'Complete Your Order',
      guestAllowed: 'Guest checkout supported — no account required to buy.',
      buyerName: 'Full name',
      buyerEmail: 'Delivery email address',
      selectPayment: 'Select payment method',
      confirmOrder: 'Generate payment reference',
      awaitingConfigBadge: 'Awaiting API configuration',
      sandboxBadge: 'Sandbox / Test Mode',
      productionBadge: 'Production Mode',
      neverTrustScreenshot: 'Security rule: payments are never confirmed from screenshots alone; API, webhook, or on-chain verification is mandatory.',
    },
    footer: {
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      refunds: 'Refund Policy',
      contact: 'Contact',
      copyright: '© 2026 Masseillan Global Digital. All rights reserved.',
    },
  },
  ht: {
    brandName: 'Masseillan Global Digital',
    slogan: 'Talan ou merite yon mache mondyal.',
    nav: {
      catalog: 'Katalòg',
      categories: 'Kategori',
      stores: 'Boutik yo',
      sellerSpace: 'Espas vandè',
      buyerSpace: 'Acha mwen yo',
      adminSpace: 'Administrasyon',
      login: 'Konekte',
      createStore: 'Kreye boutik mwen',
      logout: 'Dekonekte',
      cart: 'Panye',
    },
    hero: {
      headline: 'Talan ou merite yon mache mondyal.',
      subheadline:
        'Kreye boutik dijital ou nan kèk minit epi resevwa peman an USD, HTG oswa EUR ak MonCash, NatCash, PayPal ak USDT BEP20 avèk yon komisyon fiks 5 % sèlman.',
      ctaPrimary: 'Kreye boutik mwen',
      ctaSecondary: 'Eksplore katalòg la',
      statCommission: '5 % komisyon fiks',
      statCurrencies: '3 lajan (USD · HTG · EUR)',
      statMethods: '4 mwayen peman verifye',
      statDelivery: 'Lyen telechajman sekirize',
    },
    sections: {
      categoriesTitle: 'Kategori Pwodui Dijital yo',
      categoriesSubtitle: 'Liv PDF, fòmasyon videyo, modèl Canva, pake prompt IA ak lojisyèl.',
      popularProductsTitle: 'Pwodui Popilè yo',
      popularProductsSubtitle: 'Resous dijital ki pi vann nan men kreyatè verifye nou yo.',
      topStoresTitle: 'Pi bon Boutik Kreyatè yo',
      topStoresSubtitle: 'Chak vandè gen pwòp adrès boutik li ak pòtfèy entèn pa li.',
      benefitsTitle: 'Fèt pou Ayiti ak rès mond lan',
      paymentsTitle: 'Mwayen Peman Verifye yo',
      paymentsSubtitle: 'Pwoteksyon kont doub peman ak verifikasyon API, webhook ak blockchain.',
      testimonialsTitle: 'Kreyatè k ap vann sou Masseillan',
      viewAll: 'Wè tout',
    },
    product: {
      addToCart: 'Mete nan panye',
      buyNow: 'Achte kounye a',
      sales: 'lavant',
      reviews: 'avi',
      soldBy: 'Vandè:',
      visitStore: 'Vizite boutik la',
      fileInfo: 'Fichye dijital enkli',
      commissionNote: 'Gen 5 % frè platfòm nan pri a; frè prestataire peman yo parèt separeman.',
      writeReview: 'Bay yon avi',
      reportProduct: 'Siyale pwodui sa a',
    },
    cart: {
      title: 'Panye ou',
      empty: 'Panye dijital ou a vid.',
      browseCatalog: 'Gade katalòg la',
      subtotal: 'Sou-total pwodui yo',
      platformFeeIncluded: 'Komisyon platfòm (5 % enkli nan pati vandè a)',
      providerFeeSeparate: 'Frè prestataire peman (afiche separeman)',
      proceedCheckout: 'Ale nan peman',
      remove: 'Retire',
    },
    checkout: {
      title: 'Finalize Kòmand ou',
      guestAllowed: 'Ou ka achte san kreye kont.',
      buyerName: 'Non konplè',
      buyerEmail: 'Imèl pou resevwa fichye a',
      selectPayment: 'Chwazi mwayen peman ou',
      confirmOrder: 'Jenere referans peman',
      awaitingConfigBadge: 'Ap tann konfigirasyon API',
      sandboxBadge: 'Mòd Tès / Sandbox',
      productionBadge: 'Mòd Pwodiksyon',
      neverTrustScreenshot: 'Sekirite : nou pa janm valide yon peman sou senp foto ekran ; verifikasyon API oswa on-chain obligatwa.',
    },
    footer: {
      terms: 'Kondisyon jeneral',
      privacy: 'Konfidansyalite',
      refunds: 'Politik ranbousman',
      contact: 'Kontak',
      copyright: '© 2026 Masseillan Global Digital. Tout dwa rezève.',
    },
  },
};
