import QRCode from 'qrcode';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  auditLogs,
  downloadTokens,
  orderItems,
  orders,
  paymentConfigs,
  paymentTransactions,
  products,
  wallets,
  walletTransactions,
} from '../db/schema.ts';
import {
  CURRENCY_RATES,
  type Currency,
  type PaymentMethod,
} from '../shared/commerce.ts';
import { generateReference, sha256Hex, signToken } from './crypto.ts';

export interface PaymentIntentResult {
  provider: PaymentMethod;
  environment: 'sandbox' | 'production';
  isConfigured: boolean;
  status: 'awaiting_configuration' | 'pending' | 'awaiting_confirmation';
  paymentReference: string;
  exactAmountUsd: string;
  exactAmountDisplay: string;
  currency: Currency;
  providerFeeUsdCents: number;
  qrCodeDataUrl: string | null;
  merchantAddress: string | null;
  networkLabel: string | null;
  checkoutUrl: string | null;
  instructions: string;
}

export async function getPaymentGatewayStatus(provider: PaymentMethod) {
  const rows = await db
    .select()
    .from(paymentConfigs)
    .where(eq(paymentConfigs.provider, provider))
    .limit(1);
  const config = rows[0];
  if (!config) {
    throw new Error(`Payment provider ${provider} not registered`);
  }

  let envConfigured = false;
  let merchantAddress: string | null = null;
  if (provider === 'moncash') {
    envConfigured = Boolean(process.env.MONCASH_CLIENT_ID && process.env.MONCASH_CLIENT_SECRET);
  } else if (provider === 'natcash') {
    envConfigured = Boolean(process.env.NATCASH_MERCHANT_ID && process.env.NATCASH_API_KEY);
  } else if (provider === 'paypal') {
    envConfigured = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  } else if (provider === 'usdt_bep20') {
    merchantAddress = process.env.USDT_BEP20_MERCHANT_ADDRESS || config.publicIdentifier;
    envConfigured = Boolean(
      merchantAddress &&
        merchantAddress !== '0x0000000000000000000000000000000000000000' &&
        /^0x[a-fA-F0-9]{40}$/.test(merchantAddress)
    );
  }

  return {
    ...config,
    isConfigured: config.isConfigured || envConfigured,
    merchantAddress,
  };
}

