import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { count, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  auditLogs,
  categories,
  orderItems,
  orders,
  paymentConfigs,
  paymentTransactions,
  products,
  reviews,
  stores,
  users,
  wallets,
  walletTransactions,
} from '../db/schema.ts';
import { hashPassword } from './crypto.ts';
import { calculateCommissionSplit } from '../shared/commerce.ts';

export const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'deliverables');

let seedPromise: Promise<void> | null = null;

function ensureDeliverableFile(fileName: string, content: string): { key: string; size: number } {
  mkdirSync(STORAGE_ROOT, { recursive: true });
  const filePath = path.join(STORAGE_ROOT, fileName);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, content, 'utf8');
  }
  return {
    key: fileName,
    size: Buffer.byteLength(content, 'utf8'),
  };
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  const existingCats = await db.select({ total: count() }).from(categories);
  if ((existingCats[0]?.total ?? 0) > 0) {
    return;
  }

  // 1. Seed 13 required product categories
  const categoryRows = await db
    .insert(categories)
    .values([
      {
        slug: 'ebooks-pdf',
        nameFr: 'Ebooks PDF',
        nameEn: 'PDF Ebooks',
        nameHt: 'Liv PDF',
        description: 'Guides pratiques, livres blancs et manuels téléchargeables en PDF.',
        sortOrder: 1,
      },
      {
        slug: 'livres-numeriques',
        nameFr: 'Livres numériques',
        nameEn: 'Digital Books',
        nameHt: 'Liv Dijital',
        description: 'Romans, essais et publications numériques multi-formats.',
        sortOrder: 2,
      },
      {
        slug: 'documents-word',
        nameFr: 'Documents Word',
        nameEn: 'Word Documents',
        nameHt: 'Dokiman Word',
        description: 'Contrats, modèles de CV, propositions commerciales et dossiers.',
        sortOrder: 3,
      },
      {
        slug: 'modeles-excel',
        nameFr: 'Modèles Excel',
        nameEn: 'Excel Templates',
        nameHt: 'Modèl Excel',
        description: 'Tableaux comptables, budgets, suivi de stock et dashboards Excel.',
        sortOrder: 4,
      },
      {
        slug: 'formations-video',
        nameFr: 'Formations vidéo',
        nameEn: 'Video Courses',
        nameHt: 'Fòmasyon Videyo',
        description: 'Ateliers vidéo HD étape par étape par des experts.',
        sortOrder: 5,
      },
      {
        slug: 'cours-en-ligne',
        nameFr: 'Cours en ligne',
        nameEn: 'Online Courses',
        nameHt: 'Kou sou Entènèt',
        description: 'Programmes complets avec cahiers d’exercices et certificats.',
        sortOrder: 6,
      },
      {
        slug: 'fichiers-audio',
        nameFr: 'Fichiers audio',
        nameEn: 'Audio Files',
        nameHt: 'Fichye Odyo',
        description: 'Instrumentales, podcasts privés, effets sonores et méditations.',
        sortOrder: 7,
      },
      {
        slug: 'templates-graphiques',
        nameFr: 'Templates graphiques',
        nameEn: 'Graphic Templates',
        nameHt: 'Modèl Grafik',
        description: 'Kits UI Figma, affiches, identités visuelles et présentations.',
        sortOrder: 8,
      },
      {
        slug: 'modeles-canva',
        nameFr: 'Modèles Canva',
        nameEn: 'Canva Templates',
        nameHt: 'Modèl Canva',
        description: 'Carrousels Instagram, flyers et kits de marque prêts pour Canva.',
        sortOrder: 9,
      },
      {
        slug: 'logiciels-applications',
        nameFr: 'Logiciels & applications',
        nameEn: 'Software & Apps',
        nameHt: 'Lojisyèl & Aplikasyon',
        description: 'Scripts, extensions, thèmes web et utilitaires desktop.',
        sortOrder: 10,
      },
      {
        slug: 'images-ressources',
        nameFr: 'Images & ressources',
        nameEn: 'Images & Assets',
        nameHt: 'Imaj & Resous',
        description: 'Photographies haute résolution, mockups et packs d’icônes.',
        sortOrder: 11,
      },
      {
        slug: 'packs-prompts-ia',
        nameFr: 'Packs de prompts IA',
        nameEn: 'AI Prompt Packs',
        nameHt: 'Pake Prompt IA',
        description: 'Bibliothèques de prompts structurés pour marketing, code et design.',
        sortOrder: 12,
      },
      {
        slug: 'ressources-educatives',
        nameFr: 'Ressources éducatives',
        nameEn: 'Educational Resources',
        nameHt: 'Resous Edikatif',
        description: 'Fiches pédagogiques, exercices scolaires et supports universitaires.',
        sortOrder: 13,
      },
    ])
    .returning();

  const catBySlug = Object.fromEntries(categoryRows.map((c) => [c.slug, c.id]));

  // 2. Seed 4 payment gateway configurations (strictly separating sandbox vs configured production)
  await db.insert(paymentConfigs).values([
    {
      provider: 'moncash',
      displayName: 'MonCash (Digicel Haïti)',
      isEnabled: true,
      mode: process.env.MONCASH_CLIENT_ID && process.env.MONCASH_CLIENT_SECRET ? 'production' : 'sandbox',
      isConfigured: Boolean(process.env.MONCASH_CLIENT_ID && process.env.MONCASH_CLIENT_SECRET),
      publicIdentifier: process.env.MONCASH_MERCHANT_LABEL || 'Masseillan Global Digital · MonCash Business',
      feePercentScaled: 200, // 2.00%
      feeFixedUsdCents: 0,
      instructions:
        'Scannez le QR Code MonCash ou utilisez la référence unique générée. Confirmation automatique via webhook sécurisé MonCash API.',
    },
    {
      provider: 'natcash',
      displayName: 'NatCash (Natcom Haïti)',
      isEnabled: true,
      mode: process.env.NATCASH_MERCHANT_ID && process.env.NATCASH_API_KEY ? 'production' : 'sandbox',
      isConfigured: Boolean(process.env.NATCASH_MERCHANT_ID && process.env.NATCASH_API_KEY),
      publicIdentifier: process.env.NATCASH_MERCHANT_ID || 'Masseillan Global Digital · NatCash Marchand',
      feePercentScaled: 180, // 1.80%
      feeFixedUsdCents: 0,
      instructions:
        'Scannez le QR Code NatCash et validez avec la référence de commande. Statut en attente vérifié par API marchand NatCash.',
    },
    {
      provider: 'paypal',
      displayName: 'PayPal & Carte Bancaire',
      isEnabled: true,
      mode: process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? 'production' : 'sandbox',
      isConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
      publicIdentifier: 'PayPal Checkout · Visa / Mastercard / Solde PayPal',
      feePercentScaled: 290, // 2.90%
      feeFixedUsdCents: 30, // +$0.30
      instructions:
        'Paiement international par compte PayPal ou carte bancaire. Vérification de statut côté serveur et confirmation par webhook PayPal.',
    },
    {
      provider: 'usdt_bep20',
      displayName: 'USDT (BNB Smart Chain BEP20)',
      isEnabled: true,
      mode: process.env.USDT_BEP20_MERCHANT_ADDRESS ? 'production' : 'sandbox',
      isConfigured: Boolean(process.env.USDT_BEP20_MERCHANT_ADDRESS),
      publicIdentifier:
        process.env.USDT_BEP20_MERCHANT_ADDRESS || '0x0000000000000000000000000000000000000000',
      feePercentScaled: 0,
      feeFixedUsdCents: 25, // ~$0.25 BSC gas / network tracking note
      instructions:
        'Envoyez le montant exact en USDT sur le réseau BNB Smart Chain (BEP20) uniquement. Vérification on-chain requise (jamais par capture d’écran).',
    },
  ]);

  // 3. Seed Users (Admin, Verified Sellers, Buyer)
  const [adminUser] = await db
    .insert(users)
    .values({
      uid: 'local_admin_masseillan',
      email: 'wdesrosin@gmail.com',
      passwordHash: hashPassword('AdminMGD!2026'),
      fullName: 'W. Desrosin (Administrateur)',
      role: 'admin',
      status: 'active',
      preferredLang: 'fr',
      preferredCurrency: 'USD',
    })
    .returning();

  const [seller1] = await db
    .insert(users)
    .values({
      uid: 'local_seller_atelier',
      email: 'claire@ateliermasseillan.com',
      passwordHash: hashPassword('SellerMGD!2026'),
      fullName: 'Claire-Anne Jean-Baptiste',
      role: 'seller',
      status: 'active',
      preferredLang: 'fr',
      preferredCurrency: 'USD',
    })
    .returning();

  const [seller2] = await db
    .insert(users)
    .values({
      uid: 'local_seller_caribbean',
      email: 'marc@caribbeandesign.ht',
      passwordHash: hashPassword('SellerMGD!2026'),
      fullName: 'Marc-Antoine Pierre',
      role: 'seller',
      status: 'active',
      preferredLang: 'ht',
      preferredCurrency: 'HTG',
    })
    .returning();

  const [seller3] = await db
    .insert(users)
    .values({
      uid: 'local_seller_tech',
      email: 'nadia@haititechacademy.io',
      passwordHash: hashPassword('SellerMGD!2026'),
      fullName: 'Nadia Toussaint',
      role: 'seller',
      status: 'active',
      preferredLang: 'en',
      preferredCurrency: 'USD',
    })
    .returning();

  const [buyerUser] = await db
    .insert(users)
    .values({
      uid: 'local_buyer_demo',
      email: 'acheteur@masseillanglobal.com',
      passwordHash: hashPassword('BuyerMGD!2026'),
      fullName: 'Jean-Luc Moreau',
      role: 'buyer',
      status: 'active',
      preferredLang: 'fr',
      preferredCurrency: 'USD',
    })
    .returning();

  // 4. Seed Wallets
  const [wallet1] = await db
    .insert(wallets)
    .values({
      userId: seller1.id,
      availableUsdCents: 1900,
      pendingUsdCents: 0,
      totalEarnedUsdCents: 1900,
      totalWithdrawnUsdCents: 0,
    })
    .returning();

  await db.insert(wallets).values([
    { userId: seller2.id, availableUsdCents: 3800, pendingUsdCents: 0, totalEarnedUsdCents: 3800, totalWithdrawnUsdCents: 0 },
    { userId: seller3.id, availableUsdCents: 2850, pendingUsdCents: 0, totalEarnedUsdCents: 2850, totalWithdrawnUsdCents: 0 },
  ]);

  // 5. Seed Creator Storefronts
  const [store1] = await db
    .insert(stores)
    .values({
      ownerId: seller1.id,
      slug: 'atelier-masseillan',
      name: 'Atelier Masseillan Éditions',
      tagline: 'Livres numériques, finances & guides pratiques pour créateurs',
      bio: 'Maison d’édition numérique basée entre Port-au-Prince et Montréal. Nous publions des manuels structurés, modèles Excel financiers et contrats prêts à l’emploi.',
      accentColor: '#2563EB',
      bannerUrl: '/src/assets/images/hero_digital_creator_1794684627453.jpg',
      avatarUrl: '/src/assets/images/product_ebook_mastery_1794684628002.jpg',
      country: 'HT',
      isVerified: true,
      status: 'active',
      socialLinks: { website: 'https://masseillanglobal.com', instagram: '@ateliermasseillan' },
    })
    .returning();

  const [store2] = await db
    .insert(stores)
    .values({
      ownerId: seller2.id,
      slug: 'caribbean-design-lab',
      name: 'Caribbean Design Lab',
      tagline: 'Identités visuelles, modèles Canva & kits UI haut de gamme',
      bio: 'Studio créatif spécialisé dans les systèmes graphiques modernes pour PME, marques de mode et créateurs de contenu en Haïti et dans la diaspora.',
      accentColor: '#7C3AED',
      bannerUrl: '/src/assets/images/product_canva_templates_1794684627701.jpg',
      avatarUrl: '/src/assets/images/product_canva_templates_1794684627701.jpg',
      country: 'HT',
      isVerified: true,
      status: 'active',
      socialLinks: { behance: 'caribbeandesignlab', instagram: '@caribbeandesignlab' },
    })
    .returning();

  const [store3] = await db
    .insert(stores)
    .values({
      ownerId: seller3.id,
      slug: 'haiti-tech-academy',
      name: 'Haiti Tech Academy',
      tagline: 'Formations vidéo, packs de prompts IA & outils logiciels',
      bio: 'Formations pratiques en développement web, automatisation IA et production audio-numérique en français, créole haïtien et anglais.',
      accentColor: '#1D4ED8',
      bannerUrl: '/src/assets/images/product_ai_prompts_1794684628665.jpg',
      avatarUrl: '/src/assets/images/product_video_course_1794684628439.jpg',
      country: 'CA',
      isVerified: true,
      status: 'active',
      socialLinks: { youtube: '@haititechacademy', github: 'haiti-tech-academy' },
    })
    .returning();

  // 6. Seed Deliverable Files & Products
  const f1 = ensureDeliverableFile(
    'guide-business-digital-2026.txt',
    'MASSEILLAN GLOBAL DIGITAL — GUIDE COMPLET DU COMMERCE NUMERIQUE 2026\n\nChapitre 1 : Structurer votre offre numérique\nChapitre 2 : Encaisser avec MonCash, NatCash, PayPal et USDT BEP20\nChapitre 3 : Automatiser la livraison sécurisée.\n'
  );
  const f2 = ensureDeliverableFile(
    'kit-canva-identite-marque.txt',
    'CARIBBEAN DESIGN LAB — LIENS CANVA & GUIDE DE MARQUE\n\nInclus : 45 modèles de carrousels Instagram, 15 flyers, charte typographique et palette Bleu Nuit / Électrique.\n'
  );
  const f3 = ensureDeliverableFile(
    'pack-300-prompts-ia-pro.txt',
    'HAITI TECH ACADEMY — PACK 300 PROMPTS IA AVANCES\n\nCatégories : Copywriting E-commerce, Architecture Logicielle, Analyse Financière, Marketing Multilingue (FR/EN/HT).\n'
  );
  const f4 = ensureDeliverableFile(
    'formation-audio-podcast-studio.txt',
    'HAITI TECH ACADEMY — FORMATION PRODUCTION AUDIO & PODCAST\n\nModules 1 à 8 : Prise de son, égalisation vocale, compression, exportation et monétisation.\n'
  );
  const f5 = ensureDeliverableFile(
    'modele-excel-comptabilite-pme.txt',
    'ATELIER MASSEILLAN — MODELE EXCEL COMPTABILITE MULTI-DEVISES (USD / HTG / EUR)\n\nFeuilles incluses : Journal des ventes, Suivi des commissions 5 %, Bilan mensuel et Trésorerie.\n'
  );
  const f6 = ensureDeliverableFile(
    'kit-contrats-freelance-word.txt',
    'ATELIER MASSEILLAN — PACK CONTRATS PRESTATION & LICENCE NUMERIQUE (WORD)\n\nModèles inclus : Contrat de cession de droits, Devis type, Facture internationale, CGV.\n'
  );

  const insertedProducts = await db
    .insert(products)
    .values([
      {
        storeId: store1.id,
        categoryId: catBySlug['ebooks-pdf'],
        title: 'Lancer et Monétiser son Savoir en Ligne (Édition 2026)',
        slug: 'lancer-monetiser-savoir-2026',
        description:
          'Guide PDF complet de 140 pages pour transformer votre expertise en produits numériques rentables. Inclut stratégies de prix multi-devises, tunnel de vente et fiscalité créateur.',
        priceUsdCents: 2000, // $20.00 — matches commission example ($1 fee / $19 seller net)
        coverUrl: '/src/assets/images/product_ebook_mastery_1794684628002.jpg',
        fileName: 'Guide-Business-Digital-2026.pdf',
        fileMimeType: 'text/plain',
        fileSizeBytes: f1.size,
        fileStorageKey: f1.key,
        productType: 'ebook_pdf',
        salesCount: 48,
        ratingAvgScaled: 490,
        reviewsCount: 2,
        status: 'published',
      },
      {
        storeId: store2.id,
        categoryId: catBySlug['modeles-canva'],
        title: 'Kit Identité Visuelle & 45 Modèles Canva Pro',
        slug: 'kit-identite-visuelle-canva-pro',
        description:
          'Système visuel complet modifiable gratuitement sur Canva : carrousels éducatifs, bannières boutique, cartes de visite et fiches produits pour créateurs et agences.',
        priceUsdCents: 2900,
        coverUrl: '/src/assets/images/product_canva_templates_1794684627701.jpg',
        fileName: 'Kit-Canva-Identite-Marque.txt',
        fileMimeType: 'text/plain',
        fileSizeBytes: f2.size,
        fileStorageKey: f2.key,
        productType: 'canva_template',
        salesCount: 64,
        ratingAvgScaled: 495,
        reviewsCount: 2,
        status: 'published',
      },
      {
        storeId: store3.id,
        categoryId: catBySlug['packs-prompts-ia'],
        title: 'Pack 300+ Prompts IA pour Marketing, Code & Productivité',
        slug: 'pack-300-prompts-ia-pro',
        description:
          'Bibliothèque structurée de prompts testés en production pour rédiger des pages de vente, automatiser vos flux de travail et accélérer le développement logiciel.',
        priceUsdCents: 1500,
        coverUrl: '/src/assets/images/product_ai_prompts_1794684628665.jpg',
        fileName: 'Pack-300-Prompts-IA-Pro.txt',
        fileMimeType: 'text/plain',
        fileSizeBytes: f3.size,
        fileStorageKey: f3.key,
        productType: 'ai_prompts',
        salesCount: 92,
        ratingAvgScaled: 485,
        reviewsCount: 1,
        status: 'published',
      },
      {
        storeId: store3.id,
        categoryId: catBySlug['formations-video'],
        title: 'Formation Complète Production Audio, Podcast & Cours Vidéo',
        slug: 'formation-production-audio-podcast',
        description:
          'Programme pratique de 6 heures avec fiches techniques pour enregistrer, mixer et publier des formations vidéo et podcasts de qualité studio depuis chez vous.',
        priceUsdCents: 4500,
        coverUrl: '/src/assets/images/product_video_course_1794684628439.jpg',
        fileName: 'Formation-Audio-Podcast-Studio.txt',
        fileMimeType: 'text/plain',
        fileSizeBytes: f4.size,
        fileStorageKey: f4.key,
        productType: 'video_course',
        salesCount: 31,
        ratingAvgScaled: 500,
        reviewsCount: 1,
        status: 'published',
      },
      {
        storeId: store1.id,
        categoryId: catBySlug['modeles-excel'],
        title: 'Modèle Excel Comptabilité & Trésorerie Multi-Devises (USD/HTG/EUR)',
        slug: 'modele-excel-comptabilite-multidevises',
        description:
          'Classeur automatisé avec calcul de marges, conversion USD/HTG/EUR, suivi des frais de passerelle et rapport mensuel prêt pour votre comptable.',
        priceUsdCents: 2400,
        coverUrl: '/src/assets/images/product_ebook_mastery_1794684628002.jpg',
        fileName: 'Modele-Excel-Comptabilite-PME.txt',
        fileMimeType: 'text/plain',
        fileSizeBytes: f5.size,
        fileStorageKey: f5.key,
        productType: 'excel_template',
        salesCount: 39,
        ratingAvgScaled: 480,
        reviewsCount: 1,
        status: 'published',
      },
      {
        storeId: store1.id,
        categoryId: catBySlug['documents-word'],
        title: 'Pack Contrats Freelance, Licences & Facturation (Word)',
        slug: 'pack-contrats-freelance-word',
        description:
          '12 modèles Word modifiables rédigés en français et anglais : contrats de prestation numérique, cession de droits d’auteur et conditions générales.',
        priceUsdCents: 1800,
        coverUrl: '/src/assets/images/product_canva_templates_1794684627701.jpg',
        fileName: 'Pack-Contrats-Freelance-Word.txt',
        fileMimeType: 'text/plain',
        fileSizeBytes: f6.size,
        fileStorageKey: f6.key,
        productType: 'word_doc',
        salesCount: 27,
        ratingAvgScaled: 470,
        reviewsCount: 1,
        status: 'published',
      },
    ])
    .returning();

  // 7. Seed Verified Reviews
  await db.insert(reviews).values([
    {
      productId: insertedProducts[0].id,
      userId: buyerUser.id,
      authorName: 'Jean-Luc Moreau',
      authorEmail: buyerUser.email,
      rating: 5,
      comment: 'Structure limpide et exemples très concrets pour vendre en HTG et USD.',
      isVerifiedPurchase: true,
    },
    {
      productId: insertedProducts[0].id,
      authorName: 'Stéphanie Laurent',
      authorEmail: 'stephanie@example.com',
      rating: 5,
      comment: 'Le chapitre sur les paiements internationaux m’a fait gagner des semaines.',
      isVerifiedPurchase: true,
    },
    {
      productId: insertedProducts[1].id,
      authorName: 'Kervens Alexis',
      authorEmail: 'kervens@example.ht',
      rating: 5,
      comment: 'Modèles Canva élégants et faciles à adapter pour ma boutique.',
      isVerifiedPurchase: true,
    },
    {
      productId: insertedProducts[2].id,
      authorName: 'David Joseph',
      authorEmail: 'david@example.com',
      rating: 5,
      comment: 'Excellents prompts structurés en français et créole, gain de temps immédiat.',
      isVerifiedPurchase: true,
    },
  ]);

  // 8. Seed a confirmed historical order ($20.00 -> $1.00 platform 5% commission, $19.00 seller net)
  const split = calculateCommissionSplit(2000);
  const [sampleOrder] = await db
    .insert(orders)
    .values({
      orderNumber: 'MGD-2026-1001',
      buyerUserId: buyerUser.id,
      buyerEmail: buyerUser.email,
      buyerName: buyerUser.fullName,
      currency: 'USD',
      exchangeRateScaled: 10000,
      subtotalUsdCents: 2000,
      platformFeeUsdCents: split.platformCommissionUsdCents,
      providerFeeUsdCents: 40, // 2.00% MonCash fee displayed separately
      totalUsdCents: 2040,
      totalDisplayCents: 2040,
      paymentMethod: 'moncash',
      paymentStatus: 'confirmed',
      paymentReference: 'MC-SEED-1001',
      providerTransactionId: 'MONCASH-DEMO-88412',
      confirmedAt: new Date(),
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: sampleOrder.id,
    productId: insertedProducts[0].id,
    storeId: store1.id,
    sellerUserId: seller1.id,
    productTitle: insertedProducts[0].title,
    grossUsdCents: split.grossUsdCents,
    platformCommissionUsdCents: split.platformCommissionUsdCents,
    sellerNetUsdCents: split.sellerNetUsdCents,
    downloadCount: 1,
  });

  await db.insert(paymentTransactions).values({
    orderId: sampleOrder.id,
    provider: 'moncash',
    environment: 'sandbox',
    externalTxId: 'MONCASH-DEMO-88412',
    idempotencyKey: 'MC-SEED-1001',
    amountUsdCents: 2040,
    providerFeeUsdCents: 40,
    status: 'confirmed',
    confirmationsCount: 1,
    webhookVerified: true,
    rawMetadata: { note: 'Initial seeded verified sandbox order' },
  });

  await db.insert(walletTransactions).values({
    walletId: wallet1.id,
    orderId: sampleOrder.id,
    type: 'sale_credit',
    amountUsdCents: split.sellerNetUsdCents,
    commissionUsdCents: split.platformCommissionUsdCents,
    description: `Vente confirmée #${sampleOrder.orderNumber} (Commission 5 % : $1.00)`,
  });

  await db.insert(auditLogs).values({
    actorUserId: adminUser.id,
    actorEmail: adminUser.email,
    action: 'PLATFORM_INITIALIZED',
    targetType: 'system',
    targetId: 'mgd-core',
    details: { seededCategories: categoryRows.length, seededProducts: insertedProducts.length },
    ipAddress: '127.0.0.1',
  });

  // Ensure seller1 email query stays clean for linting
  await db.select({ id: users.id }).from(users).where(eq(users.id, adminUser.id));
}
