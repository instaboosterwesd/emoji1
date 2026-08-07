import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { getDatabase, get, ref, set, update, runTransaction, onValue } from 'firebase/database';
import { PRODUCT_CATALOG, LIVE_PRICING_COUNTS, LIVE_DURATION_LABELS } from './products.js';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseDb = firebaseApp ? getDatabase(firebaseApp) : null;

const resellerEndpoint = import.meta.env.VITE_RESELLER_ENDPOINT;
const resellerApiKey = import.meta.env.VITE_RESELLER_API_KEY;
const resellerMasterKey = import.meta.env.VITE_RESELLER_MASTER_KEY;
const productsEndpoint = '/api/products';

const otpHeaders = { accept: '*/*', 'auth-key': 'appxapi', 'client-service': 'Appx', 'device-type': '', source: 'website' };
const cleanPhone = phone => phone.replace(/\D/g, '').slice(-10);
const deviceId = () => `WebBrowser${Date.now()}${Math.random().toString(36).slice(2, 13)}`;

/* ── Brand icon map (shared by high-end & low-end modes) ──────── */
const productBrandIconRules = [
  { test: n => /apk mc/i.test(n), icon: '/icons/brands/apk-mc.png' },
  { test: n => /ios iphone all gbox|gbox certificate|ios signer|ios esign/i.test(n), icon: '/icons/brands/gbox-certificate.png' },
  { test: n => /^br\b|br mod|br board/i.test(n), icon: '/icons/brands/br.png' },
  { test: n => /drip\s*client|dripclient/i.test(n), icon: '/icons/brands/dripclient.png' },
  { test: n => /fluorite/i.test(n), icon: '/icons/brands/fluorite-ios-ff.png' },
  { test: n => /^hg\b|hg cheats/i.test(n), icon: '/icons/brands/hg.png' },
  { test: n => /hikari/i.test(n), icon: '/icons/brands/hikari.png' },
  { test: n => /^kos\b|kos /i.test(n), icon: '/icons/brands/kos.png' },
  { test: n => /migul/i.test(n), icon: '/icons/brands/migul.png' },
  { test: n => /pato team/i.test(n), icon: '/icons/brands/pato-team.png' },
  { test: n => /prime hook/i.test(n), icon: '/icons/brands/prime-hook.png' },
  { test: n => /rapid core/i.test(n), icon: '/icons/brands/rapid-core.png' },
  { test: n => /reaper x/i.test(n), icon: '/icons/brands/reaper-x.png' },
  { test: n => /snake/i.test(n), icon: '/icons/brands/snake.png' },
  { test: n => /^xyz\b|xyz cheats/i.test(n), icon: '/icons/brands/xyz.png' },
  { test: n => /silent cheat|^silent\b/i.test(n), icon: '/icons/brands/silent.png' },
];
export const productIconFor = name => productBrandIconRules.find(b => b.test(name || ''))?.icon || null;

export async function sendIndiaOtp(phone) {
  const value = cleanPhone(phone);
  if (value.length !== 10) throw new Error('Enter a valid 10-digit Indian mobile number.');
  const response = await fetch(`https://rozgarapinew.teachx.in/get/sendotp?phone=${encodeURIComponent(value)}`, { headers: otpHeaders });
  if (!response.ok) throw new Error('OTP service is unavailable right now.');
  const data = await response.json().catch(() => ({}));
  if (data?.status === false || data?.success === false) throw new Error(data?.message || 'OTP could not be sent.');
  return { phone: value, deviceId: deviceId() };
}

export async function verifyIndiaOtp(phone, otp, currentDeviceId) {
  const value = cleanPhone(phone);
  if (!/^\d{4}$/.test(otp)) throw new Error('Enter a valid 4-digit OTP.');
  const url = `https://rozgarapinew.teachx.in/get/otpverify?useremail=${encodeURIComponent(value)}&otp=${encodeURIComponent(otp)}&device_id=${encodeURIComponent(currentDeviceId)}&mydeviceid=&mydeviceid2=`;
  const response = await fetch(url, { headers: otpHeaders });
  const data = await response.json().catch(() => ({}));
  const verified = data?.status === 200 && data?.message === 'OTP is Valid' && typeof data?.user?.userid === 'string' && typeof data?.user?.token === 'string' && data.user.token.length > 20;
  if (!response.ok || !verified) throw new Error(data?.message || 'Invalid OTP or verification failed.');
  return data;
}

export async function signInWithGoogle() {
  if (!firebaseAuth) throw new Error('Firebase environment is not configured.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    return await signInWithPopup(firebaseAuth, provider);
  } catch (error) {
    // Mobile browsers and deployed previews often block OAuth popups.
    // Redirect keeps the same Google flow working in those environments.
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(firebaseAuth, provider);
      return null;
    }
    throw error;
  }
}

export async function getGoogleRedirectResult() {
  if (!firebaseAuth) return null;
  return getRedirectResult(firebaseAuth);
}

export async function getUserRole(uid) {
  if (!firebaseDb) return 'user';
  const snapshot = await get(ref(firebaseDb, `users/${uid}/role`));
  return snapshot.exists() ? snapshot.val() : 'user';
}

