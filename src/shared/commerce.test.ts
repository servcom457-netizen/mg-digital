import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCommissionSplit,
  calculateProviderFeeUsdCents,
  convertUsdCentsToCurrencyCents,
  formatMoneyFromUsdCents,
  isValidBep20Address,
  isValidEmail,
  slugifyText,
} from './commerce';

test('calculateCommissionSplit applies exact 5% fee on $20.00 product', () => {
  const split = calculateCommissionSplit(2000);
  assert.equal(split.grossUsdCents, 2000);
  assert.equal(split.platformCommissionUsdCents, 100); // $1.00
  assert.equal(split.sellerNetUsdCents, 1900); // $19.00
  assert.equal(
    split.platformCommissionUsdCents + split.sellerNetUsdCents,
    split.grossUsdCents
  );
});

test('calculateCommissionSplit preserves integer cent invariant on odd prices', () => {
  const split = calculateCommissionSplit(1999);
  assert.equal(split.platformCommissionUsdCents + split.sellerNetUsdCents, 1999);
});

test('calculateProviderFeeUsdCents calculates gateway fees separately from platform 5%', () => {
  // e.g. PayPal 2.90% + $0.30 on $20.00 => 58 + 30 = 88 cents
  const fee = calculateProviderFeeUsdCents(2000, 290, 30);
  assert.equal(fee, 88);
});

test('currency conversion converts USD cents to HTG and EUR accurately', () => {
  assert.equal(convertUsdCentsToCurrencyCents(2000, 'USD'), 2000);
  assert.equal(convertUsdCentsToCurrencyCents(2000, 'HTG'), 265000);
  assert.equal(convertUsdCentsToCurrencyCents(2000, 'EUR'), 1840);
  assert.ok(formatMoneyFromUsdCents(2000, 'USD').includes('20.00'));
  assert.ok(formatMoneyFromUsdCents(2000, 'HTG').includes('HTG'));
  assert.ok(formatMoneyFromUsdCents(2000, 'EUR').includes('€'));
});

test('validators check email, store slugs, and BEP20 addresses', () => {
  assert.equal(slugifyText('Boutique Créole & Design!'), 'boutique-creole-design');
  assert.equal(isValidEmail('creator@masseillanglobal.com'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidBep20Address('0x742d35Cc6634C0532925a3b844Bc454e4438f44e'), true);
  assert.equal(isValidBep20Address('0x1234'), false);
});