export async function createPaymentIntent(params: {
  orderNumber: string;
  paymentReference: string;
  provider: PaymentMethod;
  totalUsdCents: number;
  providerFeeUsdCents: number;
  currency: Currency;
  totalDisplayCents: number;
}): Promise<PaymentIntentResult> {
  const gateway = await getPaymentGatewayStatus(params.provider);
  const exactUsd = (params.totalUsdCents / 100).toFixed(2);
  const rate = CURRENCY_RATES[params.currency] ?? 1;
  const displayAmount = ((params.totalUsdCents * rate) / 100).toFixed(2);
  const mode = gateway.mode === 'production' ? 'production' : 'sandbox';

  let qrPayload = '';
  let merchantAddress: string | null = null;
  let networkLabel: string | null = null;
  let instructions = gateway.instructions;

  if (params.provider === 'moncash') {
    const htgAmount = ((params.totalUsdCents * CURRENCY_RATES.HTG) / 100).toFixed(2);
    qrPayload = `moncash://pay?ref=${encodeURIComponent(params.paymentReference)}&amount=${htgAmount}&currency=HTG`;
    instructions = gateway.isConfigured
      ? `MonCash API (${mode}) : Réglez ${htgAmount} HTG avec la référence ${params.paymentReference}.`
      : `Module MonCash prêt (${mode === 'production' ? 'en attente des identifiants API officiels' : 'mode Sandbox / Test'}). Référence : ${params.paymentReference}.`;
  } else if (params.provider === 'natcash') {
    const htgAmount = ((params.totalUsdCents * CURRENCY_RATES.HTG) / 100).toFixed(2);
    qrPayload = `natcash://merchant/pay?ref=${encodeURIComponent(params.paymentReference)}&amount=${htgAmount}&currency=HTG`;
    instructions = gateway.isConfigured
      ? `NatCash (${mode}) : Réglez ${htgAmount} HTG avec la référence ${params.paymentReference}.`
      : `Module NatCash prêt (${mode === 'production' ? 'en attente de l’API marchand NatCash' : 'mode Sandbox / Test'}). Référence : ${params.paymentReference}.`;
  } else if (params.provider === 'paypal') {
    qrPayload = `https://www.paypal.com/checkoutnow?reference=${encodeURIComponent(params.paymentReference)}&amount=${exactUsd}`;
    instructions = gateway.isConfigured
      ? `PayPal Checkout (${mode}) : Payez $${exactUsd} USD par compte PayPal ou carte bancaire.`
      : `Module PayPal Checkout prêt (${mode === 'production' ? 'en attente de PAYPAL_CLIENT_ID / SECRET' : 'mode Sandbox / Test'}).`;
  } else if (params.provider === 'usdt_bep20') {
    merchantAddress =
      gateway.merchantAddress ||
      gateway.publicIdentifier ||
      '0x0000000000000000000000000000000000000000';
    networkLabel = 'BNB Smart Chain (BEP20) — USDT';
    qrPayload = `ethereum:${merchantAddress}@56?value=${exactUsd}&memo=${encodeURIComponent(params.paymentReference)}`;
    instructions = `Envoyez exactement ${exactUsd} USDT sur le réseau BNB Smart Chain (BEP20) à l'adresse officielle ci-dessous avec la référence ${params.paymentReference}.`;
  }

  const qrCodeDataUrl = qrPayload
    ? await QRCode.toDataURL(qrPayload, {
        width: 220,
        margin: 1,
        color: { dark: '#0B1221', light: '#FFFFFF' },
      })
    : null;

  return {
    provider: params.provider,
    environment: mode,
    isConfigured: gateway.isConfigured,
    status: !gateway.isConfigured && mode === 'production' ? 'awaiting_configuration' : 'pending',
    paymentReference: params.paymentReference,
    exactAmountUsd: exactUsd,
    exactAmountDisplay: `${displayAmount} ${params.currency}`,
    currency: params.currency,
    providerFeeUsdCents: params.providerFeeUsdCents,
    qrCodeDataUrl,
    merchantAddress,
    networkLabel,
    checkoutUrl: params.provider === 'paypal' && gateway.isConfigured ? qrPayload : null,
    instructions,
  };
}

/**
 * Atomically confirms an order payment, enforces idempotency against double payments,
 * credits seller wallets (95% net, 5% platform fee recorded), increments sales counts,
 * and mints protected temporary download tokens.
 */