const textHash = async value => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const randomSecret = (size = 24) => {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const publicProfile = (uid, value = {}) => ({
  uid,
  role: value.role || 'user',
  phone: value.phone || '',
  email: value.email || '',
  name: value.name || 'Account holder',
  photoData: value.photoData || '',
  balance: Number(value.balance || 0),
  totalPurchase: Number(value.totalPurchase || 0),
  todaySales: Number(value.todaySales || 0),
  monthlySales: Number(value.monthlySales || 0),
  myPurchases: Number(value.myPurchases || value.totalPurchase || 0),
  active: Number(value.active || 0),
  status: value.status || 'active',
  apiKeyLast4: value.apiKeyLast4 || '',
});

export async function getUserProfile(uid) {
  if (!firebaseDb || !uid) return publicProfile(uid);
  const snapshot = await get(ref(firebaseDb, `users/${uid}`));
  return publicProfile(uid, snapshot.exists() ? snapshot.val() : {});
}

export async function ensureGoogleUser(user) {
  if (!user?.uid) throw new Error('Google login did not return a user.');
  if (!firebaseDb) return publicProfile(user.uid, { email: user.email, name: user.displayName });
  const userRef = ref(firebaseDb, `users/${user.uid}`);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) {
    await set(userRef, {
      email: user.email || '',
      phone: user.phoneNumber || '',
      name: user.displayName || 'Account holder',
      photoData: user.photoURL || '',
      role: 'user',
      createdAt: Date.now(),
      balance: 0,
      totalPurchase: 0,
      active: 0,
    });
  }
  const fresh = await get(userRef);
  return publicProfile(user.uid, fresh.exists() ? fresh.val() : {});
}

export async function ensurePhoneUser(phone, identity = {}) {
  const uid = identity.userid ? `external_${identity.userid}` : `phone_${cleanPhone(phone)}`;
  if (!firebaseDb) return { uid, role: 'user', phone: cleanPhone(phone), email: identity.email || '', name: identity.name || 'User' };
  const userRef = ref(firebaseDb, `users/${uid}`);
  const snapshot = await get(userRef);
  const legacySnapshot = identity.userid ? await get(ref(firebaseDb, `users/phone_${cleanPhone(phone)}`)) : null;
  const legacy = legacySnapshot?.exists() ? legacySnapshot.val() : {};
  if (!snapshot.exists()) await set(userRef, { externalUserId: identity.userid || '', phone: cleanPhone(phone), email: identity.email || '', name: identity.name || 'User', username: identity.username || '', role: legacy.role || 'user', createdAt: legacy.createdAt || Date.now(), balance: legacy.balance || 0, totalPurchase: legacy.totalPurchase || 0, active: legacy.active || 0 });
  const fresh = await get(userRef);
  const existing = fresh.exists() ? fresh.val() : legacy;
  return publicProfile(uid, { ...existing, phone: cleanPhone(phone), email: existing.email || identity.email || '', name: existing.name || identity.name || 'User' });
}

export async function updateUserProfile(uid, data) {
  if (!firebaseDb || !uid) throw new Error('Firebase database is not configured.');
  const updates = {
    name: data.name?.trim() || 'Account holder',
    updatedAt: Date.now(),
  };
  if (data.photoData) updates.photoData = data.photoData;
  await update(ref(firebaseDb, `users/${uid}`), updates);
  return getUserProfile(uid);
}

export async function changeUserPassword(uid, oldPassword, newPassword) {
  if (!firebaseDb || !uid) throw new Error('Firebase database is not configured.');
  if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters.');
  const userRef = ref(firebaseDb, `users/${uid}`);
  const snapshot = await get(userRef);
  const user = snapshot.exists() ? snapshot.val() : {};
  if (user.passwordHash) {
    const oldHash = await textHash(`${user.passwordSalt}:${oldPassword || ''}`);
    if (oldHash !== user.passwordHash) throw new Error('Old password is not correct.');
  }
  const salt = randomSecret(12);
  const passwordHash = await textHash(`${salt}:${newPassword}`);
  await update(userRef, { passwordSalt: salt, passwordHash, passwordUpdatedAt: Date.now() });
  return true;
}

export async function resetUserApiKey(uid) {
  if (!firebaseDb || !uid) throw new Error('Firebase database is not configured.');
  const userRef = ref(firebaseDb, `users/${uid}`);
  const snapshot = await get(userRef);
  const user = snapshot.exists() ? snapshot.val() : {};
  if (user.apiKeyHash) await set(ref(firebaseDb, `apiKeys/${user.apiKeyHash}`), null);
  const apiKey = `tg_${randomSecret(30)}`;
  const apiKeyHash = await textHash(apiKey);
  await update(userRef, { apiKeyHash, apiKeyLast4: apiKey.slice(-4), apiKeyUpdatedAt: Date.now() });
  await set(ref(firebaseDb, `apiKeys/${apiKeyHash}`), { uid, createdAt: Date.now() });
  return { apiKey, last4: apiKey.slice(-4) };
}

export async function ensureUserApiKey(uid) {
  if (!firebaseDb || !uid) throw new Error('Firebase database is not configured.');
  const profile = await getUserProfile(uid);
  if (profile.apiKeyLast4) return { apiKey: '', last4: profile.apiKeyLast4 };
  return resetUserApiKey(uid);
}

export async function loginWithApiKey(apiKey) {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  if (!apiKey?.trim()) throw new Error('Enter your private API key.');
  const apiKeyHash = await textHash(apiKey.trim());
  const keySnapshot = await get(ref(firebaseDb, `apiKeys/${apiKeyHash}`));
  if (!keySnapshot.exists()) throw new Error('Invalid API key.');
  const uid = keySnapshot.val()?.uid;
  if (!uid) throw new Error('API key is not linked to a user.');
  return getUserProfile(uid);
}

