import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('buyer'), // 'admin' | 'seller' | 'buyer'
  status: text('status').notNull().default('active'), // 'active' | 'suspended'
  preferredLang: text('preferred_lang').notNull().default('fr'), // 'fr' | 'en' | 'ht'
  preferredCurrency: text('preferred_currency').notNull().default('USD'), // 'USD' | 'HTG' | 'EUR'
  resetTokenHash: text('reset_token_hash'),
  resetTokenExpiresAt: timestamp('reset_token_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id')
    .references(() => users.id)
    .notNull()
    .unique(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull().default(''),
  bio: text('bio').notNull().default(''),
  accentColor: text('accent_color').notNull().default('#2563EB'),
  bannerUrl: text('banner_url').notNull().default(''),
  avatarUrl: text('avatar_url').notNull().default(''),
  country: text('country').notNull().default('HT'),
  isVerified: boolean('is_verified').notNull().default(false),
  status: text('status').notNull().default('active'), // 'active' | 'suspended'
  socialLinks: jsonb('social_links').$type<Record<string, string>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameFr: text('name_fr').notNull(),
  nameEn: text('name_en').notNull(),
  nameHt: text('name_ht').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id')
    .references(() => stores.id)
    .notNull(),
  categoryId: integer('category_id')
    .references(() => categories.id)
    .notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  description: text('description').notNull(),
  priceUsdCents: integer('price_usd_cents').notNull(),
  coverUrl: text('cover_url').notNull(),
  fileName: text('file_name').notNull(),
  fileMimeType: text('file_mime_type').notNull().default('application/pdf'),
  fileSizeBytes: integer('file_size_bytes').notNull().default(1024),
  fileStorageKey: text('file_storage_key').notNull(),
  productType: text('product_type').notNull(),
  salesCount: integer('sales_count').notNull().default(0),
  ratingAvgScaled: integer('rating_avg_scaled').notNull().default(0), // e.g. 485 = 4.85
  reviewsCount: integer('reviews_count').notNull().default(0),
  status: text('status').notNull().default('published'), // 'published' | 'draft' | 'removed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  buyerUserId: integer('buyer_user_id').references(() => users.id),
  buyerEmail: text('buyer_email').notNull(),
  buyerName: text('buyer_name').notNull(),
  currency: text('currency').notNull().default('USD'), // 'USD' | 'HTG' | 'EUR'
  exchangeRateScaled: integer('exchange_rate_scaled').notNull().default(10000), // 1.0000 = 10000
  subtotalUsdCents: integer('subtotal_usd_cents').notNull(),
  platformFeeUsdCents: integer('platform_fee_usd_cents').notNull(),
  providerFeeUsdCents: integer('provider_fee_usd_cents').notNull().default(0),
  totalUsdCents: integer('total_usd_cents').notNull(),
  totalDisplayCents: integer('total_display_cents').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'moncash' | 'natcash' | 'paypal' | 'usdt_bep20'
  paymentStatus: text('payment_status').notNull().default('pending'), // 'pending' | 'awaiting_confirmation' | 'confirmed' | 'failed' | 'refunded'
  paymentReference: text('payment_reference').notNull().unique(),
  providerTransactionId: text('provider_transaction_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  storeId: integer('store_id')
    .references(() => stores.id)
    .notNull(),
  sellerUserId: integer('seller_user_id')
    .references(() => users.id)
    .notNull(),
  productTitle: text('product_title').notNull(),
  grossUsdCents: integer('gross_usd_cents').notNull(),
  platformCommissionUsdCents: integer('platform_commission_usd_cents').notNull(),
  sellerNetUsdCents: integer('seller_net_usd_cents').notNull(),
  downloadCount: integer('download_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull()
    .unique(),
  availableUsdCents: integer('available_usd_cents').notNull().default(0),
  pendingUsdCents: integer('pending_usd_cents').notNull().default(0),
  totalEarnedUsdCents: integer('total_earned_usd_cents').notNull().default(0),
  totalWithdrawnUsdCents: integer('total_withdrawn_usd_cents').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const withdrawals = pgTable('withdrawals', {
  id: serial('id').primaryKey(),
  sellerUserId: integer('seller_user_id')
    .references(() => users.id)
    .notNull(),
  walletId: integer('wallet_id')
    .references(() => wallets.id)
    .notNull(),
  amountUsdCents: integer('amount_usd_cents').notNull(),
  payoutMethod: text('payout_method').notNull(), // 'moncash' | 'natcash' | 'paypal' | 'usdt_bep20' | 'bank_transfer'
  payoutDestination: text('payout_destination').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'paid' | 'rejected'
  adminNote: text('admin_note').notNull().default(''),
  payoutReference: text('payout_reference').notNull().default(''),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});

export const walletTransactions = pgTable('wallet_transactions', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id')
    .references(() => wallets.id)
    .notNull(),
  orderId: integer('order_id').references(() => orders.id),
  withdrawalId: integer('withdrawal_id').references(() => withdrawals.id),
  type: text('type').notNull(), // 'sale_credit' | 'withdrawal_debit' | 'refund_debit' | 'adjustment'
  amountUsdCents: integer('amount_usd_cents').notNull(),
  commissionUsdCents: integer('commission_usd_cents').notNull().default(0),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const paymentTransactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  provider: text('provider').notNull(), // 'moncash' | 'natcash' | 'paypal' | 'usdt_bep20'
  environment: text('environment').notNull().default('sandbox'), // 'sandbox' | 'production'
  externalTxId: text('external_tx_id'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  amountUsdCents: integer('amount_usd_cents').notNull(),
  providerFeeUsdCents: integer('provider_fee_usd_cents').notNull().default(0),
  status: text('status').notNull().default('initiated'), // 'initiated' | 'pending' | 'confirmed' | 'failed' | 'refunded'
  confirmationsCount: integer('confirmations_count').notNull().default(0),
  webhookVerified: boolean('webhook_verified').notNull().default(false),
  rawMetadata: jsonb('raw_metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const paymentConfigs = pgTable('payment_configs', {
  id: serial('id').primaryKey(),
  provider: text('provider').notNull().unique(), // 'moncash' | 'natcash' | 'paypal' | 'usdt_bep20'
  displayName: text('display_name').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  mode: text('mode').notNull().default('sandbox'), // 'sandbox' | 'production'
  isConfigured: boolean('is_configured').notNull().default(false),
  publicIdentifier: text('public_identifier').notNull().default(''),
  feePercentScaled: integer('fee_percent_scaled').notNull().default(0), // e.g. 290 = 2.90%
  feeFixedUsdCents: integer('fee_fixed_usd_cents').notNull().default(0),
  instructions: text('instructions').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const downloadTokens = pgTable('download_tokens', {
  id: serial('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  buyerEmail: text('buyer_email').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  maxDownloads: integer('max_downloads').notNull().default(5),
  downloadCount: integer('download_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  userId: integer('user_id').references(() => users.id),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id),
  storeId: integer('store_id').references(() => stores.id),
  reporterEmail: text('reporter_email').notNull(),
  reason: text('reason').notNull(),
  details: text('details').notNull(),
  status: text('status').notNull().default('open'), // 'open' | 'resolved' | 'dismissed'
  adminResolution: text('admin_resolution').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

export const refunds = pgTable('refunds', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  requestedByEmail: text('requested_by_email').notNull(),
  reason: text('reason').notNull(),
  amountUsdCents: integer('amount_usd_cents').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'processed'
  adminNote: text('admin_note').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id').references(() => users.id),
  actorEmail: text('actor_email').notNull().default('system'),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  ipAddress: text('ip_address').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  store: one(stores, {
    fields: [users.id],
    references: [stores.ownerId],
  }),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  orders: many(orders),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, {
    fields: [stores.ownerId],
    references: [users.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerUserId],
    references: [users.id],
  }),
  items: many(orderItems),
  payments: many(paymentTransactions),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [orderItems.storeId],
    references: [stores.id],
  }),
}));
