import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  generateReference,
  hashPassword,
  signToken,
  verifyPassword,
  verifySignedToken,
  verifyWebhookHmac,
} from './crypto';

test('hashPassword and verifyPassword securely validate credentials', () => {
  const hash = hashPassword('Masseillan!2026');
  assert.equal(verifyPassword('Masseillan!2026', hash), true);
  assert.equal(verifyPassword('WrongPassword', hash), false);
});

test('signToken and verifySignedToken enforce purpose and expiration', () => {
  const token = signToken({ sub: '42', role: 'seller', purpose: 'session' }, 3600);
  const decoded = verifySignedToken(token, 'session');
  assert.ok(decoded);
  assert.equal(decoded?.sub, '42');
  assert.equal(decoded?.role, 'seller');
  assert.equal(verifySignedToken(token, 'download'), null);

  const expired = signToken({ sub: '42', purpose: 'download' }, -10);
  assert.equal(verifySignedToken(expired, 'download'), null);
});

test('verifyWebhookHmac verifies SHA-256 webhook signatures in constant time', () => {
  const body = JSON.stringify({ orderRef: 'MGD-123', status: 'confirmed' });
  const secret = 'webhook_secret_key';
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyWebhookHmac(body, `sha256=${sig}`, secret), true);
  assert.equal(verifyWebhookHmac(body, 'sha256=deadbeef', secret), false);
});

test('generateReference produces unique prefixed references', () => {
  const r1 = generateReference('MGD');
  const r2 = generateReference('MGD');
  assert.ok(r1.startsWith('MGD-'));
  assert.notEqual(r1, r2);
});