export async function confirmOrderPayment(params: {
  orderId: number;
  externalTxId: string;
  provider: PaymentMethod;
  webhookVerified: boolean;
  confirmationsCount?: number;
  metadata?: Record<string, unknown>;
}): Promise<{ alreadyConfirmed: boolean; downloadLinks: Array<{ productId: number; productTitle: string; token: string; expiresAt: string }> }> {
  return await db.transaction(async (tx) => {
    const orderRows = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);
    const order = orderRows[0];
    if (!order) {
      throw new Error('Order not found');
    }

    // Double-payment / replay protection
    if (order.paymentStatus === 'confirmed') {
      const existingTokens = await tx
        .select()
        .from(downloadTokens)
        .where(eq(downloadTokens.orderId, order.id));
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      return {
        alreadyConfirmed: true,
        downloadLinks: existingTokens.map((t) => {
          const item = items.find((i) => i.productId === t.productId);
          return {
            productId: t.productId,
            productTitle: item?.productTitle ?? 'Digital Product',
            token: signToken(
              { sub: String(order.id), purpose: 'download', meta: { productId: t.productId, tokenHash: t.tokenHash } },
              48 * 3600
            ),
            expiresAt: t.expiresAt.toISOString(),
          };
        }),
      };
    }

    // Prevent reusing the same externalTxId across two orders
    const duplicateExternal = await tx
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.externalTxId, params.externalTxId))
      .limit(1);

    if (duplicateExternal[0] && duplicateExternal[0].orderId !== order.id && duplicateExternal[0].status === 'confirmed') {
      throw new Error('Duplicate external transaction ID detected — blocked to prevent double-spend');
    }

    await tx
      .update(orders)
      .set({
        paymentStatus: 'confirmed',
        providerTransactionId: params.externalTxId,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await tx
      .update(paymentTransactions)
      .set({
        externalTxId: params.externalTxId,
        status: 'confirmed',
        webhookVerified: params.webhookVerified,
        confirmationsCount: params.confirmationsCount ?? 1,
        rawMetadata: params.metadata ?? {},
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.orderId, order.id));

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const issuedLinks: Array<{ productId: number; productTitle: string; token: string; expiresAt: string }> = [];

    for (const item of items) {
      // Increment product sales count
      await tx
        .update(products)
        .set({
          salesCount: sql`${products.salesCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));

      // Upsert & credit seller wallet with 95% net revenue
      const walletRows = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, item.sellerUserId))
        .limit(1);

      let walletId = walletRows[0]?.id;
      if (!walletId) {
        const [created] = await tx
          .insert(wallets)
          .values({
            userId: item.sellerUserId,
            availableUsdCents: item.sellerNetUsdCents,
            pendingUsdCents: 0,
            totalEarnedUsdCents: item.sellerNetUsdCents,
            totalWithdrawnUsdCents: 0,
          })
          .returning();
        walletId = created.id;
      } else {
        await tx
          .update(wallets)
          .set({
            availableUsdCents: sql`${wallets.availableUsdCents} + ${item.sellerNetUsdCents}`,
            totalEarnedUsdCents: sql`${wallets.totalEarnedUsdCents} + ${item.sellerNetUsdCents}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, walletId));
      }

      await tx.insert(walletTransactions).values({
        walletId,
        orderId: order.id,
        type: 'sale_credit',
        amountUsdCents: item.sellerNetUsdCents,
        commissionUsdCents: item.platformCommissionUsdCents,
        description: `Vente #${order.orderNumber} — ${item.productTitle} (Brut: $${(item.grossUsdCents / 100).toFixed(2)} | Commission 5%: $${(item.platformCommissionUsdCents / 100).toFixed(2)} | Net: $${(item.sellerNetUsdCents / 100).toFixed(2)})`,
      });

      // Mint protected temporary download token (valid 48h, max 5 downloads)
      const rawNonce = generateReference('DL');
      const tokenHash = sha256Hex(`${order.id}:${item.productId}:${rawNonce}`);
      const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

      await tx.insert(downloadTokens).values({
        tokenHash,
        orderId: order.id,
        productId: item.productId,
        buyerEmail: order.buyerEmail,
        expiresAt,
        maxDownloads: 5,
        downloadCount: 0,
      });

      const signedToken = signToken(
        {
          sub: String(order.id),
          purpose: 'download',
          meta: { productId: item.productId, tokenHash },
        },
        48 * 3600
      );

      issuedLinks.push({
        productId: item.productId,
        productTitle: item.productTitle,
        token: signedToken,
        expiresAt: expiresAt.toISOString(),
      });
    }

    await tx.insert(auditLogs).values({
      actorUserId: order.buyerUserId,
      actorEmail: order.buyerEmail,
      action: 'ORDER_PAYMENT_CONFIRMED',
      targetType: 'order',
      targetId: order.orderNumber,
      details: {
        provider: params.provider,
        externalTxId: params.externalTxId,
        webhookVerified: params.webhookVerified,
        platformFeeUsdCents: order.platformFeeUsdCents,
      },
      ipAddress: 'server',
    });

    return {
      alreadyConfirmed: false,
      downloadLinks: issuedLinks,
    };
  });
}