export async function fetchGameProducts() {
  const response = await fetch(productsEndpoint);
  if (!response.ok) throw new Error('Products could not be loaded.');
  const data = await response.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  return products.map(product => {
    const name = product.name || 'Untitled product';
    const catalog = findCatalogProduct(name);
    const expectedCount = LIVE_PRICING_COUNTS[name] || null;
    const livePricing = Array.isArray(product.pricing) ? product.pricing : [];
    // The scraper currently appends later products' rows to each product.
    // Use the known product duration count to keep only this product's block.
    const pricing = expectedCount ? livePricing.slice(0, expectedCount) : livePricing;
    // Override broken/missing API images with brand icons
    const brandIcon = productIconFor(name);
    return {
      id: product.id,
      pid: String(product.product_id || product.pid || product.id),
      purchasePid: catalog?.pid || product.product_id || product.pid || product.id,
      sourcePid: product.product_id || product.pid || product.id,
      name,
      game: product.game || 'Unknown',
      image: brandIcon || product.image || '',
      videos: Array.isArray(product.videos) ? product.videos.filter(Boolean) : [],
      features: Array.isArray(product.features) ? product.features.filter(Boolean) : [],
      description: typeof product.description === 'string' ? product.description : '',
      salesCount: product.salesCount ?? product.purchaseCount ?? product.orders ?? product.sold ?? null,
      pricing: pricing.map((item, index) => ({
        label: LIVE_DURATION_LABELS[name]?.[index] || item.duration || 'Default',
        duration: LIVE_DURATION_LABELS[name]?.[index] || item.duration || 'Default',
        sourceDuration: item.duration || 'Default',
        price: Number(item.price || 0),
        stock: item.stock ?? null,
      })),
      platform: product.platform || '',
    };
  });
}

function normaliseProductName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^a,\s*/, '')
    .replace(/[^a-z0-9]+/g, '');
}

function findCatalogProduct(name) {
  const wanted = normaliseProductName(name);
  return PRODUCT_CATALOG.find(item => normaliseProductName(item.name) === wanted)
    || (wanted === normaliseProductName('A, XYZ CHEATS FF ROOT ANDROID')
      ? PRODUCT_CATALOG.find(item => normaliseProductName(item.name) === normaliseProductName('XYZ CHEATS FF ROOT ANDROID'))
      : null);
}

export async function buyResellerProduct(productId, duration) {
  if (!resellerEndpoint || !resellerApiKey || !resellerMasterKey) throw new Error('Reseller API is not configured.');
  const body = new URLSearchParams({
    api_key: resellerApiKey,
    action: 'buy',
    product_id: String(productId),
    duration,
  });
  const response = await fetch(resellerEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-master-key': resellerMasterKey,
    },
    body,
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { message: raw };
  }
  if (!response.ok || data?.status === false || data?.success === false || String(data?.status).toLowerCase() === 'error') {
    throw new Error(data?.message || 'Purchase request failed.');
  }
  return data;
}

const toArray = value => Object.entries(value || {}).map(([id, item]) => ({ id, ...(item || {}) }));

