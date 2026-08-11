const { createHash } = require('node:crypto');
const { buyFromProvider, cleanProviderDuration, providerMessage } = require('./_lib/reseller');

function send(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.end(JSON.stringify(body));
}

function databaseUrl() {
  return String(process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || '').replace(/\/+$/, '');
}

async function dbRequest(path, options = {}) {
  const base = databaseUrl();
  if (!base) throw new Error('Firebase database is not configured on the server.');
  const response = await fetch(`${base}/${path.replace(/^\/+/, '')}.json`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    const error = new Error('Database request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function hashApiKey(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function requestBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return {}; }
}

function apiKeyFromRequest(req, body = {}) {
  const authorization = String(req.headers?.authorization || '');
  return String(req.headers?.['x-api-key'] || body.api_key || (authorization.startsWith('Bearer ') ? authorization.slice(7) : '')).trim();
}

async function authenticate(req, body) {
  const apiKey = apiKeyFromRequest(req, body);
  if (!apiKey || !apiKey.startsWith('tg_')) {
    const error = new Error('Missing API key. Send it as x-api-key or Bearer token.');
    error.status = 401;
    throw error;
  }
  const record = await dbRequest(`apiKeys/${hashApiKey(apiKey)}`);
  if (!record?.uid) {
    const error = new Error('Invalid API key.');
    error.status = 401;
    throw error;
  }
  const user = await dbRequest(`users/${encodeURIComponent(record.uid)}`) || {};
  if (user.status === 'banned' || user.active === false) {
    const error = new Error('This account cannot use the API.');
    error.status = 403;
    throw error;
  }
  return { uid: record.uid, user };
}

function asArray(value) {
  return Array.isArray(value) ? value : Object.entries(value || {}).map(([id, item]) => ({ id, ...(item || {}) }));
}

function normalizeProduct(product) {
  const pid = String(product?.pid || product?.purchasePid || product?.product_id || product?.id || '').trim();
  const purchasePid = String(product?.purchasePid || product?.purchase_pid || product?.product_id || pid).trim();
  const pricing = asArray(product?.pricing).map(item => {
    const duration = cleanProviderDuration(item?.duration || item?.label) || 'Default';
    return {
      label: duration,
      duration,
      price: Number(item?.price || item?.userPrice || item?.amount || 0),
      stock: item?.stock ?? null,
    };
  }).filter(item => item.duration);
  return {
    id: String(product?.id || pid),
    pid,
    purchase_pid: purchasePid,
    name: String(product?.name || product?.productName || 'Untitled product'),
    game: product?.game || 'Unknown',
    platform: product?.platform || '',
    description: String(product?.description || '').replace(/<[^>]*>/g, '').trim(),
    pricing,
  };
}

async function getProducts(user) {
  const type = user?.role === 'reseller' ? 'reseller' : 'user';
  const catalog = await dbRequest(`productCatalogs/${type}`);
  const products = asArray(catalog?.products).map(normalizeProduct).filter(item => item.pid && item.pricing.length);
  if (products.length) return products;

  const cookie = String(process.env.PRODUCTS_SCRAPE_COOKIE || '').trim();
  if (!cookie) return [];
  const response = await fetch(`https://vercel-api-seven-sepia.vercel.app/scrape?cookie=${encodeURIComponent(cookie)}`);
  const data = await response.json().catch(() => ({}));
  return asArray(data?.products).map(normalizeProduct).filter(item => item.pid);
}

function findDuration(product, requested) {
  const wanted = cleanProviderDuration(requested).toLowerCase();
  return product.pricing.find(item => cleanProviderDuration(item.duration).toLowerCase() === wanted)
    || product.pricing.find(item => cleanProviderDuration(item.label).toLowerCase() === wanted);
}

async function patchUser(uid, updates) {
  await dbRequest(`users/${encodeURIComponent(uid)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

async function refund(uid, amount) {
  const user = await dbRequest(`users/${encodeURIComponent(uid)}`) || {};
  await patchUser(uid, {
    balance: Number(user.balance || 0) + Number(amount || 0),
    updatedAt: Date.now(),
  });
}

function errorResponse(error) {
  const status = Number(error?.status) || (/not configured/i.test(error?.message || '') ? 503 : 400);
  return { status, body: { success: false, error: { code: status === 401 ? 'UNAUTHORIZED' : 'REQUEST_FAILED', message: providerMessage(error?.message || 'Request failed.') } } };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const body = requestBody(req);
  let auth;
  try {
    auth = await authenticate(req, body);
    const action = String(req.query?.action || body.action || 'products').trim().toLowerCase();

    if (req.method === 'GET' && action === 'balance') {
      return send(res, 200, { success: true, balance: Number(auth.user.balance || 0), currency: 'INR' });
    }

    const products = await getProducts(auth.user);
    if (req.method === 'GET' && action === 'products') {
      return send(res, 200, { success: true, count: products.length, products });
    }
    if (req.method === 'GET' && action === 'product') {
      const product = products.find(item => item.pid === String(req.query?.pid || req.query?.product_id || ''));
      if (!product) return send(res, 404, { success: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Product PID was not found.' } });
      return send(res, 200, { success: true, product });
    }

    if (req.method !== 'POST' || action !== 'buy') {
      return send(res, 405, { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for products/balance and POST for buy.' } });
    }

    const productId = String(body.product_id || body.pid || '').trim();
    const product = products.find(item => item.pid === productId || item.purchase_pid === productId || item.id === productId);
    if (!product) return send(res, 404, { success: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Product PID was not found.' } });
    const duration = findDuration(product, body.duration);
    if (!duration) return send(res, 400, { success: false, error: { code: 'DURATION_NOT_FOUND', message: 'That duration is not available for this product.' } });
    const price = Number(duration.price || 0);
    if (price <= 0) return send(res, 400, { success: false, error: { code: 'PRICE_NOT_AVAILABLE', message: 'This product duration has no purchasable price.' } });
    if (/\bbala\b/i.test(product.name) && !String(body.android_id || '').trim()) {
      return send(res, 400, { success: false, error: { code: 'ANDROID_ID_REQUIRED', message: 'android_id is required for this device-bound product.' } });
    }

    const currentBalance = Number(auth.user.balance || 0);
    if (currentBalance < price) {
      return send(res, 402, { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: `Insufficient balance. Required ₹${price}, available ₹${currentBalance}.` } });
    }

    const now = Date.now();
    const newBalance = currentBalance - price;
    await patchUser(auth.uid, { balance: newBalance, updatedAt: now });
    let providerResult;
    try {
      providerResult = await buyFromProvider({
        productId: product.purchase_pid || product.pid,
        duration: duration.duration,
        androidId: body.android_id,
      });
    } catch (error) {
      await refund(auth.uid, price);
      const safe = providerMessage(error?.message || 'Purchase could not be completed.');
      return send(res, 502, { success: false, error: { code: 'PROVIDER_PURCHASE_FAILED', message: `${safe} Your wallet balance was refunded.` } });
    }

    const keyId = `lk_api_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const txId = `tx_api_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const order = {
      uid: auth.uid,
      userId: auth.uid,
      user: auth.user.name || auth.user.email || auth.uid,
      productId: product.purchase_pid || product.pid,
      product: product.name,
      productName: product.name,
      duration: duration.duration,
      key: providerResult.key,
      keyCode: providerResult.key,
      status: 'active',
      source: 'api',
      apiOrder: true,
      price,
      purchasedAt: now,
      createdAt: now,
    };
    try {
      await dbRequest(`licenseKeys/${keyId}`, { method: 'PUT', body: JSON.stringify(order) });
      await dbRequest(`transactions/${txId}`, {
        method: 'PUT',
        body: JSON.stringify({
          uid: auth.uid,
          type: 'purchase',
          source: 'api',
          amount: price,
          before: currentBalance,
          after: newBalance,
          note: `${product.name} · ${duration.duration}`,
          productId: product.pid,
          licenseKeyId: keyId,
          createdAt: now,
        }),
      });
      await patchUser(auth.uid, {
        balance: newBalance,
        totalPurchase: Number(auth.user.totalPurchase || 0) + price,
        myPurchases: Number(auth.user.myPurchases || 0) + price,
        updatedAt: now,
      });
    } catch (error) {
      await refund(auth.uid, price);
      return send(res, 502, { success: false, error: { code: 'ORDER_SAVE_FAILED', message: 'The provider key was received but the order could not be saved. Wallet balance was refunded.' } });
    }

    return send(res, 201, {
      success: true,
      message: 'Order placed successfully.',
      order: { id: keyId, product_id: product.purchase_pid || product.pid, pid: product.pid, product: product.name, duration: duration.duration, price, key: providerResult.key, status: 'active', created_at: now },
    });
  } catch (error) {
    const result = errorResponse(error);
    return send(res, result.status, result.body);
  }
};