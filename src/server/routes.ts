import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  auditLogs,
  categories,
  contactMessages,
  downloadTokens,
  orderItems,
  orders,
  paymentConfigs,
  paymentTransactions,
  products,
  refunds,
  reports,
  reviews,
  stores,
  users,
  wallets,
  walletTransactions,
  withdrawals,
} from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  CURRENCY_RATES,
  calculateCommissionSplit,
  calculateProviderFeeUsdCents,
  convertUsdCentsToCurrencyCents,
  isValidBep20Address,
  isValidEmail,
  sanitizeText,
  slugifyText,
  type Currency,
  type PaymentMethod,
} from '../shared/commerce.ts';
import {
  generateReference,
  hashPassword,
  sha256Hex,
  signToken,
  verifyPassword,
  verifySignedToken,
  verifyWebhookHmac,
} from './crypto.ts';
import {
  confirmOrderPayment,
  createPaymentIntent,
  getPaymentGatewayStatus,
} from './payments.ts';
import { STORAGE_ROOT, ensureSeeded } from './seed.ts';

const UPLOAD_DIR = path.resolve(process.cwd(), 'storage', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });
mkdirSync(STORAGE_ROOT, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
      cb(null, `${Date.now()}-${generateReference('FILE')}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: 'admin' | 'seller' | 'buyer';
  status: string;
  preferredLang: string;
  preferredCurrency: string;
}

interface AuthedRequest extends Request {
  authUser?: AuthenticatedUser;
}

const ADMIN_EMAILS = new Set(['wdesrosin@gmail.com']);

async function resolveUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  // 1. Try server-signed HMAC session token
  const session = verifySignedToken(token, 'session');
  if (session) {
    const userId = Number(session.sub);
    if (Number.isInteger(userId)) {
      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const u = rows[0];
      if (u && u.status === 'active') {
        return {
          id: u.id,
          uid: u.uid,
          email: u.email,
          fullName: u.fullName,
          role: u.role as AuthenticatedUser['role'],
          status: u.status,
          preferredLang: u.preferredLang,
          preferredCurrency: u.preferredCurrency,
        };
      }
    }
    return null;
  }

  // 2. Fallback to Firebase ID Token verification
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) return null;
    const email = decoded.email.toLowerCase();
    const role = ADMIN_EMAILS.has(email) ? 'admin' : 'buyer';
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userRow = existing[0];
    if (!userRow) {
      const [inserted] = await db
        .insert(users)
        .values({
          uid: decoded.uid,
          email,
          fullName: decoded.name || email.split('@')[0],
          role,
          status: 'active',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email, updatedAt: new Date() },
        })
        .returning();
      userRow = inserted;
    }
    if (userRow.status !== 'active') return null;
    return {
      id: userRow.id,
      uid: userRow.uid,
      email: userRow.email,
      fullName: userRow.fullName,
      role: userRow.role as AuthenticatedUser['role'],
      status: userRow.status,
      preferredLang: userRow.preferredLang,
      preferredCurrency: userRow.preferredCurrency,
    };
  } catch {
    return null;
  }
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await resolveUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  req.authUser = user;
  next();
}

function requireRole(...roles: Array<'admin' | 'seller' | 'buyer'>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentification requise.' });
    }
    if (!roles.includes(req.authUser.role) && req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Permissions insuffisantes.' });
    }
    next();
  };
}

export function createApiRouter() {
  const router = express.Router();

  // Lazy DB seed guard
  router.use(async (_req, _res, next) => {
    try {
      await ensureSeeded();
      next();
    } catch (err) {
      next(err);
    }
  });

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', platform: 'Masseillan Global Digital' });
  });

  // Public bootstrap metadata (never leaks payment secrets)
  router.get('/bootstrap', async (_req, res) => {
    try {
      const cats = await db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(categories.sortOrder);

      const gwConfigs = await db.select().from(paymentConfigs);
      const safeGateways = await Promise.all(
        gwConfigs.map(async (g) => {
          const live = await getPaymentGatewayStatus(g.provider as PaymentMethod);
          return {
            provider: live.provider,
            displayName: live.displayName,
            isEnabled: live.isEnabled,
            mode: live.mode,
            isConfigured: live.isConfigured,
            publicIdentifier: live.publicIdentifier,
            feePercentScaled: live.feePercentScaled,
            feeFixedUsdCents: live.feeFixedUsdCents,
            instructions: live.instructions,
          };
        })
      );

      res.json({
        categories: cats,
        paymentGateways: safeGateways,
        rates: CURRENCY_RATES,
      });
    } catch (err) {
      console.error('Bootstrap error:', err);
      res.status(500).json({ error: 'Impossible de charger la configuration.' });
    }
  });

  // ================= AUTH =================
  router.post('/auth/register', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const fullName = sanitizeText(String(req.body?.fullName || ''), 120);
      const requestedRole = req.body?.role === 'seller' ? 'seller' : 'buyer';
      const storeNameInput = sanitizeText(String(req.body?.storeName || ''), 100);

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Adresse email invalide.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
      }
      if (!fullName) {
        return res.status(400).json({ error: 'Le nom complet est requis.' });
      }

      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing[0]) {
        return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
      }

      const finalRole = ADMIN_EMAILS.has(email) ? 'admin' : requestedRole;
      const uid = `local_${generateReference('USR').toLowerCase()}`;

      const [newUser] = await db
        .insert(users)
        .values({
          uid,
          email,
          passwordHash: hashPassword(password),
          fullName,
          role: finalRole,
          status: 'active',
        })
        .returning();

      let createdStore = null;
      if (finalRole === 'seller' || finalRole === 'admin') {
        const baseName = storeNameInput || `Boutique ${fullName}`;
        let slug = slugifyText(baseName) || `store-${newUser.id}`;
        const slugExists = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
        if (slugExists[0]) {
          slug = `${slug}-${newUser.id}`;
        }
        const [store] = await db
          .insert(stores)
          .values({
            ownerId: newUser.id,
            slug,
            name: baseName,
            tagline: 'Produits numériques & ressources créatives',
            bio: `Bienvenue sur la boutique officielle de ${fullName}.`,
            accentColor: '#2563EB',
            bannerUrl: '/src/assets/images/hero_digital_creator_1794684627453.jpg',
            avatarUrl: '/src/assets/images/product_ebook_mastery_1794684628002.jpg',
          })
          .returning();
        createdStore = store;

        await db.insert(wallets).values({
          userId: newUser.id,
          availableUsdCents: 0,
          pendingUsdCents: 0,
          totalEarnedUsdCents: 0,
          totalWithdrawnUsdCents: 0,
        });
      }

      await db.insert(auditLogs).values({
        actorUserId: newUser.id,
        actorEmail: newUser.email,
        action: 'USER_REGISTERED',
        targetType: 'user',
        targetId: String(newUser.id),
        details: { role: finalRole, storeSlug: createdStore?.slug ?? null },
        ipAddress: req.ip || '',
      });

      const token = signToken({ sub: String(newUser.id), role: newUser.role, purpose: 'session' }, 7 * 24 * 3600);
      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          preferredLang: newUser.preferredLang,
          preferredCurrency: newUser.preferredCurrency,
        },
        store: createdStore,
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Erreur lors de la création du compte.' });
    }
  });

  router.post('/auth/login', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!isValidEmail(email) || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis.' });
      }

      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = rows[0];
      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Identifiants invalides.' });
      }
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Ce compte est actuellement suspendu.' });
      }

      const storeRows = await db.select().from(stores).where(eq(stores.ownerId, user.id)).limit(1);
      const token = signToken({ sub: String(user.id), role: user.role, purpose: 'session' }, 7 * 24 * 3600);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          preferredLang: user.preferredLang,
          preferredCurrency: user.preferredCurrency,
        },
        store: storeRows[0] ?? null,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Erreur de connexion.' });
    }
  });

  router.post('/auth/google', async (req, res) => {
    try {
      const idToken = String(req.body?.idToken || '');
      const requestedRole = req.body?.role === 'seller' ? 'seller' : 'buyer';
      if (!idToken) {
        return res.status(400).json({ error: 'Jeton Google manquant.' });
      }
      const decoded = await adminAuth.verifyIdToken(idToken);
      if (!decoded.email) {
        return res.status(400).json({ error: 'Email Google introuvable.' });
      }
      const email = decoded.email.toLowerCase();
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      let user = existing[0];

      if (!user) {
        const finalRole = ADMIN_EMAILS.has(email) ? 'admin' : requestedRole;
        const [inserted] = await db
          .insert(users)
          .values({
            uid: decoded.uid,
            email,
            fullName: decoded.name || email.split('@')[0],
            role: finalRole,
            status: 'active',
          })
          .returning();
        user = inserted;

        if (finalRole === 'seller' || finalRole === 'admin') {
          const slug = slugifyText(user.fullName) || `store-${user.id}`;
          await db.insert(stores).values({
            ownerId: user.id,
            slug: `${slug}-${user.id}`,
            name: `Boutique ${user.fullName}`,
            tagline: 'Boutique créateur Masseillan Global Digital',
            bannerUrl: '/src/assets/images/hero_digital_creator_1794684627453.jpg',
            avatarUrl: '/src/assets/images/product_ebook_mastery_1794684628002.jpg',
          });
          await db.insert(wallets).values({ userId: user.id });
        }
      }

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Ce compte est suspendu.' });
      }

      const storeRows = await db.select().from(stores).where(eq(stores.ownerId, user.id)).limit(1);
      const token = signToken({ sub: String(user.id), role: user.role, purpose: 'session' }, 7 * 24 * 3600);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          preferredLang: user.preferredLang,
          preferredCurrency: user.preferredCurrency,
        },
        store: storeRows[0] ?? null,
      });
    } catch (err) {
      console.error('Google auth error:', err);
      res.status(401).json({ error: 'Vérification Google échouée.' });
    }
  });

  router.post('/auth/forgot-password', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Adresse email invalide.' });
      }
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = rows[0];

      let devResetCode: string | undefined;
      if (user) {
        const rawCode = generateReference('RST');
        await db
          .update(users)
          .set({
            resetTokenHash: sha256Hex(rawCode),
            resetTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        await db.insert(auditLogs).values({
          actorUserId: user.id,
          actorEmail: user.email,
          action: 'PASSWORD_RESET_REQUESTED',
          targetType: 'user',
          targetId: String(user.id),
          details: {},
          ipAddress: req.ip || '',
        });

        // In absence of external SMTP transport, return token only in non-production sandbox mode
        if (process.env.NODE_ENV !== 'production') {
          devResetCode = rawCode;
        }
      }

      res.json({
        message: 'Si cet email existe, un code de réinitialisation valable 1 heure a été généré.',
        sandboxResetCode: devResetCode,
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation.' });
    }
  });

  router.post('/auth/reset-password', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const code = String(req.body?.code || '').trim();
      const newPassword = String(req.body?.newPassword || '');

      if (!isValidEmail(email) || !code || newPassword.length < 8) {
        return res.status(400).json({ error: 'Paramètres de réinitialisation invalides (min 8 caractères).' });
      }

      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = rows[0];
      if (
        !user ||
        !user.resetTokenHash ||
        !user.resetTokenExpiresAt ||
        user.resetTokenExpiresAt.getTime() < Date.now() ||
        user.resetTokenHash !== sha256Hex(code)
      ) {
        return res.status(400).json({ error: 'Code de réinitialisation invalide ou expiré.' });
      }

      await db
        .update(users)
        .set({
          passwordHash: hashPassword(newPassword),
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      res.json({ message: 'Mot de passe mis à jour avec succès.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Erreur lors de la réinitialisation.' });
    }
  });

  router.get('/auth/me', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const storeRows = await db.select().from(stores).where(eq(stores.ownerId, user.id)).limit(1);
    res.json({ user, store: storeRows[0] ?? null });
  });

  router.patch('/auth/me', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const user = req.authUser!;
      const fullName = req.body?.fullName ? sanitizeText(String(req.body.fullName), 120) : user.fullName;
      const preferredLang = ['fr', 'en', 'ht'].includes(req.body?.preferredLang)
        ? String(req.body.preferredLang)
        : user.preferredLang;
      const preferredCurrency = ['USD', 'HTG', 'EUR'].includes(req.body?.preferredCurrency)
        ? String(req.body.preferredCurrency)
        : user.preferredCurrency;

      const [updated] = await db
        .update(users)
        .set({ fullName, preferredLang, preferredCurrency, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();

      res.json({
        user: {
          id: updated.id,
          email: updated.email,
          fullName: updated.fullName,
          role: updated.role,
          preferredLang: updated.preferredLang,
          preferredCurrency: updated.preferredCurrency,
        },
      });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ error: 'Impossible de mettre à jour le profil.' });
    }
  });

  router.post('/auth/upgrade-to-seller', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const user = req.authUser!;
      const storeName = sanitizeText(String(req.body?.storeName || `Boutique ${user.fullName}`), 100);
      const existingStore = await db.select().from(stores).where(eq(stores.ownerId, user.id)).limit(1);
      if (existingStore[0]) {
        return res.json({ store: existingStore[0], user });
      }

      let slug = slugifyText(storeName) || `store-${user.id}`;
      const conflict = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
      if (conflict[0]) slug = `${slug}-${user.id}`;

      const [store] = await db
        .insert(stores)
        .values({
          ownerId: user.id,
          slug,
          name: storeName,
          tagline: 'Nouvelle boutique créateur',
          bio: `Produits numériques proposés par ${user.fullName}.`,
          bannerUrl: '/src/assets/images/hero_digital_creator_1794684627453.jpg',
          avatarUrl: '/src/assets/images/product_ebook_mastery_1794684628002.jpg',
        })
        .returning();

      if (user.role === 'buyer') {
        await db.update(users).set({ role: 'seller', updatedAt: new Date() }).where(eq(users.id, user.id));
      }

      const existingWallet = await db.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
      if (!existingWallet[0]) {
        await db.insert(wallets).values({ userId: user.id });
      }

      const updatedToken = signToken(
        { sub: String(user.id), role: user.role === 'admin' ? 'admin' : 'seller', purpose: 'session' },
        7 * 24 * 3600
      );

      res.json({
        token: updatedToken,
        store,
        user: { ...user, role: user.role === 'admin' ? 'admin' : 'seller' },
      });
    } catch (err) {
      console.error('Upgrade to seller error:', err);
      res.status(500).json({ error: 'Impossible de créer votre boutique.' });
    }
  });

  // ================= CATALOG & STORES =================
  router.get('/products', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const categorySlug = String(req.query.category || '').trim();
      const sort = String(req.query.sort || 'popular');

      const allProducts = await db
        .select({
          id: products.id,
          title: products.title,
          slug: products.slug,
          description: products.description,
          priceUsdCents: products.priceUsdCents,
          coverUrl: products.coverUrl,
          fileName: products.fileName,
          fileSizeBytes: products.fileSizeBytes,
          productType: products.productType,
          salesCount: products.salesCount,
          ratingAvgScaled: products.ratingAvgScaled,
          reviewsCount: products.reviewsCount,
          status: products.status,
          createdAt: products.createdAt,
          storeId: stores.id,
          storeSlug: stores.slug,
          storeName: stores.name,
          storeVerified: stores.isVerified,
          storeStatus: stores.status,
          categoryId: categories.id,
          categorySlug: categories.slug,
          categoryNameFr: categories.nameFr,
          categoryNameEn: categories.nameEn,
          categoryNameHt: categories.nameHt,
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.status, 'published'), eq(stores.status, 'active')))
        .orderBy(
          sort === 'price_asc'
            ? products.priceUsdCents
            : sort === 'price_desc'
              ? desc(products.priceUsdCents)
              : sort === 'newest'
                ? desc(products.createdAt)
                : desc(products.salesCount)
        );

      const filtered = allProducts.filter((p) => {
        if (categorySlug && categorySlug !== 'all' && p.categorySlug !== categorySlug) {
          return false;
        }
        if (q) {
          const needle = q.toLowerCase();
          return (
            p.title.toLowerCase().includes(needle) ||
            p.description.toLowerCase().includes(needle) ||
            p.storeName.toLowerCase().includes(needle)
          );
        }
        return true;
      });

      res.json({ products: filtered });
    } catch (err) {
      console.error('Products list error:', err);
      res.status(500).json({ error: 'Erreur lors du chargement du catalogue.' });
    }
  });

  router.get('/products/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Identifiant produit invalide.' });
      }

      const rows = await db
        .select({
          id: products.id,
          title: products.title,
          slug: products.slug,
          description: products.description,
          priceUsdCents: products.priceUsdCents,
          coverUrl: products.coverUrl,
          fileName: products.fileName,
          fileMimeType: products.fileMimeType,
          fileSizeBytes: products.fileSizeBytes,
          productType: products.productType,
          salesCount: products.salesCount,
          ratingAvgScaled: products.ratingAvgScaled,
          reviewsCount: products.reviewsCount,
          status: products.status,
          createdAt: products.createdAt,
          storeId: stores.id,
          storeSlug: stores.slug,
          storeName: stores.name,
          storeTagline: stores.tagline,
          storeAvatarUrl: stores.avatarUrl,
          storeVerified: stores.isVerified,
          categoryId: categories.id,
          categorySlug: categories.slug,
          categoryNameFr: categories.nameFr,
          categoryNameEn: categories.nameEn,
          categoryNameHt: categories.nameHt,
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, id))
        .limit(1);

      const product = rows[0];
      if (!product || product.status === 'removed') {
        return res.status(404).json({ error: 'Produit introuvable.' });
      }

      const productReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.productId, id))
        .orderBy(desc(reviews.createdAt));

      res.json({ product, reviews: productReviews });
    } catch (err) {
      console.error('Product detail error:', err);
      res.status(500).json({ error: 'Erreur lors du chargement du produit.' });
    }
  });

  router.post('/products/:id/reviews', async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const authorName = sanitizeText(String(req.body?.authorName || ''), 80);
      const authorEmail = String(req.body?.authorEmail || '').trim().toLowerCase();
      const rating = Number(req.body?.rating || 5);
      const comment = sanitizeText(String(req.body?.comment || ''), 1000);

      if (!Number.isInteger(productId) || !authorName || !isValidEmail(authorEmail) || !comment) {
        return res.status(400).json({ error: 'Veuillez renseigner votre nom, email et commentaire.' });
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Note invalide (1 à 5).' });
      }

      const authUser = await resolveUserFromRequest(req);

      const confirmedPurchase = await db
        .select({ orderId: orders.id })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.buyerEmail, authorEmail),
            eq(orders.paymentStatus, 'confirmed'),
            eq(orderItems.productId, productId)
          )
        )
        .limit(1);

      const [created] = await db
        .insert(reviews)
        .values({
          productId,
          userId: authUser?.id ?? null,
          authorName,
          authorEmail,
          rating,
          comment,
          isVerifiedPurchase: Boolean(confirmedPurchase[0]),
        })
        .returning();

      const allReviews = await db.select().from(reviews).where(eq(reviews.productId, productId));
      const avgScaled = Math.round(
        (allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length) * 100
      );

      await db
        .update(products)
        .set({
          ratingAvgScaled: avgScaled,
          reviewsCount: allReviews.length,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));

      res.status(201).json({ review: created });
    } catch (err) {
      console.error('Create review error:', err);
      res.status(500).json({ error: 'Impossible d’enregistrer votre avis.' });
    }
  });

  router.post('/reports', async (req, res) => {
    try {
      const productId = req.body?.productId ? Number(req.body.productId) : null;
      const storeId = req.body?.storeId ? Number(req.body.storeId) : null;
      const reporterEmail = String(req.body?.reporterEmail || '').trim().toLowerCase();
      const reason = sanitizeText(String(req.body?.reason || ''), 120);
      const details = sanitizeText(String(req.body?.details || ''), 1200);

      if (!isValidEmail(reporterEmail) || !reason || !details) {
        return res.status(400).json({ error: 'Email, motif et détails requis.' });
      }

      const [created] = await db
        .insert(reports)
        .values({
          productId,
          storeId,
          reporterEmail,
          reason,
          details,
          status: 'open',
        })
        .returning();

      res.status(201).json({ report: created });
    } catch (err) {
      console.error('Report error:', err);
      res.status(500).json({ error: 'Erreur lors du signalement.' });
    }
  });

  router.get('/stores', async (_req, res) => {
    try {
      const storeRows = await db
        .select()
        .from(stores)
        .where(eq(stores.status, 'active'))
        .orderBy(desc(stores.isVerified), stores.id);

      const allProducts = await db
        .select({
          storeId: products.storeId,
          salesCount: products.salesCount,
        })
        .from(products)
        .where(eq(products.status, 'published'));

      const enriched = storeRows.map((s) => {
        const storeProducts = allProducts.filter((p) => p.storeId === s.id);
        return {
          ...s,
          productsCount: storeProducts.length,
          totalSales: storeProducts.reduce((acc, p) => acc + p.salesCount, 0),
        };
      });

      res.json({ stores: enriched });
    } catch (err) {
      console.error('Stores list error:', err);
      res.status(500).json({ error: 'Erreur lors du chargement des boutiques.' });
    }
  });

  router.get('/stores/:slug', async (req, res) => {
    try {
      const slug = req.params.slug.trim().toLowerCase();
      const rows = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
      const store = rows[0];
      if (!store || store.status !== 'active') {
        return res.status(404).json({ error: 'Boutique introuvable.' });
      }

      const storeProducts = await db
        .select({
          id: products.id,
          title: products.title,
          slug: products.slug,
          description: products.description,
          priceUsdCents: products.priceUsdCents,
          coverUrl: products.coverUrl,
          fileName: products.fileName,
          fileSizeBytes: products.fileSizeBytes,
          productType: products.productType,
          salesCount: products.salesCount,
          ratingAvgScaled: products.ratingAvgScaled,
          reviewsCount: products.reviewsCount,
          categorySlug: categories.slug,
          categoryNameFr: categories.nameFr,
          categoryNameEn: categories.nameEn,
          categoryNameHt: categories.nameHt,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.storeId, store.id), eq(products.status, 'published')))
        .orderBy(desc(products.salesCount));

      res.json({ store, products: storeProducts });
    } catch (err) {
      console.error('Store detail error:', err);
      res.status(500).json({ error: 'Erreur lors du chargement de la boutique.' });
    }
  });

  // ================= CHECKOUT, ORDERS & PAYMENTS =================
  router.post('/orders', async (req, res) => {
    try {
      const buyerName = sanitizeText(String(req.body?.buyerName || ''), 100);
      const buyerEmail = String(req.body?.buyerEmail || '').trim().toLowerCase();
      const currency = (['USD', 'HTG', 'EUR'].includes(req.body?.currency) ? req.body.currency : 'USD') as Currency;
      const paymentMethod = req.body?.paymentMethod as PaymentMethod;
      const productIds: number[] = Array.isArray(req.body?.productIds)
        ? req.body.productIds.map(Number).filter(Number.isInteger)
        : [];

      if (!buyerName || !isValidEmail(buyerEmail)) {
        return res.status(400).json({ error: 'Nom complet et email valide requis.' });
      }
      if (!['moncash', 'natcash', 'paypal', 'usdt_bep20'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Mode de paiement invalide.' });
      }
      if (productIds.length === 0) {
        return res.status(400).json({ error: 'Votre panier est vide.' });
      }

      const uniqueIds = Array.from(new Set(productIds));
      const foundProducts = await db
        .select({
          id: products.id,
          title: products.title,
          priceUsdCents: products.priceUsdCents,
          status: products.status,
          storeId: stores.id,
          ownerId: stores.ownerId,
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .where(sql`${products.id} IN (${sql.join(uniqueIds.map((id) => sql`${id}`), sql`, `)})`);

      const validProducts = foundProducts.filter((p) => p.status === 'published');
      if (validProducts.length !== uniqueIds.length) {
        return res.status(400).json({ error: 'Un ou plusieurs produits ne sont plus disponibles.' });
      }

      const gateway = await getPaymentGatewayStatus(paymentMethod);
      if (!gateway.isEnabled) {
        return res.status(400).json({ error: 'Ce mode de paiement est temporairement désactivé.' });
      }

      const subtotalUsdCents = validProducts.reduce((acc, p) => acc + p.priceUsdCents, 0);
      const platformFeeUsdCents = validProducts.reduce(
        (acc, p) => acc + calculateCommissionSplit(p.priceUsdCents).platformCommissionUsdCents,
        0
      );
      const providerFeeUsdCents = calculateProviderFeeUsdCents(
        subtotalUsdCents,
        gateway.feePercentScaled,
        gateway.feeFixedUsdCents
      );
      const totalUsdCents = subtotalUsdCents + providerFeeUsdCents;
      const totalDisplayCents = convertUsdCentsToCurrencyCents(totalUsdCents, currency);

      const orderNumber = generateReference('MGD');
      const paymentReference = generateReference(paymentMethod.toUpperCase().slice(0, 4));
      const authUser = await resolveUserFromRequest(req);

      const [order] = await db
        .insert(orders)
        .values({
          orderNumber,
          buyerUserId: authUser?.id ?? null,
          buyerEmail,
          buyerName,
          currency,
          exchangeRateScaled: Math.round((CURRENCY_RATES[currency] ?? 1) * 10000),
          subtotalUsdCents,
          platformFeeUsdCents,
          providerFeeUsdCents,
          totalUsdCents,
          totalDisplayCents,
          paymentMethod,
          paymentStatus: 'pending',
          paymentReference,
        })
        .returning();

      for (const p of validProducts) {
        const split = calculateCommissionSplit(p.priceUsdCents);
        await db.insert(orderItems).values({
          orderId: order.id,
          productId: p.id,
          storeId: p.storeId,
          sellerUserId: p.ownerId,
          productTitle: p.title,
          grossUsdCents: split.grossUsdCents,
          platformCommissionUsdCents: split.platformCommissionUsdCents,
          sellerNetUsdCents: split.sellerNetUsdCents,
        });
      }

      await db.insert(paymentTransactions).values({
        orderId: order.id,
        provider: paymentMethod,
        environment: gateway.mode,
        idempotencyKey: paymentReference,
        amountUsdCents: totalUsdCents,
        providerFeeUsdCents,
        status: 'initiated',
      });

      const paymentIntent = await createPaymentIntent({
        orderNumber: order.orderNumber,
        paymentReference,
        provider: paymentMethod,
        totalUsdCents,
        providerFeeUsdCents,
        currency,
        totalDisplayCents,
      });

      res.status(201).json({ order, paymentIntent });
    } catch (err) {
      console.error('Create order error:', err);
      res.status(500).json({ error: 'Impossible de créer la commande.' });
    }
  });

  router.get('/orders/:orderNumber', async (req, res) => {
    try {
      const orderNumber = req.params.orderNumber.trim();
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);
      const order = rows[0];
      if (!order) {
        return res.status(404).json({ error: 'Commande introuvable.' });
      }

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const paymentIntent =
        order.paymentStatus !== 'confirmed'
          ? await createPaymentIntent({
              orderNumber: order.orderNumber,
              paymentReference: order.paymentReference,
              provider: order.paymentMethod as PaymentMethod,
              totalUsdCents: order.totalUsdCents,
              providerFeeUsdCents: order.providerFeeUsdCents,
              currency: order.currency as Currency,
              totalDisplayCents: order.totalDisplayCents,
            })
          : null;

      let downloadLinks: Array<{ productId: number; productTitle: string; token: string; expiresAt: string; downloadsLeft: number }> = [];
      if (order.paymentStatus === 'confirmed') {
        const tokens = await db
          .select()
          .from(downloadTokens)
          .where(eq(downloadTokens.orderId, order.id));

        downloadLinks = tokens.map((t) => {
          const item = items.find((i) => i.productId === t.productId);
          return {
            productId: t.productId,
            productTitle: item?.productTitle ?? 'Fichier numérique',
            token: signToken(
              { sub: String(order.id), purpose: 'download', meta: { productId: t.productId, tokenHash: t.tokenHash } },
              48 * 3600
            ),
            expiresAt: t.expiresAt.toISOString(),
            downloadsLeft: Math.max(0, t.maxDownloads - t.downloadCount),
          };
        });
      }

      res.json({ order, items, paymentIntent, downloadLinks });
    } catch (err) {
      console.error('Order lookup error:', err);
      res.status(500).json({ error: 'Erreur lors de la consultation de la commande.' });
    }
  });

  /**
   * Server-side payment verification endpoint.
   * NEVER confirms a payment from a screenshot or client claim alone.
   * In production without API keys, explicitly returns 409 Awaiting Configuration.
   * In sandbox mode, records explicit sandbox transaction verification.
   */
  router.post('/orders/:orderNumber/verify-payment', async (req, res) => {
    try {
      const orderNumber = req.params.orderNumber.trim();
      const txReference = sanitizeText(String(req.body?.transactionHashOrId || ''), 120);

      const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
      const order = rows[0];
      if (!order) {
        return res.status(404).json({ error: 'Commande introuvable.' });
      }

      const gateway = await getPaymentGatewayStatus(order.paymentMethod as PaymentMethod);

      // Strict check: if production mode and credentials are missing, do NOT fake confirmation!
      if (gateway.mode === 'production' && !gateway.isConfigured) {
        return res.status(409).json({
          status: 'awaiting_configuration',
          error: `Le module ${gateway.displayName} est en mode production mais ses identifiants API serveur ne sont pas encore configurés.`,
        });
      }

      // USDT BEP20 validation requires an explicit tx hash (0x...)
      if (order.paymentMethod === 'usdt_bep20') {
        if (!/^0x[a-fA-F0-9]{16,64}$/.test(txReference)) {
          return res.status(400).json({
            error:
              'Veuillez saisir un hash de transaction BEP20 valide (commençant par 0x). Une capture d’écran ne suffit jamais.',
          });
        }

        if (gateway.mode === 'production' && process.env.BSCSCAN_API_KEY) {
          // Real on-chain check via BscScan API
          const url = `https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${encodeURIComponent(
            txReference
          )}&apikey=${encodeURIComponent(process.env.BSCSCAN_API_KEY)}`;
          const bscRes = await fetch(url);
          const bscJson = (await bscRes.json()) as { status?: string; result?: { status?: string } };
          if (bscJson.result?.status !== '1') {
            return res.status(402).json({
              error: 'Transaction non confirmée sur BNB Smart Chain (BEP20). Vérification on-chain requise.',
            });
          }
        }
      } else if (gateway.mode === 'production') {
        // Production API verification guard for MonCash / NatCash / PayPal
        return res.status(202).json({
          status: 'awaiting_webhook',
          message: `Vérification API ${gateway.displayName} en attente de confirmation webhook sécurisé.`,
        });
      }

      const externalTxId =
        txReference ||
        `${order.paymentMethod.toUpperCase()}-SANDBOX-${generateReference('TX')}`;

      const result = await confirmOrderPayment({
        orderId: order.id,
        externalTxId,
        provider: order.paymentMethod as PaymentMethod,
        webhookVerified: gateway.mode === 'production',
        confirmationsCount: order.paymentMethod === 'usdt_bep20' ? 12 : 1,
        metadata: {
          mode: gateway.mode,
          verifiedAt: new Date().toISOString(),
        },
      });

      res.json({
        confirmed: true,
        environment: gateway.mode,
        ...result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de vérification';
      console.error('Verify payment error:', err);
      res.status(400).json({ error: msg });
    }
  });

  // Secured Webhook receiver (HMAC-SHA256 verified)
  router.post('/webhooks/:provider', async (req, res) => {
    try {
      const provider = req.params.provider as PaymentMethod;
      if (!['moncash', 'natcash', 'paypal', 'usdt_bep20'].includes(provider)) {
        return res.status(404).json({ error: 'Unknown provider' });
      }

      const secretMap: Record<PaymentMethod, string | undefined> = {
        moncash: process.env.MONCASH_WEBHOOK_SECRET,
        natcash: process.env.NATCASH_WEBHOOK_SECRET,
        paypal: process.env.PAYPAL_WEBHOOK_ID,
        usdt_bep20: process.env.BSCSCAN_API_KEY,
      };
      const secret = secretMap[provider] || '';
      const signature = String(req.headers['x-webhook-signature'] || '');
      const rawBody = JSON.stringify(req.body || {});

      if (!secret || !verifyWebhookHmac(rawBody, signature, secret)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const paymentReference = String(req.body?.paymentReference || '');
      const externalTxId = String(req.body?.transactionId || '');
      if (!paymentReference || !externalTxId) {
        return res.status(400).json({ error: 'Missing paymentReference or transactionId' });
      }

      const orderRows = await db
        .select()
        .from(orders)
        .where(eq(orders.paymentReference, paymentReference))
        .limit(1);
      const order = orderRows[0];
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const settled = await confirmOrderPayment({
        orderId: order.id,
        externalTxId,
        provider,
        webhookVerified: true,
        metadata: req.body as Record<string, unknown>,
      });

      res.json({ received: true, alreadyConfirmed: settled.alreadyConfirmed });
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Protected temporary download endpoint
  router.get('/download/:token', async (req, res) => {
    try {
      const token = req.params.token;
      const decoded = verifySignedToken(token, 'download');
      if (!decoded || !decoded.meta?.tokenHash || !decoded.meta?.productId) {
        return res.status(403).json({ error: 'Lien de téléchargement expiré ou invalide.' });
      }

      const tokenHash = String(decoded.meta.tokenHash);
      const productId = Number(decoded.meta.productId);

      const rows = await db
        .select()
        .from(downloadTokens)
        .where(eq(downloadTokens.tokenHash, tokenHash))
        .limit(1);
      const record = rows[0];
      if (!record || record.expiresAt.getTime() < Date.now() || record.downloadCount >= record.maxDownloads) {
        return res.status(403).json({ error: 'Limite de téléchargements atteinte ou lien expiré.' });
      }

      const prodRows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      const product = prodRows[0];
      if (!product) {
        return res.status(404).json({ error: 'Fichier introuvable.' });
      }

      await db
        .update(downloadTokens)
        .set({ downloadCount: sql`${downloadTokens.downloadCount} + 1` })
        .where(eq(downloadTokens.id, record.id));

      await db
        .update(orderItems)
        .set({ downloadCount: sql`${orderItems.downloadCount} + 1` })
        .where(and(eq(orderItems.orderId, record.orderId), eq(orderItems.productId, product.id)));

      const uploadCandidate = path.join(UPLOAD_DIR, product.fileStorageKey);
      const seedCandidate = path.join(STORAGE_ROOT, product.fileStorageKey);
      const targetPath = existsSync(uploadCandidate) ? uploadCandidate : seedCandidate;

      if (!existsSync(targetPath)) {
        const fallback = `MASSEILLAN GLOBAL DIGITAL\nProduit: ${product.title}\nLicence acheteur: ${record.buyerEmail}\n`;
        writeFileSync(seedCandidate, fallback, 'utf8');
      }

      const content = readFileSync(existsSync(uploadCandidate) ? uploadCandidate : seedCandidate);
      res.setHeader('Content-Disposition', `attachment; filename="${product.fileName.replace(/"/g, '')}"`);
      res.setHeader('Content-Type', product.fileMimeType || 'application/octet-stream');
      res.send(content);
    } catch (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Erreur lors du téléchargement.' });
    }
  });

  // ================= BUYER SPACE =================
  router.get('/buyer/orders', async (req, res) => {
    try {
      const authUser = await resolveUserFromRequest(req);
      const emailParam = String(req.query.email || '').trim().toLowerCase();

      const targetEmail = authUser?.email || (isValidEmail(emailParam) ? emailParam : '');
      if (!targetEmail) {
        return res.status(400).json({ error: 'Connexion ou email requis pour consulter vos commandes.' });
      }

      const userOrders = await db
        .select()
        .from(orders)
        .where(
          authUser
            ? or(eq(orders.buyerUserId, authUser.id), eq(orders.buyerEmail, authUser.email))
            : eq(orders.buyerEmail, targetEmail)
        )
        .orderBy(desc(orders.createdAt));

      const enriched = await Promise.all(
        userOrders.map(async (ord) => {
          const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
          let downloadLinks: Array<{ productId: number; productTitle: string; token: string; expiresAt: string }> = [];
          if (ord.paymentStatus === 'confirmed') {
            const tokens = await db
              .select()
              .from(downloadTokens)
              .where(eq(downloadTokens.orderId, ord.id));
            downloadLinks = tokens.map((t) => ({
              productId: t.productId,
              productTitle: items.find((i) => i.productId === t.productId)?.productTitle ?? 'Produit',
              token: signToken(
                { sub: String(ord.id), purpose: 'download', meta: { productId: t.productId, tokenHash: t.tokenHash } },
                48 * 3600
              ),
              expiresAt: t.expiresAt.toISOString(),
            }));
          }
          return { ...ord, items, downloadLinks };
        })
      );

      res.json({ orders: enriched });
    } catch (err) {
      console.error('Buyer orders error:', err);
      res.status(500).json({ error: 'Impossible de récupérer vos commandes.' });
    }
  });

  router.post('/refunds', async (req, res) => {
    try {
      const orderNumber = String(req.body?.orderNumber || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const reason = sanitizeText(String(req.body?.reason || ''), 1000);

      if (!orderNumber || !isValidEmail(email) || !reason) {
        return res.status(400).json({ error: 'Numéro de commande, email et motif requis.' });
      }

      const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
      const order = rows[0];
      if (!order || order.buyerEmail !== email) {
        return res.status(404).json({ error: 'Commande introuvable pour cet email.' });
      }

      const [refund] = await db
        .insert(refunds)
        .values({
          orderId: order.id,
          requestedByEmail: email,
          reason,
          amountUsdCents: order.totalUsdCents,
          status: 'pending',
        })
        .returning();

      res.status(201).json({ refund });
    } catch (err) {
      console.error('Refund request error:', err);
      res.status(500).json({ error: 'Impossible d’enregistrer la demande de remboursement.' });
    }
  });

  // ================= SELLER STUDIO =================
  router.get('/seller/overview', requireAuth, requireRole('seller', 'admin'), async (req: AuthedRequest, res) => {
    try {
      const user = req.authUser!;
      const storeRows = await db.select().from(stores).where(eq(stores.ownerId, user.id)).limit(1);
      const store = storeRows[0] || null;

      const walletRows = await db.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
      const wallet = walletRows[0] || {
        availableUsdCents: 0,
        pendingUsdCents: 0,
        totalEarnedUsdCents: 0,
        totalWithdrawnUsdCents: 0,
      };

      const sellerProducts = store
        ? await db
            .select({
              id: products.id,
              title: products.title,
              slug: products.slug,
              description: products.description,
              priceUsdCents: products.priceUsdCents,
              coverUrl: products.coverUrl,
              fileName: products.fileName,
              productType: products.productType,
              salesCount: products.salesCount,
              ratingAvgScaled: products.ratingAvgScaled,
              reviewsCount: products.reviewsCount,
              status: products.status,
              categoryId: products.categoryId,
              createdAt: products.createdAt,
            })
            .from(products)
            .where(eq(products.storeId, store.id))
            .orderBy(desc(products.createdAt))
        : [];

      const sales = await db
        .select({
          id: orderItems.id,
          orderNumber: orders.orderNumber,
          buyerName: orders.buyerName,
          buyerEmail: orders.buyerEmail,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
          productTitle: orderItems.productTitle,
          grossUsdCents: orderItems.grossUsdCents,
          platformCommissionUsdCents: orderItems.platformCommissionUsdCents,
          sellerNetUsdCents: orderItems.sellerNetUsdCents,
          createdAt: orderItems.createdAt,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(eq(orderItems.sellerUserId, user.id))
        .orderBy(desc(orderItems.createdAt));

      const walletHistory = walletRows[0]
        ? await db
            .select()
            .from(walletTransactions)
            .where(eq(walletTransactions.walletId, walletRows[0].id))
            .orderBy(desc(walletTransactions.createdAt))
        : [];

      const sellerWithdrawals = await db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.sellerUserId, user.id))
        .orderBy(desc(withdrawals.requestedAt));

      const productIds = sellerProducts.map((p) => p.id);
      const sellerReviews =
        productIds.length > 0
          ? await db
              .select()
              .from(reviews)
              .where(sql`${reviews.productId} IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)})`)
              .orderBy(desc(reviews.createdAt))
          : [];

      res.json({
        store,
        wallet,
        products: sellerProducts,
        sales,
        walletHistory,
        withdrawals: sellerWithdrawals,
        reviews: sellerReviews,
      });
    } catch (err) {
      console.error('Seller overview error:', err);
      res.status(500).json({ error: 'Erreur lors du chargement de l’espace vendeur.' });
    }
  });

  router.put('/seller/store', requireAuth, requireRole('seller', 'admin'), async (req: AuthedRequest, res) => {
    try {
      const user = req.authUser!;
      const name = sanitizeText(String(req.body?.name || ''), 100);
      const slugInput = slugifyText(String(req.body?.slug || name));
      const tagline = sanitizeText(String(req.body?.tagline || ''), 180);
      const bio = sanitizeText(String(req.body?.bio || ''), 1500);
      const accentColor = /^#[0-9a-fA-F]{6}$/.test(String(req.body?.accentColor || ''))
        ? String(req.body.accentColor)
        : '#2563EB';
      const country = sanitizeText(String(req.body?.country || 'HT'), 4);

      if (!name || !slugInput) {
        return res.status(400).json({ error: 'Nom et URL de boutique requis.' });
      }

      const existingSlug = await db.select().from(stores).where(eq(stores.slug, slugInput)).limit(1);
      if (existingSlug[0] && existingSlug[0].ownerId !== user.id) {
        return res.status(409).json({ error: 'Cette URL de boutique est déjà utilisée.' });
      }

      const [updated] = await db
        .update(stores)
        .set({
          name,
          slug: slugInput,
          tagline,
          bio,
          accentColor,
          country,
          updatedAt: new Date(),
        })
        .where(eq(stores.ownerId, user.id))
        .returning();

      res.json({ store: updated });
    } catch (err) {
      console.error('Update store error:', err);
      res.status(500).json({ error: 'Impossible de mettre à jour la boutique.' });
    }
  });

  router.post(
    '/seller/products',
    requireAuth,
    requireRole('seller', 'admin'),
    upload.single('file'),
    async (req: AuthedRequest, res) => {
      try {
        const user = req.authUser!;
        const storeRows = await db.select().from(stores).where(eq(stores.ownerId, user.id)).limit(1);
        const store = storeRows[0];
        if (!store) {
          return res.status(400).json({ error: 'Veuillez d’abord créer votre boutique.' });
        }

        const title = sanitizeText(String(req.body?.title || ''), 160);
        const description = sanitizeText(String(req.body?.description || ''), 3000);
        const priceUsd = Number(req.body?.priceUsd || 0);
        const categoryId = Number(req.body?.categoryId || 0);
        const productType = sanitizeText(String(req.body?.productType || 'ebook_pdf'), 50);
        const coverUrl =
          sanitizeText(String(req.body?.coverUrl || ''), 400) ||
          '/src/assets/images/product_ebook_mastery_1794684628002.jpg';

        if (!title || !description || !Number.isFinite(priceUsd) || priceUsd < 1 || !Number.isInteger(categoryId)) {
          return res.status(400).json({ error: 'Titre, description, catégorie et prix (>= $1) requis.' });
        }

        const priceUsdCents = Math.round(priceUsd * 100);
        const uploadedFile = req.file;
        let fileStorageKey = '';
        let fileName = sanitizeText(String(req.body?.fileName || `${slugifyText(title)}.txt`), 120);
        let fileMimeType = 'text/plain';
        let fileSizeBytes = 512;

        if (uploadedFile) {
          fileStorageKey = uploadedFile.filename;
          fileName = uploadedFile.originalname;
          fileMimeType = uploadedFile.mimetype;
          fileSizeBytes = uploadedFile.size;
        } else {
          const generatedKey = `${Date.now()}-${slugifyText(title)}.txt`;
          const content = `${title}\n\n${description}\n\nPublié par ${store.name} sur Masseillan Global Digital.\n`;
          writeFileSync(path.join(STORAGE_ROOT, generatedKey), content, 'utf8');
          fileStorageKey = generatedKey;
          fileSizeBytes = Buffer.byteLength(content, 'utf8');
        }

        const [created] = await db
          .insert(products)
          .values({
            storeId: store.id,
            categoryId,
            title,
            slug: slugifyText(title) || `product-${Date.now()}`,
            description,
            priceUsdCents,
            coverUrl,
            fileName,
            fileMimeType,
            fileSizeBytes,
            fileStorageKey,
            productType,
            status: 'published',
          })
          .returning();

        res.status(201).json({ product: created });
      } catch (err) {
        console.error('Create product error:', err);
        res.status(500).json({ error: 'Erreur lors de la création du produit.' });
      }
    }
  );

  router.patch('/seller/products/:id', requireAuth, requireRole('seller', 'admin'), async (req: AuthedRequest, res) => {
    try {
      const user = req.authUser!;
      const id = Number(req.params.id);
      const storeRows = await db.select().from(stores).where(eq(stores.ownerId, user.id)).limit(1);
      const store = storeRows[0];
      if (!store) return res.status(404).json({ error: 'Boutique introuvable.' });

      const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!existing[0] || (existing[0].storeId !== store.id && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }

      const title = req.body?.title ? sanitizeText(String(req.body.title), 160) : existing[0].title;
      const description = req.body?.description
        ? sanitizeText(String(req.body.description), 3000)
        : existing[0].description;
      const priceUsdCents = req.body?.priceUsd
        ? Math.max(100, Math.round(Number(req.body.priceUsd) * 100))
        : existing[0].priceUsdCents;
      const status =
        req.body?.status && ['published', 'draft'].includes(req.body.status)
          ? String(req.body.status)
          : existing[0].status;

      const [updated] = await db
        .update(products)
        .set({ title, description, priceUsdCents, status, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      res.json({ product: updated });
    } catch (err) {
      console.error('Update product error:', err);
      res.status(500).json({ error: 'Impossible de modifier le produit.' });
    }
  });

  router.delete('/seller/products/:id', requireAuth, requireRole('seller', 'admin'), async (req: AuthedRequest, res) => {
    try {
      const user = req.authUser!;
      const id = Number(req.params.id);
      const storeRows = await db.select().from(stores).where(eq(stores.ownerId, user.id)).limit(1);
      const store = storeRows[0];

      const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!existing[0] || (!store && user.role !== 'admin') || (store && existing[0].storeId !== store.id && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }

      await db
        .update(products)
        .set({ status: 'removed', updatedAt: new Date() })
        .where(eq(products.id, id));

      res.json({ deleted: true });
    } catch (err) {
      console.error('Delete product error:', err);
      res.status(500).json({ error: 'Impossible de supprimer le produit.' });
    }
  });

  router.post('/seller/withdrawals', requireAuth, requireRole('seller', 'admin'), async (req: AuthedRequest, res) => {
    try {
      const user = req.authUser!;
      const amountUsd = Number(req.body?.amountUsd || 0);
      const payoutMethod = String(req.body?.payoutMethod || '');
      const payoutDestination = sanitizeText(String(req.body?.payoutDestination || ''), 160);

      if (!Number.isFinite(amountUsd) || amountUsd < 5) {
        return res.status(400).json({ error: 'Montant minimum de retrait : $5.00 USD.' });
      }
      if (!['moncash', 'natcash', 'paypal', 'usdt_bep20', 'bank_transfer'].includes(payoutMethod)) {
        return res.status(400).json({ error: 'Méthode de retrait invalide.' });
      }
      if (payoutMethod === 'usdt_bep20' && !isValidBep20Address(payoutDestination)) {
        return res.status(400).json({ error: 'Adresse BEP20 invalide (doit commencer par 0x + 40 caractères hex).' });
      }
      if (!payoutDestination) {
        return res.status(400).json({ error: 'Destination de paiement requise.' });
      }

      const amountUsdCents = Math.round(amountUsd * 100);

      const created = await db.transaction(async (tx) => {
        const walletRows = await tx.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
        const wallet = walletRows[0];
        if (!wallet || wallet.availableUsdCents < amountUsdCents) {
          throw new Error('Solde disponible insuffisant pour ce retrait.');
        }

        await tx
          .update(wallets)
          .set({
            availableUsdCents: sql`${wallets.availableUsdCents} - ${amountUsdCents}`,
            pendingUsdCents: sql`${wallets.pendingUsdCents} + ${amountUsdCents}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id));

        const [withdrawal] = await tx
          .insert(withdrawals)
          .values({
            sellerUserId: user.id,
            walletId: wallet.id,
            amountUsdCents,
            payoutMethod,
            payoutDestination,
            status: 'pending',
          })
          .returning();

        await tx.insert(auditLogs).values({
          actorUserId: user.id,
          actorEmail: user.email,
          action: 'WITHDRAWAL_REQUESTED',
          targetType: 'withdrawal',
          targetId: String(withdrawal.id),
          details: { amountUsdCents, payoutMethod },
          ipAddress: req.ip || '',
        });

        return withdrawal;
      });

      res.status(201).json({ withdrawal: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la demande de retrait.';
      res.status(400).json({ error: msg });
    }
  });

  // ================= ADMIN CONSOLE =================
  router.get('/admin/overview', requireAuth, requireRole('admin'), async (_req: AuthedRequest, res) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      const allStores = await db.select().from(stores).orderBy(desc(stores.createdAt));
      const allProducts = await db
        .select({
          id: products.id,
          title: products.title,
          priceUsdCents: products.priceUsdCents,
          salesCount: products.salesCount,
          status: products.status,
          storeName: stores.name,
          categoryName: categories.nameFr,
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .orderBy(desc(products.createdAt));

      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      const allWithdrawals = await db
        .select({
          id: withdrawals.id,
          sellerUserId: withdrawals.sellerUserId,
          sellerEmail: users.email,
          sellerName: users.fullName,
          amountUsdCents: withdrawals.amountUsdCents,
          payoutMethod: withdrawals.payoutMethod,
          payoutDestination: withdrawals.payoutDestination,
          status: withdrawals.status,
          payoutReference: withdrawals.payoutReference,
          adminNote: withdrawals.adminNote,
          requestedAt: withdrawals.requestedAt,
          processedAt: withdrawals.processedAt,
        })
        .from(withdrawals)
        .innerJoin(users, eq(withdrawals.sellerUserId, users.id))
        .orderBy(desc(withdrawals.requestedAt));

      const allRefunds = await db.select().from(refunds).orderBy(desc(refunds.createdAt));
      const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
      const allCats = await db.select().from(categories).orderBy(categories.sortOrder);
      const gwConfigs = await db.select().from(paymentConfigs);
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(50);

      const confirmedOrders = allOrders.filter((o) => o.paymentStatus === 'confirmed');
      const pendingOrders = allOrders.filter(
        (o) => o.paymentStatus === 'pending' || o.paymentStatus === 'awaiting_confirmation'
      );
      const failedOrders = allOrders.filter((o) => o.paymentStatus === 'failed');

      const grossRevenueUsdCents = confirmedOrders.reduce((acc, o) => acc + o.subtotalUsdCents, 0);
      const totalCommissionUsdCents = confirmedOrders.reduce((acc, o) => acc + o.platformFeeUsdCents, 0);

      res.json({
        kpis: {
          totalUsers: allUsers.length,
          totalSellers: allUsers.filter((u) => u.role === 'seller' || u.role === 'admin').length,
          totalBuyers: allUsers.filter((u) => u.role === 'buyer').length,
          totalProducts: allProducts.filter((p) => p.status !== 'removed').length,
          totalSales: confirmedOrders.length,
          grossRevenueUsdCents,
          totalCommissionUsdCents,
          pendingTransactions: pendingOrders.length,
          confirmedTransactions: confirmedOrders.length,
          failedTransactions: failedOrders.length,
          pendingWithdrawals: allWithdrawals.filter((w) => w.status === 'pending').length,
        },
        users: allUsers,
        stores: allStores,
        products: allProducts,
        categories: allCats,
        orders: allOrders,
        withdrawals: allWithdrawals,
        refunds: allRefunds,
        reports: allReports,
        paymentConfigs: gwConfigs,
        auditLogs: logs,
      });
    } catch (err) {
      console.error('Admin overview error:', err);
      res.status(500).json({ error: 'Erreur lors du chargement de la console administrateur.' });
    }
  });

  router.patch('/admin/users/:id/status', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      const status = req.body?.status === 'suspended' ? 'suspended' : 'active';
      const [updated] = await db
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      await db.insert(auditLogs).values({
        actorUserId: req.authUser!.id,
        actorEmail: req.authUser!.email,
        action: `USER_${status.toUpperCase()}`,
        targetType: 'user',
        targetId: String(id),
        details: { status },
        ipAddress: req.ip || '',
      });
      res.json({ user: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erreur mise à jour utilisateur.' });
    }
  });

  router.patch('/admin/stores/:id/status', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      const status = req.body?.status === 'suspended' ? 'suspended' : 'active';
      const isVerified = typeof req.body?.isVerified === 'boolean' ? req.body.isVerified : undefined;
      const [updated] = await db
        .update(stores)
        .set({
          status,
          ...(isVerified !== undefined ? { isVerified } : {}),
          updatedAt: new Date(),
        })
        .where(eq(stores.id, id))
        .returning();
      res.json({ store: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erreur mise à jour boutique.' });
    }
  });

  router.patch('/admin/products/:id/status', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      const status = ['published', 'draft', 'removed'].includes(req.body?.status)
        ? String(req.body.status)
        : 'removed';
      const [updated] = await db
        .update(products)
        .set({ status, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      await db.insert(auditLogs).values({
        actorUserId: req.authUser!.id,
        actorEmail: req.authUser!.email,
        action: `PRODUCT_STATUS_${status.toUpperCase()}`,
        targetType: 'product',
        targetId: String(id),
        details: { status },
        ipAddress: req.ip || '',
      });
      res.json({ product: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erreur modération produit.' });
    }
  });

  router.post('/admin/categories', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const nameFr = sanitizeText(String(req.body?.nameFr || ''), 80);
      const nameEn = sanitizeText(String(req.body?.nameEn || nameFr), 80);
      const nameHt = sanitizeText(String(req.body?.nameHt || nameFr), 80);
      if (!nameFr) return res.status(400).json({ error: 'Nom requis.' });

      const [cat] = await db
        .insert(categories)
        .values({
          slug: slugifyText(nameFr),
          nameFr,
          nameEn,
          nameHt,
          description: sanitizeText(String(req.body?.description || ''), 300),
          sortOrder: Number(req.body?.sortOrder || 20),
          isActive: true,
        })
        .returning();
      res.status(201).json({ category: cat });
    } catch (err) {
      res.status(500).json({ error: 'Erreur création catégorie.' });
    }
  });

  router.patch('/admin/withdrawals/:id', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      const action = String(req.body?.status || ''); // 'approved' | 'paid' | 'rejected'
      const payoutReference = sanitizeText(String(req.body?.payoutReference || ''), 120);
      const adminNote = sanitizeText(String(req.body?.adminNote || ''), 300);

      if (!['approved', 'paid', 'rejected'].includes(action)) {
        return res.status(400).json({ error: 'Action retrait invalide.' });
      }
      if (action === 'paid' && !payoutReference) {
        return res.status(400).json({ error: 'Une référence de paiement réelle est requise pour marquer payé.' });
      }

      const updated = await db.transaction(async (tx) => {
        const rows = await tx.select().from(withdrawals).where(eq(withdrawals.id, id)).limit(1);
        const wd = rows[0];
        if (!wd) throw new Error('Demande introuvable.');
        if (wd.status === 'paid' || wd.status === 'rejected') {
          throw new Error('Cette demande a déjà été clôturée.');
        }

        if (action === 'paid') {
          await tx
            .update(wallets)
            .set({
              pendingUsdCents: sql`GREATEST(0, ${wallets.pendingUsdCents} - ${wd.amountUsdCents})`,
              totalWithdrawnUsdCents: sql`${wallets.totalWithdrawnUsdCents} + ${wd.amountUsdCents}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.id, wd.walletId));

          await tx.insert(walletTransactions).values({
            walletId: wd.walletId,
            withdrawalId: wd.id,
            type: 'withdrawal_debit',
            amountUsdCents: -wd.amountUsdCents,
            commissionUsdCents: 0,
            description: `Versement effectué (${wd.payoutMethod}) · Réf: ${payoutReference}`,
          });
        } else if (action === 'rejected') {
          await tx
            .update(wallets)
            .set({
              pendingUsdCents: sql`GREATEST(0, ${wallets.pendingUsdCents} - ${wd.amountUsdCents})`,
              availableUsdCents: sql`${wallets.availableUsdCents} + ${wd.amountUsdCents}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.id, wd.walletId));
        }

        const [result] = await tx
          .update(withdrawals)
          .set({
            status: action,
            payoutReference: payoutReference || wd.payoutReference,
            adminNote,
            processedAt: new Date(),
          })
          .where(eq(withdrawals.id, id))
          .returning();

        await tx.insert(auditLogs).values({
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          action: `WITHDRAWAL_${action.toUpperCase()}`,
          targetType: 'withdrawal',
          targetId: String(id),
          details: { payoutReference, adminNote },
          ipAddress: req.ip || '',
        });

        return result;
      });

      res.json({ withdrawal: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur traitement retrait.' });
    }
  });

  router.patch('/admin/refunds/:id', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      const status = req.body?.status === 'processed' ? 'processed' : req.body?.status === 'rejected' ? 'rejected' : 'approved';
      const adminNote = sanitizeText(String(req.body?.adminNote || ''), 300);

      const [updated] = await db
        .update(refunds)
        .set({ status, adminNote, processedAt: new Date() })
        .where(eq(refunds.id, id))
        .returning();

      if (updated && status === 'processed') {
        await db
          .update(orders)
          .set({ paymentStatus: 'refunded', updatedAt: new Date() })
          .where(eq(orders.id, updated.orderId));
      }

      res.json({ refund: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erreur traitement remboursement.' });
    }
  });

  router.patch('/admin/reports/:id', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      const status = req.body?.status === 'dismissed' ? 'dismissed' : 'resolved';
      const adminResolution = sanitizeText(String(req.body?.adminResolution || ''), 300);
      const [updated] = await db
        .update(reports)
        .set({ status, adminResolution, resolvedAt: new Date() })
        .where(eq(reports.id, id))
        .returning();
      res.json({ report: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erreur mise à jour signalement.' });
    }
  });

  router.patch('/admin/payment-configs/:provider', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const provider = req.params.provider;
      const isEnabled = typeof req.body?.isEnabled === 'boolean' ? req.body.isEnabled : true;
      const mode = req.body?.mode === 'production' ? 'production' : 'sandbox';
      const publicIdentifier = sanitizeText(String(req.body?.publicIdentifier || ''), 160);
      const instructions = sanitizeText(String(req.body?.instructions || ''), 500);
      const feePercentScaled = Number.isInteger(req.body?.feePercentScaled)
        ? Math.max(0, Number(req.body.feePercentScaled))
        : undefined;

      const [updated] = await db
        .update(paymentConfigs)
        .set({
          isEnabled,
          mode,
          publicIdentifier,
          instructions,
          ...(feePercentScaled !== undefined ? { feePercentScaled } : {}),
          updatedAt: new Date(),
        })
        .where(eq(paymentConfigs.provider, provider))
        .returning();

      await db.insert(auditLogs).values({
        actorUserId: req.authUser!.id,
        actorEmail: req.authUser!.email,
        action: 'PAYMENT_CONFIG_UPDATED',
        targetType: 'payment_config',
        targetId: provider,
        details: { isEnabled, mode },
        ipAddress: req.ip || '',
      });

      res.json({ config: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erreur configuration paiement.' });
    }
  });

  // ================= CONTACT =================
  router.post('/contact', async (req, res) => {
    try {
      const name = sanitizeText(String(req.body?.name || ''), 100);
      const email = String(req.body?.email || '').trim().toLowerCase();
      const subject = sanitizeText(String(req.body?.subject || ''), 150);
      const message = sanitizeText(String(req.body?.message || ''), 2000);

      if (!name || !isValidEmail(email) || !subject || !message) {
        return res.status(400).json({ error: 'Tous les champs du formulaire sont obligatoires.' });
      }

      const [saved] = await db
        .insert(contactMessages)
        .values({ name, email, subject, message, status: 'new' })
        .returning();

      res.status(201).json({ contactMessage: saved });
    } catch (err) {
      console.error('Contact error:', err);
      res.status(500).json({ error: 'Impossible d’envoyer votre message.' });
    }
  });

  return router;
}