export async function getAdminOverview() {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  const [usersSnap, keysSnap, depositsSnap, txSnap, resellersSnap, announcementsSnap, pricingSnap, paymentSettingsSnap, manualKeysSnap, communitySnap, keyResetSnap] = await Promise.all([
    get(ref(firebaseDb, 'users')),
    get(ref(firebaseDb, 'licenseKeys')),
    get(ref(firebaseDb, 'paymentRequests')),
    get(ref(firebaseDb, 'transactions')),
    get(ref(firebaseDb, 'resellers')),
    get(ref(firebaseDb, 'announcements')),
    get(ref(firebaseDb, 'adminProductPricing')),
    get(ref(firebaseDb, 'settings/payment')),
    get(ref(firebaseDb, 'manualLicenseKeys')),
    get(ref(firebaseDb, 'settings/community')),
    get(ref(firebaseDb, 'keyResetRequests')),
  ]);
  const users = Object.entries(usersSnap.val() || {}).map(([uid, value]) => publicProfile(uid, value));
  const keys = toArray(keysSnap.val());
  const deposits = toArray(depositsSnap.val());
  const transactions = toArray(txSnap.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const resellers = toArray(resellersSnap.val());
  const announcements = toArray(announcementsSnap.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const pricingRules = pricingSnap.val() || {};
  const manualKeys = toArray(manualKeysSnap.val());
  return {
    users,
    keys,
    deposits,
    transactions,
    resellers,
    announcements,
    pricingRules,
    manualKeys,
    communityLinks: communitySnap.exists() ? communitySnap.val() : {},
    keyResetRequests: toArray(keyResetSnap.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    ...(paymentSettingsSnap.exists() ? paymentSettingsSnap.val() : {}),
    upiId: paymentSettingsSnap.val()?.upiId || '',
    minDeposit: Number(paymentSettingsSnap.val()?.minDeposit || 50),
    resellerPrice: Number(paymentSettingsSnap.val()?.resellerPrice || 0),
    stats: {
      totalRevenue: users.reduce((sum, user) => sum + Number(user.totalPurchase || 0), 0),
      activeUsers: users.filter(user => user.status !== 'banned').length,
      keysSold: keys.length,
      pendingDeposit: deposits.filter(item => item.status === 'pending').reduce((sum, item) => sum + Number(item.amount || 0), 0),
    },
  };
}

export async function adminUpdateUser(uid, updates) {
  if (!firebaseDb || !uid) throw new Error('Firebase database is not configured.');
  const safeUpdates = {
    updatedAt: Date.now(),
  };
  if (updates.name !== undefined) safeUpdates.name = updates.name;
  if (updates.email !== undefined) safeUpdates.email = updates.email;
  if (updates.role !== undefined) safeUpdates.role = updates.role;
  if (updates.status !== undefined) safeUpdates.status = updates.status;
  if (updates.reseller !== undefined) safeUpdates.reseller = Boolean(updates.reseller);
  await update(ref(firebaseDb, `users/${uid}`), safeUpdates);
  return getUserProfile(uid);
}

export async function adminAdjustUserFund(uid, amount, mode = 'add', note = 'Admin wallet adjustment') {
  if (!firebaseDb || !uid) throw new Error('Firebase database is not configured.');
  const value = Math.max(0, Number(amount || 0));
  if (!value) throw new Error('Enter a valid amount.');
  const userRef = ref(firebaseDb, `users/${uid}`);
  const snapshot = await get(userRef);
  const user = snapshot.exists() ? snapshot.val() : {};
  const current = Number(user.balance || 0);
  const nextBalance = mode === 'subtract' ? Math.max(0, current - value) : current + value;
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await update(userRef, { balance: nextBalance, updatedAt: Date.now() });
  await set(ref(firebaseDb, `transactions/${id}`), {
    uid,
    type: mode === 'subtract' ? 'admin_subtract' : 'admin_add',
    amount: value,
    before: current,
    after: nextBalance,
    note,
    createdAt: Date.now(),
  });
  return nextBalance;
}

export async function adminSaveAnnouncement(message, title = '') {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  if (!message?.trim()) throw new Error('Enter announcement text.');
  const id = `ann_${Date.now()}`;
  await set(ref(firebaseDb, `announcements/${id}`), {
    ...(title?.trim() ? { title: title.trim() } : {}),
    message: message.trim(),
    createdAt: Date.now(),
    status: 'active',
  });
  return id;
}

export async function getAnnouncements() {
  if (!firebaseDb) return [];
  const snap = await get(ref(firebaseDb, 'announcements'));
  const val = snap.val();
  if (!val) return [];
  return Object.entries(val)
    .map(([id, item]) => ({ id, ...(item || {}) }))
    .filter(n => n.status !== 'deleted')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function adminSaveReseller({ username, password, fund }) {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  if (!username?.trim()) throw new Error('Enter reseller username.');
  const id = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const data = {
    username: username.trim(),
    fund: Number(fund || 0),
    status: 'active',
    updatedAt: Date.now(),
  };
  if (password) {
    const salt = randomSecret(12);
    data.passwordSalt = salt;
    data.passwordHash = await textHash(`${salt}:${password}`);
    data.passwordUpdatedAt = Date.now();
  }
  await update(ref(firebaseDb, `resellers/${id}`), data);
  return id;
}

export async function adminSaveProductRule({ pid, duration, price, resellerPrice }) {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  if (!pid?.trim()) throw new Error('Enter product PID.');
  const id = `${pid.trim()}_${(duration || 'default').trim().replace(/[^a-z0-9]+/gi, '_')}`;
  await set(ref(firebaseDb, `adminProductPricing/${id}`), {
    pid: pid.trim(),
    duration: duration?.trim() || 'default',
    price: price === '' ? '' : Number(price || 0),
    resellerPrice: resellerPrice === '' || resellerPrice === undefined ? '' : Number(resellerPrice || 0),
    updatedAt: Date.now(),
  });
  return id;
}

export async function adminSaveUpi(upiId, minDeposit, resellerPrice, paymentOptions = {}) {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  if (paymentOptions.upiEnabled !== false && !upiId?.trim()) throw new Error('Enter UPI ID or turn UPI off.');
  const current = await get(ref(firebaseDb, 'settings/payment'));
  const existing = current.exists() ? current.val() : {};
  const next = {
    ...existing,
    upiId: upiId?.trim() || '',
    minDeposit: Math.max(1, Number(minDeposit || 50)),
    resellerPrice: Math.max(0, Number(resellerPrice || 0)),
    gatewayEnabled: Boolean(paymentOptions.gatewayEnabled),
    upiEnabled: paymentOptions.upiEnabled !== false,
    gatewayFee: Math.max(0, Number(paymentOptions.gatewayFee || 0)),
    cashfreeAppId: paymentOptions.cashfreeAppId?.trim() || '',
    updatedAt: Date.now(),
  };
  if (!next.gatewayEnabled && !next.upiEnabled) throw new Error('Turn on at least one payment method.');
  await set(ref(firebaseDb, 'settings/payment'), next);
  return next;
}

function cleanCommunityUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let parsed;
  try { parsed = new URL(raw); } catch { throw new Error('Telegram links must be valid HTTPS URLs.'); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Telegram links must use HTTP or HTTPS.');
  return parsed.toString();
}

export async function getCommunityLinks() {
  if (!firebaseDb) return { resellerUpdatesUrl: '', getFileUrl: '', helpUrl: '' };
  const snap = await get(ref(firebaseDb, 'settings/community'));
  const value = snap.exists() ? snap.val() : {};
  return {
    resellerUpdatesUrl: value.resellerUpdatesUrl || '',
    getFileUrl: value.getFileUrl || '',
    helpUrl: value.helpUrl || '',
  };
}

export async function adminSaveCommunityLinks(links) {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  const next = {
    resellerUpdatesUrl: cleanCommunityUrl(links.resellerUpdatesUrl),
    getFileUrl: cleanCommunityUrl(links.getFileUrl),
    helpUrl: cleanCommunityUrl(links.helpUrl),
    updatedAt: Date.now(),
  };
  await set(ref(firebaseDb, 'settings/community'), next);
  return next;
}

export async function getUserKeyResetRequests(uid) {
  if (!firebaseDb || !uid) return [];
  const snap = await get(ref(firebaseDb, 'keyResetRequests'));
  return toArray(snap.val())
    .filter(request => request.uid === uid)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function createKeyResetRequest(uid, license, reason) {
  if (!firebaseDb || !uid) throw new Error('Firebase database is not configured.');
  if (!license?.id) throw new Error('Order details are missing.');
  const message = String(reason || '').trim();
  if (message.length < 5) throw new Error('Please explain the reset reason.');
  const existing = await getUserKeyResetRequests(uid);
  if (existing.some(request => request.keyId === license.id && request.status === 'pending')) {
    throw new Error('A reset request for this order is already pending.');
  }
  const id = `reset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await set(ref(firebaseDb, `keyResetRequests/${id}`), {
    uid,
    keyId: license.id,
    productName: license.productName || license.product || '',
    duration: license.duration || '',
    reason: message,
    status: 'pending',
    createdAt: Date.now(),
  });
  return id;
}

export async function adminReviewKeyResetRequest(requestId, status, replacementKey = '') {
  if (!firebaseDb || !requestId) throw new Error('Reset request is missing.');
  if (!['approved', 'rejected'].includes(status)) throw new Error('Invalid reset request status.');
  const requestRef = ref(firebaseDb, `keyResetRequests/${requestId}`);
  const snap = await get(requestRef);
  if (!snap.exists()) throw new Error('Reset request not found.');
  const request = snap.val();
  const keyValue = String(replacementKey || '').trim();
  const now = Date.now();
  await update(requestRef, {
    status,
    replacementKey: status === 'approved' && keyValue ? keyValue : '',
    reviewedAt: now,
  });
  if (status === 'approved' && keyValue && request.keyId) {
    await update(ref(firebaseDb, `licenseKeys/${request.keyId}`), {
      key: keyValue,
      keyCode: keyValue,
      status: 'active',
      resetAt: now,
    });
  }
  await set(ref(firebaseDb, `userNotifications/${request.uid}/${requestId}`), {
    type: 'key_reset',
    title: status === 'approved' ? 'Key reset approved' : 'Key reset rejected',
    message: status === 'approved'
      ? 'Your key reset request is approved.'
      : 'Your key reset request was rejected by admin.',
    requestId,
    createdAt: now,
    dismissed: false,
  });
  return true;
}

export async function adminDeleteLicenseKey(keyId) {
  if (!firebaseDb || !keyId) throw new Error('Firebase database is not configured.');
  await set(ref(firebaseDb, `licenseKeys/${keyId}`), null);
  return true;
}

export async function adminUpdatePaymentRequest(requestId, status) {
  if (!firebaseDb || !requestId) throw new Error('Firebase database is not configured.');
  const existingRequestSnap = await get(ref(firebaseDb, `paymentRequests/${requestId}`));
  if (existingRequestSnap.exists() && existingRequestSnap.val()?.method === 'Cashfree') {
    throw new Error('Cashfree payments are auto-approved after gateway verification.');
  }
  const request = existingRequestSnap.exists() ? existingRequestSnap.val() : null;
  const pendingTransactionId = request?.transactionId || `tx_pending_${requestId}`;

  // Keep approval idempotent. A repeated admin action must not credit the wallet twice.
  if (request?.status === 'approved' && status === 'approved') return true;

  if (status === 'approved') {
    if (request) {
      const uid = request.uid;
      const amount = Number(request.amount || 0);
      if (uid && amount > 0) {
        const userSnap = await get(ref(firebaseDb, `users/${uid}`));
        const user = userSnap.exists() ? userSnap.val() : {};
        const currentBalance = Number(user.balance || 0);
        const newBalance = currentBalance + amount;
        const updates = { balance: newBalance, updatedAt: Date.now() };
        // If this is a reseller unlock payment, upgrade role
        if (request.type === 'reseller') {
          updates.role = 'reseller';
          updates.reseller = true;
        }
        await update(ref(firebaseDb, `users/${uid}`), updates);
        const txType = request.type === 'reseller' ? 'reseller_unlock' : 'deposit_approved';
        await update(ref(firebaseDb, `transactions/${pendingTransactionId}`), {
          uid,
          type: txType,
          status: 'approved',
          amount,
          before: currentBalance,
          after: newBalance,
          note: request.type === 'reseller'
            ? `Reseller panel unlocked (request ${requestId})`
            : `Deposit approved (request ${requestId})`,
          method: request.method || 'UPI',
          paymentRequestId: requestId,
          createdAt: request.createdAt || Date.now(),
          approvedAt: Date.now(),
        });
      }
    }
  }
  if (status === 'rejected' && request) {
    await update(ref(firebaseDb, `transactions/${pendingTransactionId}`), {
      uid: request.uid,
      type: 'deposit_rejected',
      status: 'rejected',
      amount: Number(request.amount || 0),
      note: `Deposit rejected (request ${requestId})`,
      method: request.method || 'UPI',
      paymentRequestId: requestId,
      updatedAt: Date.now(),
    });
  }
  await update(ref(firebaseDb, `paymentRequests/${requestId}`), {
    status,
    transactionId: pendingTransactionId,
    updatedAt: Date.now(),
  });
  return true;
}

/* ── Payment Settings & Deposit Flow ────────────────────────────── */

export async function getPaymentSettings() {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  const snap = await get(ref(firebaseDb, 'settings/payment'));
  const value = snap.exists() ? snap.val() : {};
  return {
    upiId: value.upiId || '',
    minDeposit: Number(value.minDeposit || 50),
    resellerPrice: Number(value.resellerPrice || 0),
    gatewayEnabled: Boolean(value.gatewayEnabled),
    upiEnabled: value.upiEnabled !== false,
    gatewayFee: Math.max(0, Number(value.gatewayFee || 0)),
    cashfreeAppId: value.cashfreeAppId || '',
  };
}

export async function createPaymentRequest(uid, amount, senderUpi, userName, type = 'deposit') {
  if (!firebaseDb || !uid) throw new Error('Firebase database is not configured.');
  const value = Math.max(0, Number(amount || 0));
  if (!value) throw new Error('Enter a valid deposit amount.');
  if (!senderUpi?.trim()) throw new Error('Enter your UPI/UTR number.');
  const id = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const transactionId = `tx_pending_${id}`;
  const now = Date.now();
  await update(ref(firebaseDb), {
    [`paymentRequests/${id}`]: {
      uid,
      user: userName || uid,
      amount: value,
      method: 'UPI',
      senderUpi: senderUpi.trim(),
      type: type || 'deposit',
      status: 'pending',
      transactionId,
      createdAt: now,
    },
    [`transactions/${transactionId}`]: {
      uid,
      type: type === 'reseller' ? 'reseller_unlock_pending' : 'deposit_pending',
      status: 'pending',
      amount: value,
      note: type === 'reseller'
        ? `Reseller unlock pending approval (request ${id})`
        : `Deposit pending approval (request ${id})`,
      method: 'UPI',
      paymentRequestId: id,
      createdAt: now,
    },
  });
  return id;
}

export async function createGatewayPaymentRequest(uid, amount, paidAmount, orderId, userName, type = 'deposit') {
  if (!firebaseDb || !uid) throw new Error('Firebase database is not configured.');
  const creditAmount = Math.max(0, Number(amount || 0));
  const totalPaid = Math.max(0, Number(paidAmount || 0));
  if (!creditAmount || !totalPaid || !orderId) throw new Error('Gateway payment details are incomplete.');
  const settlementRef = ref(firebaseDb, `gatewaySettlements/${orderId}`);
  const claimId = `claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const settlement = await runTransaction(settlementRef, current => current || {
    uid,
    orderId,
    claimId,
    status: 'processing',
    createdAt: Date.now(),
  });
  const settlementValue = settlement.snapshot.val() || {};
  if (settlementValue.status === 'completed') return settlementValue.requestId;
  if (settlementValue.status !== 'processing' || settlementValue.claimId !== claimId) {
    throw new Error('This gateway payment is already being processed. Please refresh shortly.');
  }
  if (settlementValue.uid !== uid) throw new Error('This gateway order belongs to another account.');

  const id = settlementValue.requestId || `pay_gateway_${orderId}`;
  const now = Date.now();
  const userRef = ref(firebaseDb, `users/${uid}`);
  const userSnap = await get(userRef);
  const user = userSnap.exists() ? userSnap.val() : {};
  const currentBalance = Number(user.balance || 0);
  const newBalance = currentBalance + creditAmount;
  const fee = Math.max(0, totalPaid - creditAmount);
  const txId = `tx_gateway_${orderId}`;
  const request = {
    uid,
    user: userName || uid,
    amount: creditAmount,
    paidAmount: totalPaid,
    gatewayFee: fee,
    method: 'Cashfree',
    gatewayOrderId: orderId,
    type: type || 'deposit',
    status: 'approved',
    autoCredited: true,
    createdAt: settlementValue.createdAt || now,
    approvedAt: now,
  };
  await update(ref(firebaseDb), {
    [`users/${uid}/balance`]: newBalance,
    [`users/${uid}/updatedAt`]: now,
    [`paymentRequests/${id}`]: request,
    [`transactions/${txId}`]: {
      uid,
      type: type === 'reseller' ? 'reseller_unlock' : 'gateway_deposit',
      amount: creditAmount,
      paidAmount: totalPaid,
      gatewayFee: fee,
      before: currentBalance,
      after: newBalance,
      method: 'Cashfree',
      gatewayOrderId: orderId,
      note: type === 'reseller'
        ? `Cashfree gateway · Reseller unlock · Order ${orderId}`
        : `Cashfree gateway · ₹${creditAmount} credited${fee ? ` · ₹${fee} fee` : ''} · Order ${orderId}`,
      createdAt: now,
    },
  });
  if (type === 'reseller') {
    await update(userRef, { role: 'reseller', reseller: true, updatedAt: now });
  }
  await set(settlementRef, {
    ...settlementValue,
    uid,
    requestId: id,
    transactionId: txId,
    status: 'completed',
    completedAt: now,
  });
  return id;
}

export async function createCashfreeOrder({ amount, customerId, customerName, customerPhone, customerEmail, appId }) {
  const response = await fetch('/api/cashfree/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Number(amount), customerId, customerName, customerPhone, customerEmail, appId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.paymentSessionId) throw new Error(data?.message || 'Cashfree gateway is not configured.');
  return data;
}

export async function verifyCashfreeOrder(orderId, appId) {
  const response = await fetch(`/api/cashfree/verify-order?order_id=${encodeURIComponent(orderId)}&app_id=${encodeURIComponent(appId || '')}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.status !== 'PAID') throw new Error(data?.message || 'Cashfree payment was not completed.');
  return data;
}

/* ── User Transactions ──────────────────────────────────────────── */

export async function getUserTransactions(uid) {
  if (!firebaseDb || !uid) return [];
  const snap = await get(ref(firebaseDb, 'transactions'));
  if (!snap.exists()) return [];
  return toArray(snap.val())
    .filter(tx => tx.uid === uid)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function subscribeUserTransactions(uid, onChange) {
  if (!firebaseDb || !uid || typeof onChange !== 'function') return () => {};
  return onValue(ref(firebaseDb, 'transactions'), snap => {
    const transactions = snap.exists()
      ? toArray(snap.val())
        .filter(tx => tx.uid === uid)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      : [];
    onChange(transactions);
  });
}

export async function getUserLicenseKeys(uid) {
  if (!firebaseDb || !uid) return [];
  const snap = await get(ref(firebaseDb, 'licenseKeys'));
  if (!snap.exists()) return [];
  return toArray(snap.val())
    .filter(key => key.uid === uid || key.userId === uid)
    .sort((a, b) => (b.purchasedAt || b.createdAt || 0) - (a.purchasedAt || a.createdAt || 0));
}

/* ── Admin Pricing Rules ────────────────────────────────────────── */

export async function getAdminPricingRules() {
  if (!firebaseDb) return {};
  const snap = await get(ref(firebaseDb, 'adminProductPricing'));
  return snap.exists() ? snap.val() : {};
}

export async function getProductPricingSettings() {
  if (!firebaseDb) return { userAdjustment: -20, resellerAdjustment: 10 };
  const snap = await get(ref(firebaseDb, 'settings/productPricing'));
  const value = snap.exists() ? snap.val() : {};
  return {
    userAdjustment: Number.isFinite(Number(value.userAdjustment)) ? Number(value.userAdjustment) : -20,
    resellerAdjustment: Number.isFinite(Number(value.resellerAdjustment)) ? Number(value.resellerAdjustment) : 10,
  };
}

/* ── Manual License Keys ────────────────────────────────────────── */

export async function adminAddManualKey(pid, productName, duration, key) {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  if (!pid || !duration || !key?.trim()) throw new Error('Product, duration, and key are required.');
  const id = `mk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await set(ref(firebaseDb, `manualLicenseKeys/${id}`), {
    pid: String(pid),
    productName: productName || '',
    duration: duration.trim(),
    key: key.trim(),
    used: false,
    createdAt: Date.now(),
  });
  return id;
}

export async function adminGetManualKeys() {
  if (!firebaseDb) return [];
  const snap = await get(ref(firebaseDb, 'manualLicenseKeys'));
  return snap.exists() ? toArray(snap.val()) : [];
}

export async function adminDeleteManualKey(keyId) {
  if (!firebaseDb || !keyId) throw new Error('Firebase database is not configured.');
  await set(ref(firebaseDb, `manualLicenseKeys/${keyId}`), null);
  return true;
}

async function getAvailableManualKey(pid, duration) {
  if (!firebaseDb) return null;
  const snap = await get(ref(firebaseDb, 'manualLicenseKeys'));
  if (!snap.exists()) return null;
  const all = toArray(snap.val());
  const normalise = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return all.find(k => !k.used && String(k.pid) === String(pid) && normalise(k.duration) === normalise(duration)) || null;
}

/* ── Full Purchase Flow (API → fallback → refund) ───────────────── */

export async function purchaseProduct(uid, product, duration, price, userName) {
  if (!firebaseDb || !uid) throw new Error('Not authenticated.');
  const value = Number(price || 0);
  if (value <= 0) throw new Error('Invalid price.');

  // 1. Check balance
  const userSnap = await get(ref(firebaseDb, `users/${uid}`));
  const user = userSnap.exists() ? userSnap.val() : {};
  const currentBalance = Number(user.balance || 0);
  if (currentBalance < value) throw new Error(`Insufficient balance. You have ₹${currentBalance.toLocaleString('en-IN')} but need ₹${value.toLocaleString('en-IN')}.`);

  // 2. Deduct balance
  const newBalance = currentBalance - value;
  await update(ref(firebaseDb, `users/${uid}`), { balance: newBalance, updatedAt: Date.now() });

  let deliveredKey = null;
  let source = 'api';

  // 3. Try reseller API
  try {
    const productIds = [...new Set([product.purchasePid, product.pid].filter(Boolean).map(String))];
    let lastError;
    for (const productId of productIds) {
      try {
        const apiResult = await buyResellerProduct(productId, duration.duration || duration.label);
        deliveredKey = apiResult?.key || apiResult?.license_key || apiResult?.data?.key || apiResult?.data?.license_key || JSON.stringify(apiResult);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!deliveredKey) throw lastError || new Error('No reseller product ID available.');
  } catch (apiError) {
    // 4. API failed — try manual fallback
    const productIds = [...new Set([product.purchasePid, product.pid].filter(Boolean).map(String))];
    const fallback = (await Promise.all(productIds.map(id => getAvailableManualKey(id, duration.duration || duration.label))))
      .find(Boolean);
    if (fallback) {
      deliveredKey = fallback.key;
      source = 'manual';
      await update(ref(firebaseDb, `manualLicenseKeys/${fallback.id}`), { used: true, usedBy: uid, usedAt: Date.now() });
    } else {
      // 5. Both failed — refund + alert admin
      await update(ref(firebaseDb, `users/${uid}`), { balance: currentBalance, updatedAt: Date.now() });
      try { await adminSaveAlert('keys_exhausted', {
        productId: String(product.purchasePid || product.pid),
        productName: product.name,
        duration: duration.duration || duration.label,
        apiError: apiError.message,
        uid,
        userName: userName || uid,
        userPhone: user.phone || '',
      }); } catch (_) { /* non-blocking */ }
      throw new Error('⛔ Server is currently down. Our team is working on it. Please try again in 1-2 hours. Your balance has been refunded.');
    }
  }

  // 6. Save license key record
  const keyId = `lk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await set(ref(firebaseDb, `licenseKeys/${keyId}`), {
    uid,
    userId: uid,
    user: userName || uid,
    productId: String(product.purchasePid || product.pid),
    product: product.name,
    productName: product.name,
    duration: duration.duration || duration.label,
    key: deliveredKey,
    keyCode: deliveredKey,
    status: 'active',
    source,
    price: value,
    purchasedAt: Date.now(),
  });

  // 7. Create transaction
  const txId = `tx_buy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await set(ref(firebaseDb, `transactions/${txId}`), {
    uid,
    type: 'purchase',
    amount: value,
    before: currentBalance,
    after: newBalance,
    note: `${product.name} · ${duration.duration || duration.label}`,
    productId: String(product.pid),
    createdAt: Date.now(),
  });

  // 8. Update user purchase stats
  await update(ref(firebaseDb, `users/${uid}`), {
    totalPurchase: Number(user.totalPurchase || 0) + value,
    myPurchases: Number(user.myPurchases || 0) + value,
    updatedAt: Date.now(),
  });

  return { success: true, key: deliveredKey, source, keyId };
}

/* ── Admin Alerts (keys exhaustion) ─────────────────────────────── */

export async function adminSaveAlert(type, data = {}) {
  if (!firebaseDb) return;
  const id = `alert_${Date.now()}`;
  await set(ref(firebaseDb, `adminAlerts/${id}`), {
    type,
    ...data,
    timestamp: Date.now(),
    resolved: false,
    resolvedAt: null,
  });
  return id;
}

export async function getAdminAlerts() {
  if (!firebaseDb) return [];
  const snap = await get(ref(firebaseDb, 'adminAlerts'));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function resolveAdminAlert(alertId) {
  if (!firebaseDb || !alertId) return;
  // Get the alert to find the user
  const snap = await get(ref(firebaseDb, `adminAlerts/${alertId}`));
  const alert = snap.val();
  await update(ref(firebaseDb, `adminAlerts/${alertId}`), {
    resolved: true,
    resolvedAt: Date.now(),
  });
  // Save a notification for the affected user
  if (alert?.uid) {
    const notifId = `ir_${Date.now()}`;
    await set(ref(firebaseDb, `userNotifications/${alert.uid}/${notifId}`), {
      type: 'issue_resolved',
      title: 'Issue Resolved',
      message: 'Your issue is now resolved. Please purchase now.',
      alertId,
      productName: alert.productName || '',
      createdAt: Date.now(),
      dismissed: false,
    });
  }
}

export async function getUserResolvedNotification(uid) {
  if (!firebaseDb || !uid) return null;
  const snap = await get(ref(firebaseDb, `userNotifications/${uid}`));
  if (!snap.exists()) return null;
  const entries = Object.entries(snap.val())
    .map(([id, val]) => ({ id, ...val }))
    .filter(n => n.type === 'issue_resolved' && !n.dismissed)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return entries.length > 0 ? entries[0] : null;
}

export async function dismissUserNotification(uid, notifId) {
  if (!firebaseDb || !uid || !notifId) return;
  await update(ref(firebaseDb, `userNotifications/${uid}/${notifId}`), {
    dismissed: true,
    dismissedAt: Date.now(),
  });
}

export async function clearResolvedAlerts() {
  if (!firebaseDb) return;
  const snap = await get(ref(firebaseDb, 'adminAlerts'));
  if (!snap.exists()) return;
  for (const [id, val] of Object.entries(snap.val())) {
    if (val?.resolved) {
      await set(ref(firebaseDb, `adminAlerts/${id}`), null);
    }
  }
}

/* ── Gift Codes ──────────────────────────────────────────────────── */

export async function adminCreateGiftCode(amount, maxRedeems) {
  if (!firebaseDb) throw new Error('Firebase not configured.');
  const value = Math.max(1, Number(amount || 0));
  if (!value) throw new Error('Enter a valid amount.');
  const maxR = Math.max(1, Math.min(100, Number(maxRedeems || 1)));
  // Generate a random 8-char gift code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const id = `gc_${code}`;
  await set(ref(firebaseDb, `giftCodes/${id}`), {
    code,
    id,
    amount: value,
    maxRedeems: maxR,
    redeemedBy: {},
    totalRedeemed: 0,
    active: true,
    createdAt: Date.now(),
  });
  return { code, amount: value, maxRedeems: maxR };
}

export async function getGiftCodes() {
  if (!firebaseDb) return [];
  const snap = await get(ref(firebaseDb, 'giftCodes'));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function redeemGiftCode(uid, userName, userPhone, code) {
  if (!firebaseDb || !uid) throw new Error('Not authenticated.');
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) throw new Error('Enter a gift code.');
  // Find the gift code
  const allGc = await getGiftCodes();
  const gc = allGc.find(g => g.code === cleanCode && g.active);
  if (!gc) throw new Error('Invalid or expired gift code.');
  if (gc.totalRedeemed >= gc.maxRedeems) throw new Error('This gift code has reached its maximum redemptions.');
  if (gc.redeemedBy && gc.redeemedBy[uid]) throw new Error('You have already redeemed this gift code.');
  // Credit user
  const userRef = ref(firebaseDb, `users/${uid}`);
  const userSnap = await get(userRef);
  const user = userSnap.exists() ? userSnap.val() : {};
  const currentBalance = Number(user.balance || 0);
  const newBalance = currentBalance + gc.amount;
  await update(userRef, { balance: newBalance, updatedAt: Date.now() });
  // Record redemption
  const redeemedBy = { ...(gc.redeemedBy || {}), [uid]: { name: userName || uid, phone: userPhone || '', redeemedAt: Date.now() } };
  await update(ref(firebaseDb, `giftCodes/${gc.id}`), {
    redeemedBy,
    totalRedeemed: (gc.totalRedeemed || 0) + 1,
    ...(gc.totalRedeemed + 1 >= gc.maxRedeems ? { active: false } : {}),
  });
  // Create transaction record
  const txId = `tx_gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await set(ref(firebaseDb, `transactions/${txId}`), {
    uid,
    type: 'gift_redeem',
    amount: gc.amount,
    before: currentBalance,
    after: newBalance,
    note: `Gift code ${cleanCode} · Redeemed by ${userName || uid}`,
    giftCode: cleanCode,
    createdAt: Date.now(),
  });
  return { amount: gc.amount, code: cleanCode };
}

export async function getUserGiftRedemptions(uid) {
  if (!firebaseDb || !uid) return [];
  const allGc = await getGiftCodes();
  return allGc
    .filter(g => g.redeemedBy && g.redeemedBy[uid])
    .map(g => ({
      code: g.code,
      amount: g.amount,
      redeemedAt: g.redeemedBy[uid].redeemedAt,
    }))
    .sort((a, b) => (b.redeemedAt || 0) - (a.redeemedAt || 0));
}

/* ── Site Status (server-down / operational banner) ──────────────── */

export async function setSiteStatus(status, message = '') {
  if (!firebaseDb) throw new Error('Firebase not configured.');
  await set(ref(firebaseDb, 'settings/siteStatus'), {
    status,
    message: message.trim() || '',
    updatedAt: Date.now(),
  });
}

export async function getSiteStatus() {
  if (!firebaseDb) return { status: 'operational', message: '' };
  const snap = await get(ref(firebaseDb, 'settings/siteStatus'));
  return snap.exists() ? snap.val() : { status: 'operational', message: '' };
}

/* ── Delete Reseller ────────────────────────────────────────────── */

export async function adminDeleteReseller(resellerId) {
  if (!firebaseDb || !resellerId) throw new Error('Firebase database is not configured.');
  await set(ref(firebaseDb, `resellers/${resellerId}`), null);
  return true;
}

export async function checkResellerBalance() {
  if (!resellerEndpoint || !resellerApiKey || !resellerMasterKey) throw new Error('Reseller API is not configured.');
  const body = new URLSearchParams({
    api_key: resellerApiKey,
    action: 'balance',
  });
  try {
    const response = await fetch(resellerEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-master-key': resellerMasterKey,
      },
      body,
    });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }
    return data;
  } catch (err) {
    return { error: true, message: err.message };
  }
}
