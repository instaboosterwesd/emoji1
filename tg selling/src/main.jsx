import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import lottie from 'lottie-web';
import { createRoot } from 'react-dom/client';
import { FcGoogle } from 'react-icons/fc';
import { SiGooglepay, SiPhonepe, SiPaytm } from 'react-icons/si';
import { ChevronRight, LayoutList, MoreVertical, PanelRight, Plus, RefreshCw, Send, ShoppingCart, Sparkles, X } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Drawer } from 'vaul';
import countryData from 'country-telephone-data';
import { initSecurity } from './security.js';
import {
  changeUserPassword,
  ensureGoogleUser,
  ensurePhoneUser,
  ensureUserApiKey,
  getUserProfile,
  getGoogleRedirectResult,
  loginWithApiKey,
  resetUserApiKey,
  sendIndiaOtp,
  signInWithGoogle,
  updateUserProfile,
  verifyIndiaOtp,
  adminAdjustUserFund,
  adminSaveAnnouncement,
  adminSaveProductRule,
  adminSaveProductPricingSettings,
  adminSaveReseller,
  adminSaveUpi,
  adminUpdateUser,
  adminDeleteLicenseKey,
  adminUpdatePaymentRequest,
  fetchGameProducts,
  getAdminOverview,
  getPaymentSettings,
  createPaymentRequest,
  createGatewayPaymentRequest,
  createCashfreeOrder,
  verifyCashfreeOrder,
  getUserTransactions,
  subscribeUserTransactions,
  getUserLicenseKeys,
  getAdminPricingRules,
  getProductPricingSettings,
  getCommunityLinks,
  createKeyResetRequest,
  getUserKeyResetRequests,
  adminSaveCommunityLinks,
  adminReviewKeyResetRequest,
  adminAddManualKey,
  adminDeleteManualKey,
  adminDeliverContactKey,
  adminRejectContactKey,
  isDeviceBoundProduct,
  purchaseProduct,
  adminDeleteReseller,
  checkResellerBalance,
  getAnnouncements,
  getAdminAlerts,
  resolveAdminAlert,
  clearResolvedAlerts,
  getSiteStatus,
  setSiteStatus,
  getUserResolvedNotification,
  dismissUserNotification,
  redeemGiftCode,
  getUserGiftRedemptions,
  adminCreateGiftCode,
  getGiftCodes,
  productIconFor,
  getProductChannels,
  findProductChannel,
  adminSaveProductChannel,
  adminDeleteProductChannel,
  getProductCatalogMeta,
  fetchStorefrontProducts,
  adminSaveProductCatalog,
  adminUpdateProductPids,
  adminSetProductCatalogLinkMode,
  parseProductPidSource,
  parseProductSource,
} from './services';
import './styles.css';
import './feature-fixes.css';
import './site-status.css';
import './issues.css';
import './gift-code.css';

/* ── Performance Context ────────────────────────────────────────── */
const PerfCtx = React.createContext();
const usePerf = () => React.useContext(PerfCtx);

/* ── Constants ─────────────────────────────────────────────────── */
const logo = '/devx-logo.webp';
const telegramLogo = '/telegram-logo.png';
const money = v => Number(v || 0).toLocaleString('en-IN');
const roundMoney = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const gatewayChargeAmount = (amount, percent) => roundMoney(
  Math.max(0, Number(amount || 0)) * Math.max(0, Number(percent || 0)) / 100,
);
const MoneyDisplay = ({ value }) => <strong className="inline-money">₹{money(value)}</strong>;
const flag = iso2 => iso2.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
const fmtDate = v => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};
const toastOptions = {
  duration: 3400,
  classNames: {
    toast: 'app-toast',
    title: 'app-toast-title',
    description: 'app-toast-description',
    success: 'app-toast-success',
    warning: 'app-toast-warning',
    error: 'app-toast-error',
  },
};

/* ── MatIcon ────────────────────────────────────────────────────── */
const MatIcon = ({ name, size = 20, className = '', style: extraStyle, ...rest }) => (
  <img
    src={`/icons/material/${name}.svg`}
    className={`mat-icon${className ? ` ${className}` : ''}`}
    style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain', ...extraStyle }}
    alt=""
    aria-hidden="true"
    {...rest}
  />
);

/* ── Brand icon map (defined in services.js, imported here) ────── */
const productIconForWithFallback = name => productIconFor(name) || '/icons/new/product-box.png';
const AI_CATALOG_REFRESH_MS = 120000;
const MAX_AI_CART_CALLS_PER_MINUTE = 6;

function applyCatalogPricing(product, pricingRules, pricingSettings, role) {
  const isReseller = role === 'reseller';
  const onlyContact = isOnlyContactProduct(product, pricingRules);
  return {
    ...product,
    onlyContact,
    pricing: (product.pricing || []).map(item => {
      const key = `${product.pid}_${(item.duration || item.label || '').trim().replace(/[^a-z0-9]+/gi, '_')}`;
      const rule = pricingRules[key] || {};
      const apiPrice = Number(item.price || 0);
      const fixedUserPrice = Number(rule.price);
      const fixedResellerPrice = Number(rule.resellerPrice);
      const baseUserPrice = Number.isFinite(fixedUserPrice) && rule.price !== ''
        ? fixedUserPrice
        : product.pricingSource === 'imported'
          ? apiPrice
          : Math.max(0, apiPrice + pricingSettings.userAdjustment);
      const userPrice = pricingSettings.userIncreasePercent > 0
        ? Math.round(baseUserPrice * (1 + pricingSettings.userIncreasePercent / 100) * 100) / 100
        : baseUserPrice;
      const baseResellerPrice = Number.isFinite(fixedResellerPrice) && rule.resellerPrice !== ''
        ? fixedResellerPrice
        : product.pricingSource === 'imported'
          ? apiPrice
          : Math.max(0, apiPrice + pricingSettings.resellerAdjustment);
      const resellerPrice = pricingSettings.resellerIncreasePercent > 0
        ? Math.round(baseResellerPrice * (1 + pricingSettings.resellerIncreasePercent / 100) * 100) / 100
        : baseResellerPrice;
      return { ...item, price: isReseller ? resellerPrice : userPrice, isResellerPrice: isReseller };
    }),
  };
}

function catalogTokens(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9₹]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function rankCatalogMatches(products, query) {
  const terms = catalogTokens(query);
  if (!terms.length) return [];
  return products
    .map(product => {
      const name = String(product.name || '').toLowerCase();
      const searchable = `${name} ${product.game || ''} ${product.platform || ''} ${(product.features || []).join(' ')}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (name.includes(term) ? 5 : searchable.includes(term) ? 2 : 0), 0);
      return { product, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.product);
}

function safeCatalogDetails(product) {
  const features = (product.features || []).filter(Boolean);
  const description = String(product.description || '').replace(/<[^>]*>/g, '').trim();
  return description || features.join(' · ') || 'Package details are available in the live catalog.';
}

function isOnlyContactProduct(product, pricingRules = {}) {
  const pid = String(product?.pid || product?.productId || '');
  return Object.values(pricingRules || {}).some(rule =>
    String(rule?.pid || '') === pid && rule?.onlyContact === true
  );
}

function supportChatUrl(helpUrl, productName, duration, userName) {
  const raw = String(helpUrl || '').trim();
  if (!raw) return '';
  const normalized = raw.startsWith('@')
    ? `https://t.me/${raw.slice(1)}`
    : /^[a-zA-Z0-9_]{3,}$/.test(raw)
      ? `https://t.me/${raw}`
      : raw;
  try {
    const url = new URL(normalized);
    const buyer = userName ? ` I am ${userName}.` : '';
    const message = `Hey bro, I have paid successfully for ${productName || 'this product'} (${duration || 'selected duration'}).${buyer} Please give me my key.`;
    url.searchParams.set('text', message);
    return url.toString();
  } catch {
    return normalized;
  }
}

function resolveProductSupportLinks(product, channels = [], fallbackGetFileUrl = '') {
  const channel = findProductChannel(product?.name || product?.productName || product?.product || '', channels);
  const feedbackUrl = channel?.feedbackUrl || product?.feedbackUrl || '';
  const sourceFileUpdateUrl = product?.sourceLinksEnabled === true
    ? (product?.sourceFileUpdateUrl || product?.fileUpdateUrl || '')
    : '';
  const configuredFileUpdateUrl = channel?.isDefault
    ? (product?.fileUpdateUrl || channel.fileUpdateUrl || fallbackGetFileUrl || '')
    : (channel?.fileUpdateUrl || product?.fileUpdateUrl || fallbackGetFileUrl || '');
  return { feedbackUrl, fileUpdateUrl: sourceFileUpdateUrl || configuredFileUpdateUrl };
}

/* ── Shared micro-components ────────────────────────────────────── */
const SectionTitle = ({ title, subtitle }) => (
  <div className="section-title"><h1>{title}</h1><p>{subtitle}</p></div>
);
const Detail = ({ label, icon, lottieIcon, value }) => (
  <div className="detail-row">
    <span className="detail-label">
      {icon && <img src={icon} style={{width:18,height:18,objectFit:'contain',borderRadius:5,flexShrink:0}} alt="" />}
      {lottieIcon && <LottieIcon src={lottieIcon} size={18} />}
      {label}
    </span>
    <strong>{value}</strong>
  </div>
);
const Stat = ({ label, value, iconName, lottieIcon }) => (
  <div className={`stat-card${lottieIcon ? ' has-lottie' : ''}`}>
    {lottieIcon && <LottieIcon src={lottieIcon} size={30} />}
    {iconName && <MatIcon name={iconName} size={19} />}
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);
const SkeletonRow = ({ wide = false }) => (
  <div className={`skeleton-row${wide ? ' wide' : ''}`} aria-hidden="true">
    <div className="skeleton-avatar" />
    <div className="skeleton-lines"><div /><div /></div>
    <span />
  </div>
);
const PageSkeleton = ({ tab }) => {
  const rows = tab === 'buy' ? 3 : tab === 'dashboard' ? 4 : 3;
  return (
    <div className="page-skeleton" role="status" aria-label="Loading page">
      <div className="skeleton-title"><div /><span /></div>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={`${tab}-${i}`} wide={i === 0} />)}
    </div>
  );
};
const ProductSkeletonList = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <article className="glass-card product-card product-skeleton" key={`ps-${i}`} role="status" aria-label="Loading products">
        <div className="product-skeleton-media" />
        <SkeletonRow wide />
        <div className="product-skeleton-feature" />
        <div className="product-skeleton-feature short" />
        <div className="product-skeleton-button" />
      </article>
    ))}
  </>
);

/* ── Login ──────────────────────────────────────────────────────── */
function Login({ onSuccess, siteStatus }) {
  const [step, setStep] = useState('phone');
  const [otpMeta, setOtpMeta] = useState(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [country, setCountry] = useState(countryData.allCountries.find(c => c.iso2 === 'in'));
  const filtered = useMemo(
    () => countryData.allCountries.filter(c => `${c.name} ${c.dialCode}`.toLowerCase().includes(countryQuery.toLowerCase())).slice(0, 80),
    [countryQuery],
  );

  const handleMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
  };

  const sendOtp = async e => {
    e.preventDefault();
    try {
      const meta = await sendIndiaOtp(phone);
      setOtpMeta(meta);
      setStep('otp');
      toast.success('OTP sent', { description: 'Enter the 4-digit code sent to your phone.' });
    } catch (err) { toast.error(err.message); }
  };

  const verifyOtp = async e => {
    e.preventDefault();
    try {
      const result = await verifyIndiaOtp(phone, otp, otpMeta?.deviceId);
      const user = await ensurePhoneUser(phone, result.user);
      toast.success('Login successful', { icon: <MatIcon name="check_circle" size={18} /> });
      setTimeout(() => onSuccess(user), 350);
    } catch (err) { toast.error(err.message); }
  };

  const googleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      if (!result) return;
      const user = await ensureGoogleUser(result.user);
      toast.success('Google login successful');
      onSuccess(user);
    } catch (err) { toast.error(err.message); }
  };

  const apiLogin = async e => {
    e.preventDefault();
    try {
      const user = await loginWithApiKey(apiKey);
      toast.success('API login successful');
      onSuccess(user);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <main className="page">
      <video className="backdrop" autoPlay muted loop playsInline playsInline poster="/splash-poster.jpg"><source src="/splash.webm" type="video/webm" /><source src="/splash.mp4" type="video/mp4" /></video>
      <div className="veil" />
      {siteStatus && siteStatus.status !== 'operational' && siteStatus.message && (
        <div className="site-status-banner down" style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <LottieIcon src="/icons/new/feat-crystal-skull.json" size={18} />
          <span>{siteStatus.message}</span>
        </div>
      )}
      {siteStatus && siteStatus.status === 'operational' && siteStatus.message && (
        <div className="site-status-banner ok" style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={16} />
          <span>{siteStatus.message}</span>
        </div>
      )}
      <section className="login-card" onMouseMove={handleMove}>
        <div className="mouse-glow" />
        {step === 'phone' && (
          <>
            <img className="devx-logo" src={logo} alt="Brand logo" />
            <p className="eyebrow"><LottieIcon src="/icons/new/welcome-yoda.json" size={22} /> WELCOME BACK <LottieIcon src="/icons/new/welcome-yoda.json" size={22} /></p>
            <h1><LottieIcon src="/icons/new/signin-flame.json" size={28} /> Sign in to continue</h1>
            <p className="intro">Enter your phone number to connect with your account.</p>
            <form onSubmit={sendOtp}>
              <label htmlFor="phone"><LottieIcon src="/icons/new/phone-spidey.json" size={20} /> Phone number <LottieIcon src="/icons/new/phone-arrow.json" size={20} /></label>
              <div className="phone-field">
                <button className="country-trigger" type="button" onClick={() => setCountryOpen(o => !o)}>
                  <span className="flag">{flag(country.iso2)}</span>
                  <span className="code">+{country.dialCode}</span>
                  <span className="chevron">⌄</span>
                </button>
                <input id="phone" value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="Your phone number" required />
                {countryOpen && (
                  <div className="country-menu">
                    <input autoFocus className="country-search" value={countryQuery} onChange={e => setCountryQuery(e.target.value)} placeholder="Search country or code" />
                    <div className="country-list">
                      {filtered.map(c => (
                        <button type="button" className="country-option" key={`${c.iso2}-${c.dialCode}`} onClick={() => { setCountry(c); setCountryOpen(false); setCountryQuery(''); }}>
                          <span>{flag(c.iso2)}</span>
                          <span className="country-name">{c.name}</span>
                          <span className="country-code">+{c.dialCode}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button className="primary" type="submit"><LottieIcon src="/icons/new/send-flash.json" size={22} /> Send OTP <MatIcon name="arrow_forward" size={19} /></button>
            </form>
            <div className="divider"><span>or continue with</span></div>
            <div className="socials">
              <button className="social" type="button" onClick={googleLogin}><LottieIcon src="/icons/new/google-lottie.json" size={24} /><span>Google</span></button>
              <button className="social" type="button" onClick={() => setStep('api')}><LottieIcon src="/icons/new/telegram-lottie.json" size={24} /><span>Bot</span></button>
            </div>
            <Terms />
          </>
        )}
        {step === 'otp' && (
          <>
            <button className="back-link" type="button" onClick={() => setStep('phone')}><MatIcon name="arrow_back" size={16} /> Change number</button>
            <img className="devx-logo small" src={logo} alt="Brand logo" />
            <p className="eyebrow"><DeviceIcon emoji="/icons/new/shield-verify.json" icon="security" size={18} /> SECURE VERIFICATION <DeviceIcon emoji="/icons/new/shield-verify.json" icon="security" size={18} /></p>
            <h1><LottieIcon src="/icons/new/otp-clipboard.json" size={28} /> Enter your OTP</h1>
            <p className="intro">We sent a 4-digit code to +{country.dialCode} {phone}.</p>
            <form onSubmit={verifyOtp}>
              <label htmlFor="otp">Verification code</label>
              <input className="otp-input" id="otp" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} placeholder="0000" autoFocus required />
              <button className="primary" type="submit"><DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={20} /> Verify &amp; continue <MatIcon name="arrow_forward" size={19} /></button>
            </form>
          </>
        )}
        {step === 'api' && (
          <>
            <button className="back-link" type="button" onClick={() => setStep('phone')}><MatIcon name="arrow_back" size={16} /> Back to login</button>
            <img className="devx-logo small" src={logo} alt="Brand logo" />
            <p className="eyebrow">BOT ACCESS</p>
            <h1>Private API login</h1>
            <p className="intro">Paste the private key from your profile API settings.</p>
            <form onSubmit={apiLogin}>
              <label htmlFor="api-key">API key</label>
              <input className="api-login-input" id="api-key" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="tg_..." autoFocus required />
              <button className="primary" type="submit">Login with API <LottieIcon src="/icons/new/key-lottie.json" size={18} /></button>
            </form>
          </>
        )}
      </section>
      <p className="footer-note">Secure access · Made for mobile</p>
    </main>
  );
}

function Terms() {
  return (
    <p className="terms">
      By continuing, you agree to our{' '}
      <Drawer.Root>
        <Drawer.Trigger asChild><a href="#terms">Terms</a></Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="drawer-overlay" />
          <Drawer.Content className="drawer-content">
            <div className="drawer-handle" />
            <h2>Terms of access</h2>
            <p>OTP and account access are connected to Firebase and the configured verification service.</p>
            <Drawer.Close className="drawer-close">Close</Drawer.Close>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>{' '}
      and <a href="#privacy">Privacy Policy</a>.
    </p>
  );
}

function AiShopTrigger({ open, onClick, hasHelpLink }) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 150);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      className={`ai-shop-trigger${compact ? ' compact' : ''}${open ? ' is-open' : ''}`}
      style={hasHelpLink ? { bottom: 148 } : undefined}
      type="button"
      onClick={onClick}
      aria-label="Shop with AI"
      aria-expanded={open}
    >
      <span className="ai-shop-trigger-icon"><Sparkles size={16} strokeWidth={2.4} /></span>
      <span className="ai-shop-trigger-label">Shop with AI</span>
    </button>
  );
}

function AiShopPanel({ session, onBuy, onClose }) {
  const [products, setProducts] = useState([]);
  const [pricingRules, setPricingRules] = useState({});
  const [pricingSettings, setPricingSettings] = useState({ userAdjustment: -20, resellerAdjustment: 10, userIncreasePercent: 0, resellerIncreasePercent: 0 });
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{
    id: 'welcome',
    role: 'assistant',
    text: 'Hi! Ask me about a product, package, price, or what is trending. I use the live catalog only.',
    suggestions: ['Best sellers', 'Show all packages'],
  }]);
  const [cart, setCart] = useState([]);
  const [cartCalls, setCartCalls] = useState([]);
  const [lastFetchedAt, setLastFetchedAt] = useState(0);
  const [compactView, setCompactView] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const threadRef = useRef(null);

  const loadCatalog = useCallback(async (force = false) => {
    if (!force && products.length && Date.now() - lastFetchedAt < AI_CATALOG_REFRESH_MS) return;
    setLoading(true);
    try {
      const [catalog, rules, settings] = await Promise.all([
        fetchStorefrontProducts(session?.role),
        getAdminPricingRules().catch(() => ({})),
        getProductPricingSettings().catch(() => ({ userAdjustment: -20, resellerAdjustment: 10, userIncreasePercent: 0, resellerIncreasePercent: 0 })),
      ]);
      setProducts(catalog);
      setPricingRules(rules);
      setPricingSettings(settings);
      setLastFetchedAt(Date.now());
      return catalog;
    } catch (err) {
      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', text: err.message || 'The live catalog could not be loaded. Please try again.', suggestions: ['Refresh catalog'] }]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [lastFetchedAt, products.length]);

  useEffect(() => { loadCatalog(true); }, []);
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, cart]);

  const pricedProducts = useMemo(
    () => products.map(product => applyCatalogPricing(product, pricingRules, pricingSettings, session?.role)),
    [products, pricingRules, pricingSettings, session?.role],
  );

  const addToCart = useCallback((product, duration) => {
    const now = Date.now();
    const recentCalls = cartCalls.filter(timestamp => now - timestamp < 60000);
    if (recentCalls.length >= MAX_AI_CART_CALLS_PER_MINUTE) {
      setMessages(prev => [...prev, { id: `limit-${now}`, role: 'assistant', text: 'You have reached the add-to-cart limit for this minute. Please wait a moment and try again.' }]);
      return false;
    }
    if (!product || !duration || Number(duration.price) <= 0) {
      setMessages(prev => [...prev, { id: `unavailable-${now}`, role: 'assistant', text: 'That package is currently unavailable. I cannot add it without a live price. Try another package from this product.' }]);
      return false;
    }
    setCartCalls([...recentCalls, now]);
    setCart([{ product, duration }]);
    setMessages(prev => [...prev, {
      id: `cart-${now}`,
      role: 'assistant',
      text: `${product.name} · ${duration.duration || duration.label} is ready for confirmation.`,
      cartItem: { product, duration },
      suggestions: ['Show other packages', 'Best sellers'],
    }]);
    return true;
  }, [cartCalls]);

  const answer = useCallback(async rawQuery => {
    const query = String(rawQuery || '').trim();
    if (!query) return;
    const now = Date.now();
    setInput('');
    setMessages(prev => [...prev, { id: `user-${now}`, role: 'user', text: query }]);
    const freshProducts = Date.now() - lastFetchedAt > AI_CATALOG_REFRESH_MS || /price|cost|₹|rupee|package|best|trend/i.test(query);
    const catalog = await loadCatalog(freshProducts) || pricedProducts;
    const visible = catalog.map(product => applyCatalogPricing(product, pricingRules, pricingSettings, session?.role));
    const lower = query.toLowerCase();
    const ranked = rankCatalogMatches(visible, query);
    const isTrending = /best|trend|popular|selling|seller|top/i.test(lower);
    if (/refresh/i.test(lower)) {
      await loadCatalog(true);
      setMessages(prev => [...prev, { id: `refresh-${now}`, role: 'assistant', text: 'The live catalog was refreshed. Ask me for a product or package.', suggestions: ['Best sellers', 'Show all packages'] }]);
      return;
    }
    if (isTrending) {
      const trending = [...visible].sort((a, b) => {
        const salesDiff = Number(b.salesCount || 0) - Number(a.salesCount || 0);
        return salesDiff || a.name.localeCompare(b.name);
      }).slice(0, 5);
      setMessages(prev => [...prev, {
        id: `trending-${now}`,
        role: 'assistant',
        text: trending.length ? 'Trending products from the live catalog:' : 'No trending products are available right now.',
        products: trending,
        suggestions: ['Show all packages'],
      }]);
      return;
    }
    if (/all package|show products|catalog|what do you have/i.test(lower)) {
      setMessages(prev => [...prev, {
        id: `catalog-${now}`,
        role: 'assistant',
        text: visible.length ? 'Here are the available products from the live catalog:' : 'No products are currently available.',
        products: visible.slice(0, 8),
        suggestions: ['Best sellers'],
      }]);
      return;
    }
    if (!ranked.length) {
      const category = rankCatalogMatches(visible, lower.split(/\s+/).slice(0, 1).join(' '));
      setMessages(prev => [...prev, {
        id: `nomatch-${now}`,
        role: 'assistant',
        text: category.length
          ? `I could not find an exact catalog match. The closest available category is ${category[0].game || 'the available catalog'}.`
          : 'I could not find that in the live catalog. Try a product name, game, or “Best sellers”.',
        products: category.slice(0, 3),
        suggestions: ['Best sellers', 'Show all packages'],
      }]);
      return;
    }
    const product = ranked[0];
    const wantsDetails = /include|included|feature|detail|what is|package|price|cost|how much/i.test(lower);
    setMessages(prev => [...prev, {
      id: `product-${now}`,
      role: 'assistant',
      text: wantsDetails
        ? `${product.name} is available in the live catalog. ${safeCatalogDetails(product)}`
        : `I found ${product.name} in the live catalog.`,
      products: [product],
      suggestions: ['Show other packages', 'Best sellers'],
    }]);
  }, [lastFetchedAt, loadCatalog, pricingRules, pricingSettings, pricedProducts, session?.role]);

  const submit = e => {
    e.preventDefault();
    answer(input);
  };

  const chooseSuggestion = suggestion => {
    if (suggestion === 'Show other packages') {
      const lastProduct = [...messages].reverse().find(message => message.products?.length)?.products?.[0];
      if (lastProduct) {
        setMessages(prev => [...prev, { id: `packages-${Date.now()}`, role: 'assistant', text: `${lastProduct.name} packages currently available:`, products: [lastProduct] }]);
      } else answer('Show all packages');
      return;
    }
    answer(suggestion);
  };

  return (
    <aside className={`ai-shop-panel${compactView ? ' compact' : ''}`} role="dialog" aria-modal="true" aria-label="Shop with AI">
      <header className="ai-shop-header">
        <div className="ai-shop-brand">
          <span className="ai-shop-sparkle"><Sparkles size={17} /></span>
          <div><strong>reversebypass</strong><small>Live catalog assistant</small></div>
        </div>
        <div className="ai-shop-header-actions">
          {cart.length > 0 && <span className="ai-shop-cart-count"><ShoppingCart size={16} /> {cart.length}</span>}
          <button type="button" aria-label="Toggle layout" onClick={() => setCompactView(value => !value)}><LayoutList size={17} /></button>
          <div className="ai-shop-menu-wrap">
            <button type="button" aria-label="More options" onClick={() => setMenuOpen(value => !value)}><MoreVertical size={17} /></button>
            {menuOpen && (
              <div className="ai-shop-menu">
                <button type="button" onClick={() => { setMessages([]); setCart([]); setMenuOpen(false); }}>Clear chat</button>
                <button type="button" onClick={() => { loadCatalog(true); setMenuOpen(false); }}>Refresh catalog</button>
              </div>
            )}
          </div>
          <button type="button" aria-label="Close shop" onClick={onClose}><X size={18} /></button>
        </div>
      </header>
      <div className="ai-shop-thread" ref={threadRef}>
        {loading && <div className="ai-shop-loading"><RefreshCw size={15} className="ai-spin" /> Loading live products…</div>}
        {messages.map(message => (
          <div className={`ai-shop-message ${message.role}`} key={message.id}>
            <div className="ai-shop-bubble">
              {message.role === 'assistant' ? <p>{message.text}</p> : <p>{message.text}</p>}
              {message.products?.map((product, productIndex) => (
                <div className="ai-shop-product" key={product.pid || product.id || product.name}>
                  {message.id.startsWith('trending-') && <div className="ai-shop-ranking">#{productIndex + 1} trending</div>}
                  <div className="ai-shop-product-top">
                    <img src={productIconForWithFallback(product.name)} alt="" />
                    <div><strong>{product.name}</strong><small>{product.game} · {product.platform || 'Access key'}</small></div>
                  </div>
                  <p className="ai-shop-description">{safeCatalogDetails(product)}</p>
                  <div className="ai-shop-package-list">
                    {(product.pricing || []).slice(0, 6).map(duration => (
                      <div className="ai-shop-package" key={`${product.pid}-${duration.duration || duration.label}`}>
                        <span>{duration.duration || duration.label}</span>
                        <strong>{duration.price > 0 ? `₹${money(duration.price)}` : 'Unavailable'}</strong>
                        <button
                          type="button"
                          disabled={duration.price <= 0}
                          onClick={() => addToCart(product, duration)}
                          title={duration.price <= 0 ? 'Package unavailable' : 'Add to cart'}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                  {product.pricing?.length === 0 && <small className="ai-shop-unavailable">No packages are currently available.</small>}
                </div>
              ))}
              {message.cartItem && (
                <button className="ai-shop-confirm" type="button" onClick={() => {
                  onBuy(message.cartItem);
                  onClose();
                }}>
                  Confirm purchase <ChevronRight size={16} />
                </button>
              )}
            </div>
            {message.suggestions?.length > 0 && (
              <div className="ai-shop-suggestions">
                {message.suggestions.map(suggestion => <button type="button" key={suggestion} onClick={() => chooseSuggestion(suggestion)}>{suggestion}</button>)}
              </div>
            )}
          </div>
        ))}
      </div>
      <form className="ai-shop-input-bar" onSubmit={submit}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Message areversebypass" aria-label="Message reversebypass" />
        <button type="submit" aria-label="Send message" disabled={!input.trim()}><Send size={17} /></button>
      </form>
    </aside>
  );
}

/* ── Dashboard shell ────────────────────────────────────────────── */
function Dashboard({ session, onSessionChange, onLogout, siteStatus, perfMode, onPerfSelect }) {
  const prevPerf = useRef(perfMode);
  const [tab, setTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [dialog, setDialog] = useState(null);

  /* ── Auto‑refresh when perf mode changes (including first selection) ──
     perfMode === null means dialog is opening — never reload on that.
     prevPerf.current === null means first-ever selection — always reload.
     Otherwise reload only if mode actually changed value.              */
  useEffect(() => {
    if (perfMode === null) return;                           // dialog opening, ignore
    if (prevPerf.current === null || prevPerf.current !== perfMode) {
      location.reload();                                    // first pick OR mode changed
      return;
    }
    prevPerf.current = perfMode;
  }, [perfMode]);
  const [profile, setProfile] = useState(session);
  const [apiState, setApiState] = useState({ apiKey: '', last4: session.apiKeyLast4 || '' });
  const [purchase, setPurchase] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [resolvedNotif, setResolvedNotif] = useState(null);
  const [communityLinks, setCommunityLinks] = useState({ resellerUpdatesUrl: '', getFileUrl: '', helpUrl: '' });
  const [aiShopOpen, setAiShopOpen] = useState(false);
  const [resellerBenefitsOpen, setResellerBenefitsOpen] = useState(() => {
    if (localStorage.getItem('reseller_dont_show') === '1') return false;
    return false; // will check after profile loads
  });

  useEffect(() => {
    if (!session?.uid) return;
    getUserProfile(session.uid).then(next => { setProfile(next); onSessionChange(next); }).catch(() => {});
  }, [session?.uid]);

  useEffect(() => {
    getAnnouncements().then(list => {
      setNotifs(list);
      const seenAt = parseInt(localStorage.getItem('notif_seen_at') || '0');
      if (list.some(n => (n.createdAt || 0) > seenAt)) setHasUnread(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getCommunityLinks().then(setCommunityLinks).catch(() => {});
  }, []);

  const openNotifs = () => {
    setShowNotifs(true);
    setHasUnread(false);
    localStorage.setItem('notif_seen_at', String(Date.now()));
  };

  useEffect(() => { setPageLoading(false); }, [tab]);

  /* Auto-show reseller benefits on first visit */
  useEffect(() => {
    if (!profile?.uid || profile.role === 'reseller') return;
    const key = 'reseller_seen_' + profile.uid;
    if (!localStorage.getItem(key) && localStorage.getItem('reseller_dont_show') !== '1') {
      const t = setTimeout(() => setResellerBenefitsOpen(true), 800);
      localStorage.setItem(key, '1');
      return () => clearTimeout(t);
    }
  }, [profile?.uid, profile?.role]);

  useEffect(() => {
    if (!session?.uid) return;
    getUserResolvedNotification(session.uid).then(n => { if (n) setResolvedNotif(n); }).catch(() => {});
  }, [session?.uid]);

  const refreshProfile = useCallback(async () => {
    const next = await getUserProfile(session.uid);
    setProfile(next);
    onSessionChange(next);
    return next;
  }, [session?.uid]);

  const openApi = async () => {
    try {
      const result = await ensureUserApiKey(session.uid);
      setApiState(result);
      setDialog('api');
    } catch (err) { toast.error(err.message); }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', lottieIcon: '/icons/new/shop-store.json' },
    { id: 'buy', label: 'Buy', lottieIcon: '/icons/new/shopping-cart.json' },
    { id: 'orders', label: 'My Orders', lottieIcon: '/icons/new/my-orders.json' },
    { id: 'wallet', label: 'Wallet', lottieIcon: '/icons/new/wallet-lottie.json' },
    { id: 'profile', label: 'Profile', lottieIcon: '/icons/new/profile-lottie.json' },
  ];

  const section =
    tab === 'orders' ? <OrdersView session={session} communityLinks={communityLinks} /> :
    tab === 'buy' ? <ProductsView session={session} onBuy={setPurchase} /> :
    tab === 'wallet' ? <WalletView session={session} profile={profile} refreshProfile={refreshProfile} /> :
    tab === 'profile' ? <ProfileView profile={profile} communityLinks={communityLinks} openDialog={setDialog} openApi={openApi} onShowPerf={() => onPerfSelect(null)} onResellerBenefits={() => setResellerBenefitsOpen(true)} /> :
    <DashboardHome profile={profile} role={profile.role} setTab={setTab} communityLinks={communityLinks} />;

  return (
    <main className={`dashboard-page ${theme}`}>
      {perfMode === null && (
        <PerformanceDialog onSelect={onPerfSelect} />
      )}
      <img key={theme} className="dashboard-backdrop" src={theme === 'dark' ? '/dashboard-dark-bg.webp' : '/dashboard-light-bg.webp'} alt="" aria-hidden="true" loading="lazy" />
      <div className="dashboard-veil" />
      {tab === 'dashboard' && (
        <header className="dash-header">
          <img src={logo} alt="Brand logo" />
          <div>
            <span className="dash-kicker">WELCOME BACK <LottieIcon src="/icons/new/welcome-emoji.json" size={20} /></span>
            <h2>{profile?.name || 'User'}'s dashboard</h2>
          </div>
          <div className="header-actions">
            <button className="notif-bell-btn" onClick={openNotifs} aria-label="Notifications">
              <LottieIcon src="/icons/new/bell.json" size={26} />
              {hasUnread && <span className="notif-dot" />}
            </button>
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </header>
      )}
      {siteStatus && siteStatus.status !== 'operational' && siteStatus.message && (
        <div className="site-status-banner down">
          <LottieIcon src="/icons/new/feat-crystal-skull.json" size={18} />
          <span>{siteStatus.message}</span>
        </div>
      )}
      {siteStatus && siteStatus.status === 'operational' && siteStatus.message && (
        <div className="site-status-banner ok">
          <DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={16} />
          <span>{siteStatus.message}</span>
        </div>
      )}
      <div key={`${tab}-${pageLoading}`} className={`dash-content tab-motion${tab === 'dashboard' ? '' : ' no-header'} tab-${tab}`}>
        {pageLoading ? <PageSkeleton tab={tab} /> : section}
      </div>
      {communityLinks.helpUrl && (
        <a className="telegram-float-btn" href={communityLinks.helpUrl} target="_blank" rel="noreferrer" aria-label="Get Telegram help">
          <img src={telegramLogo} alt="" /> <span>Help</span>
        </a>
      )}
      <AiShopTrigger open={aiShopOpen} hasHelpLink={Boolean(communityLinks.helpUrl)} onClick={() => setAiShopOpen(true)} />
      {aiShopOpen && <AiShopPanel session={profile} onBuy={setPurchase} onClose={() => setAiShopOpen(false)} />}
      <nav className="bottom-nav">
        {navItems.map(({ id, label, icon, lottieIcon }) => (
          <button key={id} className={`${tab === id ? 'active' : ''}${lottieIcon ? ' has-lottie' : ''}`} onClick={() => setTab(id)}>
            {lottieIcon && <LottieIcon src={lottieIcon} size={22} loop />}
            {icon && <MatIcon name={icon} size={20} />}
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <ProfileDialog type={dialog} profile={profile} apiState={apiState} close={() => setDialog(null)} onLogout={onLogout} onProfile={next => { setProfile(next); onSessionChange(next); }} onApiState={setApiState} />
      {showNotifs && (
        <div className="notif-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setShowNotifs(false); }}>
          <div className="notif-dialog liquid-dialog">
            <div className="notif-dialog-header">
              <LottieIcon src="/icons/new/bell.json" size={26} />
              <h3>Notifications</h3>
              <button className="notif-close-btn" onClick={() => setShowNotifs(false)}><DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={16} /></button>
            </div>
            {notifs.length === 0
              ? <p className="muted empty-state" style={{ padding: '24px 0' }}>No notifications yet</p>
              : <div className="notif-list">{
                notifs.map(n => (
                  <div key={n.id} className="notif-item">
                    {n.title && <strong className="notif-title">{n.title}</strong>}
                    <p className="notif-msg">{n.message}</p>
                    <small className="notif-time muted">{fmtDate(n.createdAt)}</small>
                  </div>
                ))
              }</div>
            }
          </div>
        </div>
      )}
      {resolvedNotif && (
        <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) return; }}>
          <section className="action-modal liquid-dialog resolved-issue-dialog">
            <div className="resolved-issue-icon">
              <LottieIcon src="/icons/new/issue-resolved.json" size={64} />
            </div>
            <h2><DeviceIcon emoji="/icons/new/verified-badge.json" icon="verified_user" size={20} /> Issue Resolved!</h2>
            <p className="muted" style={{ textAlign: 'center', fontSize: '14px', lineHeight: 1.6 }}>
              Your issue has been resolved by the admin. <br />
              You can now purchase your product.
            </p>
            <div className="modal-btn-row" style={{ justifyContent: 'center', gap: 10 }}>
              <button className="modal-save" type="button" onClick={() => {
                if (session?.uid && resolvedNotif?.id) {
                  dismissUserNotification(session.uid, resolvedNotif.id).catch(() => {});
                }
                setResolvedNotif(null);
                setTab('buy');
              }}>
                <DeviceIcon emoji="/icons/new/shopping-cart.json" icon="shopping_cart" size={16} /> Buy now
              </button>
              <button type="button" onClick={() => {
                if (session?.uid && resolvedNotif?.id) {
                  dismissUserNotification(session.uid, resolvedNotif.id).catch(() => {});
                }
                setResolvedNotif(null);
              }}>
                <MatIcon name="close" size={16} /> Dismiss
              </button>
            </div>
          </section>
        </div>
      )}
      <PurchaseDialog purchase={purchase} session={session} communityLinks={communityLinks} close={() => setPurchase(null)} onPurchased={refreshProfile} />
      {resellerBenefitsOpen && (
        <ResellerBenefitsDialog
          resellerPrice={0}
          onUnlock={() => { setResellerBenefitsOpen(false); navigate('/add-fund'); }}
          onClose={() => setResellerBenefitsOpen(false)}
        />
      )}
      <Toaster position="top-center" offset={78} theme={theme} toastOptions={toastOptions} icons={{ success: <DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={20} /> }} />
    </main>
  );
}

/* ── DashboardHome ──────────────────────────────────────────────── */
function DashboardHome({ profile, role, setTab, communityLinks }) {
  return (
    <>
      <SectionTitle title={<><LottieIcon src="/icons/new/shop-store.json" size={26} /> Dashboard</>} subtitle={<>Here's what is happening today <DeviceIcon emoji="/icons/new/today-emoji.json" icon="today" size={16} /></>} />
      <div className="balance-card">
        <span>My balance</span>
        <strong className="balance-amount"><LottieIcon src="/icons/new/balance-emoji.json" size={22} /><span>₹{money(profile.balance)}</span></strong>
        <button className="add-funds has-lottie" onClick={() => setTab('wallet')}>
          <DeviceIcon emoji="/icons/new/add-funds-plus.json" icon="add" size={20} /> Deposit
        </button>
      </div>
      <div className="stats-grid">
        <Stat label="Today sales" value={<MoneyDisplay value={profile.todaySales} />} lottieIcon="/icons/new/today-sales.json" />
        <Stat label="Monthly sales" value={<MoneyDisplay value={profile.monthlySales} />} lottieIcon="/icons/new/monthly-sales.json" />
        <Stat label="My purchases" value={<MoneyDisplay value={profile.myPurchases} />} lottieIcon="/icons/new/shopping-cart.json" />
        <Stat label="Active keys" value={profile.active || 0} lottieIcon="/icons/new/active-keys.json" />
      </div>
      {role === 'admin' && (
        <button className="admin-wide glass-card" onClick={() => window.location.assign('/admin')}>
          <DeviceIcon emoji="/icons/new/crown.json" icon="workspace_premium" size={20} /> Open admin dashboard
        </button>
      )}
      {role === 'reseller' && (
        <div className="community-action-card glass-card">
          <div>
            <strong><DeviceIcon emoji="/icons/new/telegram-lottie.json" icon="campaign" size={20} /> Reseller All Update</strong>
            <p className="muted">Join the reseller updates channel for files and announcements.</p>
          </div>
          {communityLinks.resellerUpdatesUrl && (
            <a className="community-action-btn" href={communityLinks.resellerUpdatesUrl} target="_blank" rel="noreferrer">
              <img src={telegramLogo} alt="" /> Join
            </a>
          )}
        </div>
      )}
      <div className="glass-card">
        <div className="card-heading recent-heading">
          <div className="heading-title-row">
            <span className="recent-line-icon"><LottieIcon src="/icons/new/key-lottie.json" size={22} /></span>
            <div><h3>Recent key sold</h3><p className="muted">Your latest key activity</p></div>
          </div>
        </div>
        <p className="muted empty-state">No recent keys yet</p>
      </div>
    </>
  );
}

/* ── LottieIcon — high=Lottie, low=static SVG ───────────────────── */
function DeviceIcon({ emoji, icon, size = 22, ...rest }) {
  if (window.__LOW_MODE__) {
    return <MatIcon name={icon} size={size} />;
  }
  return <LottieIcon src={emoji} size={size} />;
}

function LottieIcon({ src, size = 24, loop = true, className = '' }) {
  const perf = usePerf();
  const ref = useRef(null);
  const imgSrc = src ? src.replace('/icons/new/', '/icons/material/').replace(/\.json$/, '.svg') : '';

  useEffect(() => {
    if (perf !== 'high' || !ref.current) return;
    const anim = lottie.loadAnimation({
      container: ref.current, renderer: 'svg', loop, autoplay: true, path: src,
    });
    return () => anim.destroy();
  }, [src, loop, perf]);

  if (perf === 'low') {
    return (
      <span className={className} style={{ display: 'inline-block', width: size, height: size, verticalAlign: 'middle' }}>
        {imgSrc && <img src={imgSrc} alt="" style={{ width: size, height: size, display: 'block' }} />}
      </span>
    );
  }

  return (
    <span ref={ref} className={className} style={{ display: 'inline-block', width: size, height: size, verticalAlign: 'middle', overflow: 'hidden' }} />
  );
}

/* ── PerformanceDialog — first-visit device picker ─────────────── */
function PerformanceDialog({ onSelect }) {
  const pick = mode => {
    localStorage.setItem('perf_dont_ask', '1');
    localStorage.setItem('perf_mode', mode);
    if (window.__LOW_MODE__ && mode === 'high') {
      window.location.href = '/';
      return;
    }
    onSelect(mode);
  };
  return (
    <div className="perf-dialog-backdrop">
      <div className="perf-dialog liquid-dialog">
        <h2>Choose your experience</h2>
        <p className="perf-dialog-desc">Select your device performance level for the best experience.</p>
        <div className="perf-dialog-options">
          <button className="perf-option" onClick={() => pick('high')}>
            <span className="perf-option-icon"><img src="/icons/material/send-flash.svg" width="32" height="32" alt="" /></span>
            <div><strong>High Performance Device</strong><span className="perf-option-desc">Full animations &amp; effects</span></div>
          </button>
          <button className="perf-option" onClick={() => { localStorage.setItem('perf_dont_ask', '1'); window.location.href = '/low/'; }}>
            <span className="perf-option-icon"><img src="/icons/material/phone-spidey.svg" width="32" height="32" alt="" /></span>
            <div><strong>Low Performance Device</strong><span className="perf-option-desc">Static icons, smoother browsing</span></div>
          </button>
        </div>
        <div className="perf-dialog-footer">
          <span className="perf-dont-ask" onClick={() => pick('high')}>Don&apos;t ask again</span>
          <button className="perf-close-btn" onClick={() => pick('high')} aria-label="Close">✕</button>
        </div>
      </div>
    </div>
  );
}

/* ── WalletView — wallet home page ──────────────────────────────── */
function WalletView({ session, profile, refreshProfile }) {
  const [paySettings, setPaySettings] = useState({ upiId: '', minDeposit: 50, gatewayEnabled: false, upiEnabled: true, gatewayFee: 0 });
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  const loadData = useCallback(async () => {
    setTxLoading(true);
    try {
      const [settings, txs] = await Promise.all([
        getPaymentSettings(),
        getUserTransactions(session.uid),
      ]);
      setPaySettings(settings);
      setTransactions(txs);
    } catch (err) { toast.error(err.message); }
    finally { setTxLoading(false); }
  }, [session.uid]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => subscribeUserTransactions(session.uid, setTransactions), [session.uid]);

  const txIcon = type => {
    if (type === 'deposit_pending' || type === 'reseller_unlock_pending') return 'schedule';
    if (type === 'deposit_rejected') return 'cancel';
    if (type === 'deposit_approved') return 'add_circle';
    if (type === 'gateway_deposit') return 'payment';
    if (type === 'purchase') return 'shopping_cart';
    if (type === 'contact_refund') return 'add_circle';
    if (type?.includes('admin')) return 'admin_panel_settings';
    return 'receipt_long';
  };

  const txColor = (type, status) => {
    if (status === 'contact_pending') return '#fbbf24';
    if (type === 'contact_refund') return '#4ade80';
    if (type === 'deposit_pending' || type === 'reseller_unlock_pending') return '#fbbf24';
    if (type === 'deposit_rejected') return '#f87171';
    if (type === 'deposit_approved' || type === 'gateway_deposit' || type === 'admin_add') return '#4ade80';
    if (type === 'purchase' || type === 'admin_subtract') return '#f87171';
    return '#94a3b8';
  };

  return (
    <>
      <SectionTitle title={<><LottieIcon src="/icons/new/wallet-lottie.json" size={26} /> Wallet</>} subtitle="Manage your funds" />
      <div className="balance-card">
        <span>Available balance</span>
        <strong className="balance-amount"><LottieIcon src="/icons/new/balance-emoji.json" size={22} /><span>₹{money(profile.balance)}</span></strong>
        <button className="add-funds has-lottie" onClick={() => navigate('/add-fund')}>
          <DeviceIcon emoji="/icons/new/add-funds-plus.json" icon="add" size={20} /> Add funds
        </button>
      </div>

      {/* ── Transaction history ── */}
      <div className="glass-card">
        <div className="card-heading history-heading">
          <div className="heading-title-row">
            <DeviceIcon emoji="/icons/new/history-title-emoji.json" icon="history" size={24} />
            <div><h3>Transaction history</h3><p className="muted">All deposits and purchases</p></div>
          </div>
          <button className="icon-button" onClick={loadData} aria-label="Refresh">
            <DeviceIcon emoji="/icons/new/history-emoji.json" icon="history" size={24} />
          </button>
        </div>
        {txLoading
          ? <p className="muted empty-state">Loading…</p>
          : transactions.length === 0
            ? <p className="muted empty-state">No transactions yet</p>
            : (
              <div className="tx-list">
                {transactions.map(tx => (
                  <div className="tx-row" key={tx.id}>
                    <span className="tx-icon">
                      {tx.type === 'purchase'
                        ? <img src={productIconForWithFallback((tx.note || '').split('·')[0].trim())} style={{width:24,height:24,objectFit:'contain',borderRadius:7}} alt="" />
                         : tx.type === 'deposit_approved' || tx.type === 'gateway_deposit'
                          ? <DeviceIcon emoji="/icons/new/add-funds-plus.json" icon="add" size={20} />
                          : tx.type === 'deposit_pending' || tx.type === 'reseller_unlock_pending'
                            ? <MatIcon name="schedule" size={18} style={{ color: '#fbbf24' }} />
                          : tx.type === 'admin_add'
                            ? <DeviceIcon emoji="/icons/new/topup-emoji.json" icon="add_box" size={20} />
                            : <MatIcon name={txIcon(tx.type)} size={18} style={{ filter: 'invert(0.8)' }} />}
                    </span>
                    <div className="tx-main">
                      <strong>{tx.note || tx.type || 'Transaction'}</strong>
                     <span>
                       {fmtDate(tx.createdAt)}
                       {tx.status === 'contact_pending' && <em style={{ color: '#fbbf24', fontStyle: 'normal' }}> · Key pending</em>}
                        {tx.status === 'completed' && tx.note?.endsWith('· Contact') && <em style={{ color: '#74e0a5', fontStyle: 'normal' }}> · Approved</em>}
                        {tx.type === 'contact_refund' && <em style={{ color: '#74e0a5', fontStyle: 'normal' }}> · Refunded</em>}
                     </span>
                    </div>
                    <b className="tx-amount" style={{ color: txColor(tx.type, tx.status) }}>
                       {tx.type === 'deposit_pending' || tx.type === 'reseller_unlock_pending'
                         ? 'Pending'
                         : tx.type === 'deposit_rejected'
                           ? 'Rejected'
                        : <>{(tx.type === 'deposit_approved' || tx.type === 'gateway_deposit' || tx.type === 'admin_add' || tx.type === 'contact_refund') ? '+' : '-'}<MoneyDisplay value={tx.amount} /></>}
                    </b>
                  </div>
                ))}
              </div>
            )
        }
      </div>
    </>
  );
}

/* ── OrdersView ─────────────────────────────────────────────────── */
function OrdersView({ session, communityLinks }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [resetRequests, setResetRequests] = useState([]);
  const [resetOrder, setResetOrder] = useState(null);
  const [productChannels, setProductChannels] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, requests, channels, storefrontProducts] = await Promise.all([
        getUserLicenseKeys(session.uid),
        getUserKeyResetRequests(session.uid),
        getProductChannels().catch(() => []),
        fetchStorefrontProducts(session?.role).catch(() => []),
      ]);
      setKeys(data);
      setResetRequests(requests);
      setProductChannels(channels);
      setCatalogProducts(storefrontProducts);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [session.uid, session?.role]);

  useEffect(() => { load(); }, [load]);

  const filtered = keys.filter(k =>
    `${k.productName || k.product || ''} ${k.duration || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  if (selected) {
    const selectedProduct = catalogProducts.find(product =>
      (selected.pid && String(product.pid) === String(selected.pid))
      || (selected.productId && String(product.pid) === String(selected.productId))
      || String(product.name || '').trim().toLowerCase() === String(selected.productName || selected.product || '').trim().toLowerCase()
    ) || {
      name: selected.productName || selected.product || '',
      feedbackUrl: selected.feedbackUrl || '',
      fileUpdateUrl: selected.fileUpdateUrl || '',
    };
    const { feedbackUrl, fileUpdateUrl } = resolveProductSupportLinks(
      selectedProduct,
      productChannels,
      communityLinks.getFileUrl || communityLinks.resellerUpdatesUrl || '',
    );
    const getKeyUrl = selected.status === 'contact_pending'
      ? supportChatUrl(communityLinks.helpUrl, selected.productName || selected.product, selected.duration, selected.user || session.name)
      : '';

    return (
      <>
        <button className="back-link" onClick={() => setSelected(null)}><MatIcon name="arrow_back" size={16} /> Back to orders</button>
        <SectionTitle title={selected.productName || selected.product || 'Order'} subtitle="Complete order details" />
        <div className="glass-card detail-card">
          <Detail label="Product" icon={productIconForWithFallback(selected.productName || selected.product)} value={selected.productName || selected.product || '—'} />
          <Detail label="Duration" lottieIcon="/icons/new/timer.json" value={selected.duration || '—'} />
          <Detail label="Amount paid" lottieIcon="/icons/new/verified-badge.json" value={<MoneyDisplay value={selected.price} />} />
          <Detail label="Purchase date" lottieIcon="/icons/new/calendar.json" value={fmtDate(selected.purchasedAt || selected.createdAt)} />
          <Detail label="Status" lottieIcon="/icons/new/status-mail.json" value={selected.status || 'active'} />
          <Detail label="Source" lottieIcon="/icons/new/source-rocket.json" value={selected.source || 'api'} />
          <div className="key-reveal-box">
            <div className="key-reveal-header">
              <label><LottieIcon src="/icons/new/key-lottie.json" size={16} /> License key</label>
              {(selected.key || selected.keyCode) && (
                <button type="button" className="eye-toggle-btn" onClick={() => setKeyVisible(v => !v)} aria-label={keyVisible ? 'Hide key' : 'Show key'}>
                  <MatIcon name={keyVisible ? 'visibility_off' : 'visibility'} size={16} />
                </button>
              )}
            </div>
            <code className={keyVisible ? '' : 'key-blurred'}>{selected.key || selected.keyCode || '—'}</code>
            {(selected.key || selected.keyCode) && (
              <button type="button" className="copy-key-btn" onClick={() => { navigator.clipboard.writeText(selected.key || selected.keyCode); toast.success('Key copied!'); }}>
                <MatIcon name="content_copy" size={15} /> Copy
              </button>
            )}
          </div>
          {selected.key && (
            <button className="download-invoice-btn" type="button" onClick={() => downloadInvoice(selected)}>
              <MatIcon name="description" size={16} /> Download Invoice (PDF)
            </button>
          )}
          {selected.status === 'contact_rejected' && (
            <div className="reset-request-status rejected">
              <MatIcon name="add_circle" size={16} />
              Request rejected. <MoneyDisplay value={selected.refundAmount || selected.price || 0} /> has been refunded to your wallet.
            </div>
          )}
          <div className="order-action-row">
            {getKeyUrl && (
              <a className="community-action-btn" href={getKeyUrl} target="_blank" rel="noreferrer">
                <img src={telegramLogo} alt="" /> Get Key
              </a>
            )}
            {fileUpdateUrl && (
              <a className="community-action-btn" href={fileUpdateUrl} target="_blank" rel="noreferrer">
                <img src={telegramLogo} alt="" /> Get File
              </a>
            )}
            {feedbackUrl && (
              <a className="community-action-btn pdp-feedback-btn" href={feedbackUrl} target="_blank" rel="noreferrer">
                <img src={telegramLogo} alt="" /> Feedback
              </a>
            )}
            {selected.status !== 'contact_pending' && selected.status !== 'contact_rejected' && (
              <button className="reset-key-btn" type="button" onClick={() => setResetOrder(selected)}>
                <MatIcon name="restart_alt" size={16} /> Reset Key
              </button>
            )}
          </div>
          {resetRequests.filter(request => request.keyId === selected.id).map(request => (
            <div className={`reset-request-status ${request.status}`} key={request.id}>
              <MatIcon name={request.status === 'approved' ? 'check_circle' : request.status === 'rejected' ? 'cancel' : 'schedule'} size={16} />
              {request.status === 'pending' ? 'Your key reset request is pending.' :
                request.status === 'approved' ? 'Your key reset request is approved.' : 'Your key reset request was rejected.'}
            </div>
          ))}
        </div>
        {resetOrder && (
          <ResetKeyDialog
            license={resetOrder}
            onClose={() => setResetOrder(null)}
            onSubmitted={async () => { setResetOrder(null); setResetRequests(await getUserKeyResetRequests(session.uid)); }}
          />
        )}
      </>
    );
  }

  const downloadInvoice = (order) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentW = pageW - margin * 2;

    // Brand accent
    const accent = '#c795ff';
    const dark = '#1a1525';

    // Header bar
    doc.setFillColor(26, 21, 37);
    doc.rect(0, 0, pageW, 55, 'F');
    doc.setFillColor(199, 149, 255);
    doc.rect(0, 55, pageW, 3, 'F');

    // Logo / brand
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Reverse Bypass', margin, 28);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(199, 149, 255);
    doc.text('reversebypass.store', margin, 40);

    // Invoice meta
    const invoiceNo = `INV-${String(order.id || Date.now()).padStart(6, '0').slice(-6)}`;
    const dateStr = new Date(order.purchasedAt || order.createdAt || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(199, 149, 255);
    doc.text('INVOICE', pageW - margin, 28, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(`Invoice #${invoiceNo}`, pageW - margin, 38, { align: 'right' });
    doc.text(`Date: ${dateStr}`, pageW - margin, 45, { align: 'right' });

    // Billing info
    let y = 75;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('BILLED TO', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const name = order.user || order.uid || 'Customer';
    doc.text(String(name), margin, y + 4);
    doc.text(`Order ID: #${order.id || '—'}`, margin + 80, y + 4);

    y += 16;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageW - margin, y);

    // Table header
    y += 8;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentW, 10, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('PRODUCT', margin + 3, y + 7);
    doc.text('DURATION', margin + 90, y + 7);
    doc.text('AMOUNT', pageW - margin - 25, y + 7, { align: 'right' });

    // Table row
    y += 10;
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(String(order.productName || order.product || 'Product'), margin + 3, y + 4);
    doc.text(String(order.duration || '—'), margin + 90, y + 4);
    doc.text(`₹${Number(order.price || 0).toLocaleString('en-IN')}`, pageW - margin - 25, y + 4, { align: 'right' });

    // Total row
    y += 12;
    doc.setDrawColor(199, 149, 255);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 21, 37);
    doc.text('Total', margin + 3, y);
    doc.text(`₹${Number(order.price || 0).toLocaleString('en-IN')}`, pageW - margin - 25, y, { align: 'right' });

    // License key section
    y += 20;
    doc.setFillColor(245, 240, 255);
    doc.roundedRect(margin, y, contentW, 28, 3, 3, 'F');
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(157, 94, 255);
    doc.text('LICENSE KEY', margin + 6, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.text(String(order.key || order.keyCode || '—'), margin + 6, y + 5);

    // Footer
    y = 272;
    doc.setDrawColor(199, 149, 255);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Reverse Bypass — reversebypass.store', pageW / 2, y, { align: 'center' });
    doc.text('Thank you for your purchase!', pageW / 2, y + 4, { align: 'center' });

    doc.save(`invoice-${invoiceNo}.pdf`);
  };

  return (
    <>
      <SectionTitle title={<><LottieIcon src="/icons/new/my-orders.json" size={26} /> My Orders</>} subtitle={<><DeviceIcon emoji="/icons/new/track-emoji.json" icon="track_changes" size={16} /> Track your purchased license keys</>} />
      <div className="filter-row">
        <div className="search-box">
          <DeviceIcon emoji="/icons/new/search-emoji.json" icon="search" size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search orders" />
        </div>
        <button className="icon-button" onClick={load} aria-label="Refresh orders"><DeviceIcon emoji="/icons/new/refresh-emoji.json" icon="refresh" size={20} /></button>
      </div>
      <div className="glass-card">
        {loading
          ? <p className="muted empty-state">Loading…</p>
          : filtered.length === 0
            ? <p className="muted empty-state">No orders yet. Buy a product to get started.</p>
            : filtered.map(k => (
              <button className="order-button" key={k.id} onClick={() => setSelected(k)}>
                <div className="order-row">
                  <div className="order-icon has-brand-img"><img src={productIconForWithFallback(k.productName || k.product)} style={{width:30,height:30,objectFit:'contain',borderRadius:9}} alt="" /></div>
                  <div className="order-main">
                    <strong>{k.productName || k.product || 'License key'}</strong>
                    <span>{k.duration || '—'} · <MoneyDisplay value={k.price} /></span>
                    <small>{fmtDate(k.purchasedAt || k.createdAt)}</small>
                  </div>
                  <b className="active-status">{k.status || 'active'}</b>
                </div>
              </button>
            ))
        }
      </div>
    </>
  );
}

/* ── ProductsView ───────────────────────────────────────────────── */
/* ── Feature icons shared list ──────────────────────────────────── */
const FEAT_ICONS = [
  '/icons/new/feat-lightsaber.json',
  '/icons/new/feat-fire.json',
  '/icons/new/feat-lightning.json',
  '/icons/new/feat-crystal-skull.json',
  '/icons/new/feat-reaper.json',
  '/icons/new/feat-verified-badge.json',
  '/icons/new/feat-doge.json',
  '/icons/new/feat-rolex.json',
  '/icons/new/feat-rose-fist.json',
  '/icons/new/feat-gift-boxes.json',
];
function featIcon(pid, f) {
  const hash = (pid + f).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return FEAT_ICONS[hash % FEAT_ICONS.length];
}

/* ── ProductDetailPage — full-screen overlay (hides bottom-nav) ─── */
function ProductDetailPage({ product, channel, fallbackGetFileUrl = '', onBack, onBuy }) {
  const [playingVideo, setPlayingVideo] = useState(false);
  const available = product.pricing.length > 0;
  const { feedbackUrl, fileUpdateUrl } = resolveProductSupportLinks(product, channel ? [channel] : [], fallbackGetFileUrl);

  return (
    <div className="product-detail-page">
      <div className="pdp-topbar">
        <button className="pdp-back" onClick={onBack} aria-label="Back">
          <DeviceIcon emoji="/icons/new/back-arrow-emoji.json" icon="arrow_back" size={20} />
        </button>
        <span className="pdp-title">{product.name}</span>
      </div>
      <div className="pdp-scroll">
        {/* Media card */}
        <div className="pdp-media-card">
          {playingVideo && product.videos[0] ? (
            <video src={product.videos[0]} controls autoPlay playsInline poster={product.image || undefined} />
          ) : (
            <button className="video-thumb" type="button"
              onClick={() => product.videos[0] ? setPlayingVideo(true) : null}
              style={{ cursor: product.videos[0] ? 'pointer' : 'default' }}>
              {product.image
                ? <img src={product.image} alt={product.name} />
                : <div className="product-media-fallback">
                    <img src={productIconForWithFallback(product.name)} alt="" style={{ width: 64, height: 64, objectFit: 'contain' }} />
                  </div>
              }
              {product.videos[0] && (
                <span className="play-badge"><DeviceIcon emoji="/icons/new/play-emoji.json" icon="play_arrow" size={58} /></span>
              )}
            </button>
          )}
        </div>

        {/* Product info */}
        <div className="pdp-info">
          <div className="product-icon"><img src={productIconForWithFallback(product.name)} alt="" /></div>
          <div className="pdp-info-text">
            <h2 className="pdp-name">{product.name}</h2>
            <p className="pdp-meta muted">{product.game} · {product.platform || 'Platform'} · ID {product.pid}</p>
          </div>
        </div>

        {/* Duration grid — always visible */}
        <div className="pdp-section-label"><DeviceIcon emoji="/icons/new/timer.json" icon="timer" size={16} /> Select duration</div>
        {available ? (
          <div className="duration-grid">
            {product.pricing.slice(0, 8).map((item, index) => (
              <button key={`${product.pid}-${item.label}-${index}`}
                onClick={() => onBuy({ product, duration: item })}>
                <span className="duration-label-row">
                  <DeviceIcon emoji="/icons/new/timer.json" icon="timer" size={16} />{item.label}
                </span>
                <b><MoneyDisplay value={item.price} /></b>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted empty-state product-empty">Pricing unavailable</p>
        )}

        {/* Buy callout */}
        {available && (
          <p className="pdp-buy-hint"><DeviceIcon emoji="/icons/new/pig-emoji.json" icon="savings" size={16} /> Tap a duration above to buy</p>
        )}

        {(fileUpdateUrl || feedbackUrl) && (
          <div className="pdp-community-actions">
            {fileUpdateUrl && (
              <a className="community-action-btn" href={fileUpdateUrl} target="_blank" rel="noreferrer">
                <img src={telegramLogo} alt="" /> Get File
              </a>
            )}
            {feedbackUrl && (
              <a className="community-action-btn pdp-feedback-btn" href={feedbackUrl} target="_blank" rel="noreferrer">
                <img src={telegramLogo} alt="" /> Feedback
              </a>
            )}
          </div>
        )}

        {/* Features at bottom */}
        {product.features.length > 0 && (
          <div className="pdp-section-label" style={{ marginTop: 22 }}><DeviceIcon emoji="/icons/new/feat-gift-boxes.json" icon="card_giftcard" size={16} /> Features</div>
        )}
        {product.features.length > 0 && (
          <div className="feature-list pdp-features">
            {product.features.map((f, index) => (
              <div key={`${product.pid}-${f}-${index}`}>
                <span><LottieIcon src={featIcon(product.pid, f)} size={15} /></span>{f}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResetKeyDialog({ license, onClose, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await createKeyResetRequest(license.uid, license, reason);
      toast.success('Key reset request sent to admin.');
      await onSubmitted();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <section className="action-modal liquid-dialog reset-key-dialog">
        <div className="dialog-title-row">
          <MatIcon name="restart_alt" size={22} />
          <h2>Reset key</h2>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy}><MatIcon name="close" size={18} /></button>
        </div>
        <p className="muted dialog-sub">Tell admin why you need a reset for {license.productName || license.product}.</p>
        <form onSubmit={submit}>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain your situation..."
            rows={4}
            minLength={5}
            required
          />
          <div className="modal-btn-row">
            <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="modal-save" type="submit" disabled={busy}>
              <MatIcon name="send" size={16} /> {busy ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ── SearchResultsPage — full-screen search overlay ─────────────── */
function SearchResultsPage({ products, applyPricing, search, setSearch, onBack, onSelectProduct }) {
  const inputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 80); return () => clearTimeout(t); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      `${p.name} ${p.pid} ${p.game} ${p.platform} ${p.features.join(' ')}`.toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <div className="search-results-page">
      <div className="srp-topbar">
        <button className="srp-back" onClick={onBack} aria-label="Back">
          <DeviceIcon emoji="/icons/new/back-arrow-emoji.json" icon="arrow_back" size={20} />
        </button>
        <div className="srp-search-box">
          <DeviceIcon emoji="/icons/new/search-emoji.json" icon="search" size={16} />
          <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search product or PID" autoComplete="off" />
          {search && (
            <button className="srp-clear" onClick={() => setSearch('')} aria-label="Clear">
              <DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={16} />
            </button>
          )}
        </div>
      </div>
      {search.trim() && (
        <p className="srp-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</p>
      )}
      <div className="srp-list">
        {filtered.length === 0 && search.trim() && (
          <div className="srp-empty">
            <DeviceIcon emoji="/icons/new/search-emoji.json" icon="search" size={34} />
            <p className="muted">No products match "{search}"</p>
          </div>
        )}
        {filtered.length === 0 && !search.trim() && (
          <div className="srp-empty">
            <DeviceIcon emoji="/icons/new/search-emoji.json" icon="search" size={34} />
            <p className="muted">Type to search products…</p>
          </div>
        )}
        {filtered.map(p => {
          const pr = applyPricing(p);
          const minPrice = pr.pricing.length > 0
            ? Math.min(...pr.pricing.map(i => Number(i.price)))
            : null;
          return (
            <button className="srp-row" key={p.pid} type="button" onClick={() => onSelectProduct(p)}>
              <div className="srp-thumb">
                {p.image
                  ? <img src={p.image} alt={p.name} loading="lazy" />
                  : <img src={productIconForWithFallback(p.name)} alt="" className="srp-fallback-icon" />
                }
              </div>
              <div className="srp-meta">
                <span className="srp-name">{p.name}</span>
                <span className="srp-sub">{p.game} · {p.platform || 'Platform'}</span>
                {minPrice !== null && (
                  <span className="srp-price">from <b>₹{minPrice}</b></span>
                )}
              </div>
              <DeviceIcon emoji="/icons/new/proceed-emoji.json" icon="arrow_forward" size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── ProductsView — main buy tab ─────────────────────────────────── */
function ProductsView({ session, onBuy }) {
  const [filter, setFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [pricingRules, setPricingRules] = useState({});
  const [pricingSettings, setPricingSettings] = useState({ userAdjustment: -20, resellerAdjustment: 10, userIncreasePercent: 0, resellerIncreasePercent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);
  const [searchActive, setSearchActive] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productChannels, setProductChannels] = useState([]);
  const [communityLinks, setCommunityLinks] = useState({ getFileUrl: '' });

  const applyPricing = useCallback((product) => {
    const isReseller = session?.role === 'reseller';
    const onlyContact = isOnlyContactProduct(product, pricingRules);
    return {
      ...product,
      onlyContact,
      pricing: product.pricing.map(item => {
        const key = `${product.pid}_${(item.duration || item.label || '').trim().replace(/[^a-z0-9]+/gi, '_')}`;
        const rule = pricingRules[key] || {};
        const apiPrice = Number(item.price || 0);
        const fixedUserPrice = Number(rule.price);
        const fixedResellerPrice = Number(rule.resellerPrice);
        const baseUserPrice = Number.isFinite(fixedUserPrice) && rule.price !== ''
          ? fixedUserPrice
          : product.pricingSource === 'imported'
            ? apiPrice
            : Math.max(0, apiPrice + pricingSettings.userAdjustment);
        const userPrice = pricingSettings.userIncreasePercent > 0
          ? Math.round(baseUserPrice * (1 + pricingSettings.userIncreasePercent / 100) * 100) / 100
          : baseUserPrice;
        const baseResellerPrice = Number.isFinite(fixedResellerPrice) && rule.resellerPrice !== ''
          ? fixedResellerPrice
          : product.pricingSource === 'imported'
            ? apiPrice
            : Math.max(0, apiPrice + pricingSettings.resellerAdjustment);
        const resellerPrice = pricingSettings.resellerIncreasePercent > 0
          ? Math.round(baseResellerPrice * (1 + pricingSettings.resellerIncreasePercent / 100) * 100) / 100
          : baseResellerPrice;
        return {
          ...item,
          price: isReseller ? resellerPrice : userPrice,
          isResellerPrice: isReseller,
        };
      }),
    };
  }, [pricingRules, pricingSettings, session?.role]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [prods, rules, pricing] = await Promise.all([
        fetchStorefrontProducts(session?.role),
        getAdminPricingRules().catch(() => ({})),
         getProductPricingSettings().catch(() => ({ userAdjustment: -20, resellerAdjustment: 10, userIncreasePercent: 0, resellerIncreasePercent: 0 })),
      ]);
      setPricingRules(rules);
      setPricingSettings(pricing);
      setProducts(prods);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    getProductChannels().then(setProductChannels).catch(() => {});
    getCommunityLinks().then(links => setCommunityLinks({ getFileUrl: links.getFileUrl || '' })).catch(() => {});
  }, []);

  const games = useMemo(() => ['all', ...new Set(products.map(p => p.game).filter(Boolean))], [products]);

  const filtered = useMemo(() => products.filter(p => {
    const matchFilter = filter === 'all' || p.game === filter;
    const typeText = `${p.name} ${p.game} ${p.platform} ${p.features.join(' ')}`.toLowerCase();
    const matchPlatform = platformFilter === 'all'
      || (platformFilter === 'nonroot' && (typeText.includes('nonroot') || typeText.includes('non root') || typeText.includes('non-root')))
      || (platformFilter === 'root' && typeText.includes('root') && !(typeText.includes('nonroot') || typeText.includes('non root')))
      || (platformFilter === 'pc' && typeText.includes('pc'))
      || (platformFilter === 'ios' && (typeText.includes('ios') || typeText.includes('iphone')));
    return matchFilter && matchPlatform;
  }), [products, filter, platformFilter]);

  useEffect(() => { setVisibleCount(8); }, [filter, platformFilter]);

  /* ── Detail page ── */
  if (selectedProduct) {
    const channel = findProductChannel(selectedProduct.name, productChannels);
    return (
      <ProductDetailPage
        product={applyPricing(selectedProduct)}
        channel={channel}
        fallbackGetFileUrl={communityLinks.getFileUrl}
        onBack={() => setSelectedProduct(null)}
        onBuy={onBuy}
      />
    );
  }

  /* ── Search page ── */
  if (searchActive) {
    return (
      <SearchResultsPage
        products={products}
        applyPricing={applyPricing}
        search={search}
        setSearch={setSearch}
        onBack={() => { setSearchActive(false); setSearch(''); }}
        onSelectProduct={p => { setSearchActive(false); setSelectedProduct(p); }}
      />
    );
  }

  /* ── Normal buy view ── */
  const visibleProducts = filtered.slice(0, visibleCount);

  return (
    <div className="buy-view">
      <SectionTitle
        title={<><DeviceIcon emoji="/icons/new/shopping-cart.json" icon="shopping_cart" size={24} /> Buy Products</>}
        subtitle="Live products with pricing" />
      <div className="filter-row product-filter">
        {/* Search — opens full search page on click */}
        <button className="search-box search-box-tap" type="button" onClick={() => setSearchActive(true)}>
          <DeviceIcon emoji="/icons/new/search-emoji.json" icon="search" size={16} />
          <span className="search-placeholder">Search product</span>
        </button>
        <select className="product-select" value={filter} onChange={e => setFilter(e.target.value)}>
          {games.map(g => <option value={g} key={g}>{g === 'all' ? 'All' : g}</option>)}
        </select>
        <select className="product-select type-select" value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}>
          <option value="all">All type</option>
          <option value="nonroot">Non-root</option>
          <option value="root">Root</option>
          <option value="pc">PC</option>
          <option value="ios">iOS</option>
        </select>
      </div>

      <div className="products-scroll-inner">
        <div className="product-list compact-list">
          {loading && <ProductSkeletonList />}
          {!loading && error && (
            <div className="glass-card"><p className="muted empty-state">{error}</p></div>
          )}
          {!loading && !error && !filtered.length && (
            <div className="glass-card"><p className="muted empty-state">No products found</p></div>
          )}

          {/* Compact product rows — tap to open detail */}
          {visibleProducts.map(p => {
            const pr = applyPricing(p);
            const minPrice = pr.pricing.length > 0
              ? Math.min(...pr.pricing.map(i => Number(i.price)))
              : null;
            const previewFeats = p.features.slice(0, 2);
            return (
              <button className="compact-product-row" key={p.pid} type="button"
                onClick={() => setSelectedProduct(p)}>
                <div className="cpr-thumb">
                  {p.image
                    ? <img src={p.image} alt={p.name} loading="lazy" />
                    : <img src={productIconForWithFallback(p.name)} alt="" className="cpr-fallback-icon" />
                  }
                </div>
                <div className="cpr-meta">
                  <span className="cpr-name">{p.name}</span>
                  <span className="cpr-sub">{p.game} · {p.platform || 'Platform'} · ID {p.pid}</span>
                  {previewFeats.length > 0 && (
                    <span className="cpr-feats">{previewFeats.join(' · ')}</span>
                  )}
                  {minPrice !== null && (
                    <span className="cpr-price text-[15px]">from <b>₹{minPrice}</b></span>
                  )}
                </div>
                <span className="cpr-arrow"><DeviceIcon emoji="/icons/new/proceed-emoji.json" icon="arrow_forward" size={18} /></span>
              </button>
            );
          })}

          {!loading && !error && visibleCount < filtered.length && (
            <button className="load-more glass-card" type="button"
              onClick={() => setVisibleCount(c => c + 5)}>
              Load more products ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── PurchaseDialog — real purchaseProduct() ────────────────────── */
function PurchaseDialog({ purchase, session, communityLinks, close, onPurchased }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { key, source }
  const [androidId, setAndroidId] = useState('');

  if (!purchase) return null;
  const { product, duration } = purchase;
  const needsAndroidId = isDeviceBoundProduct(product) && product?.onlyContact !== true;

  const confirm = async () => {
    const deviceId = androidId.trim();
    if (needsAndroidId && !deviceId) {
      toast.error('Enter the Android device ID for this Bala product.');
      return;
    }
    setBusy(true);
    try {
      const purchaseProductData = needsAndroidId ? { ...product, androidId: deviceId } : product;
      const res = await purchaseProduct(
        session.uid,
        purchaseProductData,
        duration,
        duration.price,
        session.name || session.phone || session.uid,
      );
      setResult(res);
      toast.success(res.contact ? 'Payment successful — contact support for your key.' : 'Purchase successful!', { description: `${product.name} · ${duration.duration || duration.label}` });
      if (onPurchased) onPurchased();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  const handleClose = () => { setResult(null); setBusy(false); close(); };

  return (
    <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy && !result) close(); }}>
      <section className="action-modal liquid-dialog">
        {result ? (
          <>
            <div className="dialog-title-row">
              <DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={24} />
              <h2>Order placed!</h2>
            </div>
            <p className="muted dialog-sub">{product.name} · {duration.duration || duration.label}</p>
            {result.contact ? (
              <div className="key-reveal-box contact-pending-box">
                <label>Key pending</label>
                <p className="muted">Payment received. Contact support and your key will be added to My Orders after admin approval.</p>
              </div>
            ) : (
              <div className="key-reveal-box">
                <label>Your license key</label>
                <code>{result.key}</code>
                <button type="button" className="copy-key-btn" onClick={() => { navigator.clipboard.writeText(result.key); toast.success('Key copied!'); }}>
                  <DeviceIcon emoji="/icons/new/download-emoji.json" icon="download" size={16} /> Copy key
                </button>
              </div>
            )}
            <p className="muted" style={{ fontSize: '0.75rem' }}>
              Source: {result.contact ? 'Contact delivery' : result.source === 'manual' ? 'Manual key (admin-provided)' : 'Reseller API'}
            </p>
            {result.contact ? (
              <a className="community-action-btn" href={supportChatUrl(communityLinks.helpUrl, product.name, duration.duration || duration.label, session.name || session.phone)} target="_blank" rel="noreferrer" style={{ width: '100%', marginTop: 12 }}>
                <img src={telegramLogo} alt="" /> Get Key from Support
              </a>
            ) : (communityLinks.getFileUrl || communityLinks.resellerUpdatesUrl) && (
              <a className="community-action-btn" href={communityLinks.getFileUrl || communityLinks.resellerUpdatesUrl} target="_blank" rel="noreferrer" style={{ width: '100%', marginTop: 12 }}>
                <img src={telegramLogo} alt="" /> Get File
              </a>
            )}
            <div className="modal-btn-row" style={{ justifyContent: 'center' }}>
              <button className="modal-save" type="button" onClick={handleClose}><DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={16} /> Done</button>
            </div>
          </>
        ) : (
          <>
            <h2><DeviceIcon emoji="/icons/new/confirm-buy-emoji.json" icon="check_circle" size={22} /> Confirm purchase</h2>
            <div className="purchase-summary">
              <div className="purchase-title">
                <span>Selected product</span>
                <strong>{product.name}</strong>
                <small>PID {product.pid}</small>
              </div>
              <img src={productIconForWithFallback(product.name)} alt="" />
            </div>
            <div className="purchase-meta-grid">
              <div><span><img src="/icons/new/game-logo.webp" style={{width:18,height:18,objectFit:'contain',verticalAlign:'middle',marginRight:3}} alt="" /> Game</span><strong>{product.game || 'Product'}</strong></div>
              <div><span><DeviceIcon emoji="/icons/new/timer.json" icon="timer" size={16} /> Duration</span><strong>{duration.duration || duration.label}</strong></div>
              <div><span><DeviceIcon emoji="/icons/new/money-bag.json" icon="account_balance_wallet" size={16} /> Price</span><strong><MoneyDisplay value={duration.price} /></strong></div>
              <div><span><DeviceIcon emoji="/icons/new/platform-emoji.json" icon="devices" size={16} /> Platform</span><strong>{product.platform || 'Access key'}</strong></div>
            </div>
            {needsAndroidId && (
              <label className="purchase-device-id-field">
                <span><DeviceIcon emoji="/icons/new/phone-emoji.json" icon="phone_android" size={16} /> Android device ID <b>*</b></span>
                <input
                  value={androidId}
                  onChange={e => setAndroidId(e.target.value.replace(/\s/g, ''))}
                  placeholder="Example: 0b9b969bc2e7997b"
                  autoComplete="off"
                  spellCheck="false"
                  inputMode="text"
                  disabled={busy}
                />
                <small className="muted">Required only for Bala Mod / device-bound products. It will be sent as <code>android_id</code>.</small>
              </label>
            )}
            <p className="purchase-note"><DeviceIcon emoji="/icons/new/pig-emoji.json" icon="savings" size={16} /> Balance will be deducted. A key will be delivered instantly.</p>
            <div className="modal-btn-row">
              <button type="button" onClick={close} disabled={busy}><DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={16} /> Cancel</button>
              <button className="modal-save" type="button" onClick={confirm} disabled={busy}>
                {busy ? 'Buying…' : <><video src="/icons/new/buy.webm" autoPlay loop muted playsInline style={{width:18,height:18,display:'inline-block',verticalAlign:'middle'}} /> Confirm buy</>}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ── ProfileView ────────────────────────────────────────────────── */
function ProfileView({ profile, communityLinks, openDialog, openApi, onShowPerf, onResellerBenefits }) {
  const [giftOpen, setGiftOpen] = useState(false);
  return (
    <>
      <SectionTitle title={<><LottieIcon src="/icons/new/profile-lottie.json" size={26} /> Profile</>} subtitle="Manage your account" />
      <div className="glass-card profile-card">
        <img src={profile.photoData || logo} alt="Profile" />
        <div>
          <h3 style={{display:'flex',alignItems:'center',gap:'6px'}}>{profile.name || 'Account holder'}<DeviceIcon emoji="/icons/new/verified-badge.json" icon="verified_user" size={20} /></h3>
          <p className="muted">{profile.email || profile.phone || 'Verified account'}</p>
          <p className="muted">Balance <MoneyDisplay value={profile.balance} /> · {profile.status || 'active'}</p>
          {profile.role === 'reseller' && <p className="muted" style={{color:'#c795ff',fontWeight:600,marginTop:4}}><DeviceIcon emoji="/icons/new/verified-badge.json" icon="verified_user" size={16} /> Reseller account</p>}
        </div>
      </div>
      <div className="glass-card profile-actions">
        <button className="has-lottie" onClick={() => openDialog('edit')}><LottieIcon src="/icons/new/edit-profile.json" size={24} />Edit profile</button>
        <button className="has-lottie" onClick={() => openDialog('password')}><DeviceIcon emoji="/icons/new/lock-emoji.json" icon="lock-emoji" size={22} />Change password</button>
        <button className="has-lottie" onClick={openApi}><LottieIcon src="/icons/new/api-settings.json" size={24} />API settings</button>
        <button className="has-lottie" onClick={() => setGiftOpen(true)}><DeviceIcon emoji="/icons/new/gift-code.json" icon="gift-code" size={22} />Gift code</button>
        {profile.role !== 'reseller' && (
          <button className="has-lottie reseller-profile-btn" onClick={onResellerBenefits}>
            <DeviceIcon emoji="/icons/new/verified-badge.json" icon="verified_user" size={20} /> Unlock Reseller
          </button>
        )}
        {profile.role === 'reseller' && communityLinks.resellerUpdatesUrl && (
          <a className="has-lottie profile-community-btn" href={communityLinks.resellerUpdatesUrl} target="_blank" rel="noreferrer">
            <img src={telegramLogo} alt="" /> Reseller All Update · Join
          </a>
        )}
        {communityLinks.helpUrl && (
          <a className="has-lottie profile-community-btn" href={communityLinks.helpUrl} target="_blank" rel="noreferrer">
            <img src={telegramLogo} alt="" /> Get Help on Telegram
          </a>
        )}
        <button className="has-lottie" onClick={onShowPerf}><DeviceIcon emoji="/icons/new/crown.json" icon="crown" size={22} />Device Performance</button>
        <button className="danger has-lottie logout-btn" onClick={() => openDialog('logout')}><DeviceIcon emoji="/icons/new/logout-flash.json" icon="logout-flash" size={24} />Logout</button>
        <p className="version-tag">V1.1</p>
      </div>
      {giftOpen && <GiftCodeDialog uid={profile.uid} name={profile.name} phone={profile.phone} onClose={() => setGiftOpen(false)} />}
    </>
  );
}

/* ── GiftCodeDialog ──────────────────────────────────────────────── */
function GiftCodeDialog({ uid, name, phone, onClose }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!uid) return;
    getUserGiftRedemptions(uid).then(setHistory).catch(() => {});
  }, [uid]);

  const redeem = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await redeemGiftCode(uid, name, phone, code);
      setResult(res);
      toast.success(`Gift code redeemed! ₹${res.amount} added to wallet.`, { icon: <DeviceIcon emoji="/icons/new/gift-code.json" icon="card_giftcard" size={20} /> });
      setCode('');
      getUserGiftRedemptions(uid).then(setHistory).catch(() => {});
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="action-modal liquid-dialog" style={{ maxWidth: 420 }}>
        <div className="dialog-title-row">
          <DeviceIcon emoji="/icons/new/gift-code.json" icon="card_giftcard" size={22} />
          <h2>Gift code</h2>
          <button className="icon-button" type="button" onClick={onClose} style={{marginLeft:'auto',display:'flex',alignItems:'center',justifyContent:'center'}}><DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={20} /></button>
        </div>
        <form onSubmit={redeem} style={{ margin: '8px 0 14px' }}>
           <div className="gift-input-row">
             <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter code" maxLength={10} required className="gift-input-wide" />
            <button className="modal-save gift-redeem-btn" type="submit" disabled={busy || !code.trim()}>
              {busy ? '…' : <><DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={16} /> Redeem</>}
            </button>
          </div>
        </form>

        {result && (
          <div className="gift-result-card">
            <DeviceIcon emoji="/icons/new/verified-badge.json" icon="verified_user" size={22} />
            <div>
              <strong>₹{result.amount} credited!</strong>
              <p className="muted">Code: {result.code}</p>
            </div>
          </div>
        )}

        <h4 style={{ display:'flex', alignItems:'center', gap: 6, margin:'14px 0 6px' }}>
          <DeviceIcon emoji="/icons/new/history-emoji.json" icon="history" size={16} /> Redemption history
        </h4>
        {history.length === 0
          ? <p className="muted empty-state">No redemptions yet</p>
          : <div className="gift-history-list">{
            history.map((h, i) => (
              <div key={i} className="gift-history-row">
                <DeviceIcon emoji="/icons/new/gift-code.json" icon="card_giftcard" size={16} />
                <div className="tx-main">
                  <strong>{h.code}</strong>
                  <span>{fmtDate(h.redeemedAt)}</span>
                </div>
                <b className="tx-amount" style={{color:'#74e0a5'}}>+<MoneyDisplay value={h.amount} /></b>
              </div>
            ))
          }</div>
        }
      </section>
    </div>
  );
}

/* ── GiftCodeUsersDialog ──────────────────────────────────────────── */
function GiftCodeUsersDialog({ gc, onClose }) {
  if (!gc) return null;
  const users = Object.entries(gc.redeemedBy || {});
  return (
    <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="action-modal liquid-dialog" style={{ maxWidth: 400 }}>
        <div className="dialog-title-row">
          <DeviceIcon emoji="/icons/new/gift-code.json" icon="card_giftcard" size={20} />
          <h2>Code: {gc.code}</h2>
          <button className="icon-button" type="button" onClick={onClose}><MatIcon name="close" size={18} /></button>
        </div>
        <p className="muted" style={{ margin: '4px 0 10px' }}>₹{gc.amount} · Used {gc.totalRedeemed || 0}/{gc.maxRedeems}</p>
        {users.length === 0
          ? <p className="muted empty-state">No one has redeemed this code yet</p>
          : <div className="gift-users-list">{
            users.map(([uid, data]) => (
              <div key={uid} className="gift-history-row">
                <LottieIcon src="/icons/new/profile-lottie.json" size={18} />
                <div className="tx-main">
                  <strong>{data.name || uid}</strong>
                  <span>{data.phone ? `${data.phone} · ` : ''}{fmtDate(data.redeemedAt)}</span>
                </div>
              </div>
            ))
          }</div>
        }
        <div className="modal-btn-row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <button type="button" onClick={onClose}><MatIcon name="close" size={16} /> Close</button>
        </div>
      </section>
    </div>
  );
}

/* ── ProfileDialog ──────────────────────────────────────────────── */
function ProfileDialog({ type, profile, apiState, close, onLogout, onProfile, onApiState }) {
  const [name, setName] = useState(profile.name || '');
  const [photoData, setPhotoData] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { setName(profile.name || ''); setPhotoData(''); setOldPassword(''); setNewPassword(''); }, [type, profile.name]);

  if (!type) return null;

  const saveProfile = async e => {
    e.preventDefault();
    try { const next = await updateUserProfile(profile.uid, { name, photoData }); onProfile(next); toast.success('Profile updated'); close(); }
    catch (err) { toast.error(err.message); }
  };

  const savePassword = async e => {
    e.preventDefault();
    try { await changeUserPassword(profile.uid, oldPassword, newPassword); toast.success('Password changed'); close(); }
    catch (err) { toast.error(err.message); }
  };

  const pickPhoto = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 250000) { toast.error('Use an image below 250 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPhotoData(reader.result);
    reader.readAsDataURL(file);
  };

  const resetApi = async () => {
    try { const result = await resetUserApiKey(profile.uid); onApiState(result); toast.success('New API key generated'); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      {type === 'edit' && (
        <form className="action-modal liquid-dialog" onSubmit={saveProfile}>
          <div className="dialog-title-row"><DeviceIcon emoji="/icons/new/edit-title-emoji.json" icon="edit" size={22} /><h2>Edit profile</h2></div>
          <label>Display name<input value={name} onChange={e => setName(e.target.value)} placeholder="Account holder" /></label>
          <label className="file-upload-label">
            <LottieIcon src="/icons/new/edit-profile.json" size={22} /> Profile image
            <input type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
          </label>
          {photoData && <img src={photoData} alt="Preview" className="photo-preview" />}
          <div className="modal-btn-row">
            <button type="button" onClick={close}><DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={16} /> Cancel</button>
            <button className="modal-save has-lottie" type="submit"><DeviceIcon emoji="/icons/new/save-emoji.json" icon="save" size={16} /> Save changes</button>
          </div>
        </form>
      )}
      {type === 'password' && (
        <form className="action-modal liquid-dialog" onSubmit={savePassword}>
          <div className="dialog-title-row"><DeviceIcon emoji="/icons/new/lock-emoji.json" icon="lock" size={22} /><h2>Change password</h2></div>
          <label><DeviceIcon emoji="/icons/new/key-emoji.json" icon="key" size={16} /> Old password<input value={oldPassword} onChange={e => setOldPassword(e.target.value)} type="password" placeholder="Old password" /></label>
          <label><DeviceIcon emoji="/icons/new/new-password-emoji.json" icon="lock" size={16} /> New password<input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" minLength={6} placeholder="New password (min 6)" required /></label>
          <div className="modal-btn-row">
            <button type="button" onClick={close}><DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={16} /> Cancel</button>
            <button className="modal-save has-lottie" type="submit"><DeviceIcon emoji="/icons/new/save-emoji.json" icon="save" size={16} /> Change</button>
          </div>
        </form>
      )}
      {type === 'api' && (
        <section className="action-modal liquid-dialog">
          <div className="dialog-title-row"><LottieIcon src="/icons/new/key-lottie.json" size={24} /><h2>Private API</h2></div>
          {apiState.apiKey ? <p className="api-key-box">{apiState.apiKey}</p> : <p>Key active. Last 4: <strong>{apiState.last4}</strong></p>}
          <p>This key enables Bot login. Keep it private.</p>
          <div className="modal-btn-row">
            <button type="button" onClick={close}><DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={16} /> Close</button>
            <button className="modal-save has-lottie" type="button" onClick={resetApi}><DeviceIcon emoji="/icons/new/refresh-emoji.json" icon="refresh" size={16} /> Reset key</button>
          </div>
        </section>
      )}
      {type === 'logout' && (
        <section className="action-modal liquid-dialog">
          <div className="dialog-title-row"><LottieIcon src="/icons/new/logout-flash.json" size={24} /><h2>Logout?</h2></div>
          <p>Your local session will be removed from this browser.</p>
          <div className="modal-btn-row">
            <button type="button" onClick={close}><DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={16} /> Cancel</button>
            <button className="modal-danger" type="button" onClick={onLogout}>Logout</button>
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Admin shared micro-components ──────────────────────────────── */
const AdminList = ({ items, empty, render }) => (
  <div className="admin-list">
    {items?.length
      ? items.map(item => <React.Fragment key={item.id || item.uid || item.name || Math.random()}>{render(item)}</React.Fragment>)
      : <p className="muted empty-state">{empty}</p>}
  </div>
);
const AdminRow = ({ title, meta, status, children }) => (
  <div className="admin-row">
    <div><strong>{title}</strong><span>{meta}</span></div>
    <b>{status}</b>
    {children && <div className="admin-row-actions">{children}</div>}
  </div>
);
const AdminStat = ({ iconName, label, value, accent }) => (
  <div className={`admin-stat glass-card${accent ? ` accent-${accent}` : ''}`}>
    <MatIcon name={iconName} size={20} />
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

/* ── UserHistoryDialog ──────────────────────────────────────────── */
function UserHistoryDialog({ user, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [userKeys, setUserKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getUserTransactions(user.uid),
      getUserLicenseKeys(user.uid),
    ]).then(([txs, keys]) => {
      setTransactions(txs);
      setUserKeys(keys);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user?.uid]);

  if (!user) return null;

  return (
    <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="action-modal liquid-dialog history-dialog">
        <div className="dialog-title-row">
          <MatIcon name="history" size={20} />
          <h2>{user.name || user.uid} — History</h2>
          <button className="icon-button" type="button" onClick={onClose}><MatIcon name="close" size={18} /></button>
        </div>
        {loading ? <p className="muted empty-state">Loading…</p> : (
          <>
            <h4 style={{ margin: '12px 0 6px' }}>Transactions ({transactions.length})</h4>
            <div className="history-scroll">
              {transactions.length === 0 ? <p className="muted empty-state">No transactions</p> : transactions.slice(0, 30).map(tx => (
                <div className="tx-row compact" key={tx.id}>
                  <MatIcon name={tx.type === 'deposit_pending' || tx.type === 'reseller_unlock_pending' ? 'schedule' : tx.type === 'deposit_approved' ? 'add_circle' : tx.type === 'deposit_rejected' ? 'cancel' : 'shopping_cart'} size={15} style={{ filter: 'invert(0.6)' }} />
                  <div className="tx-main">
                    <strong>{tx.note || tx.type}</strong>
                    <span>{fmtDate(tx.createdAt)}</span>
                  </div>
                  <b style={{ color: tx.type === 'deposit_pending' || tx.type === 'reseller_unlock_pending' ? '#fbbf24' : tx.type === 'deposit_rejected' || tx.type === 'purchase' ? '#f87171' : '#4ade80', fontSize: '0.85rem' }}>
                    {tx.type === 'deposit_pending' || tx.type === 'reseller_unlock_pending' ? 'Pending' : tx.type === 'deposit_rejected' ? 'Rejected' : <>{tx.type === 'purchase' ? '-' : '+'}<MoneyDisplay value={tx.amount} /></>}
                  </b>
                </div>
              ))}
            </div>
            <h4 style={{ margin: '12px 0 6px' }}>License Keys ({userKeys.length})</h4>
            <div className="history-scroll">
              {userKeys.length === 0 ? <p className="muted empty-state">No keys</p> : userKeys.slice(0, 20).map(k => (
                <div className="tx-row compact" key={k.id}>
                  <LottieIcon src="/icons/new/key-lottie.json" size={16} />
                  <div className="tx-main">
                    <strong>{k.productName || k.product}</strong>
                    <span>{k.duration} · {fmtDate(k.purchasedAt)}</span>
                  </div>
                  <b style={{ color: '#94a3b8', fontSize: '0.8rem' }}><MoneyDisplay value={k.price} /></b>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ── UserViewDialog — view user details from issues ───────────── */
function UserViewDialog({ user, onClose }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid).then(setProfile).catch(() => setProfile({ ...user, balance: 0, status: 'unknown' }));
  }, [user?.uid]);

  if (!user) return null;
  const p = profile || user;

  return (
    <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="action-modal liquid-dialog" style={{ maxWidth: 420 }}>
        <div className="dialog-title-row">
          <MatIcon name="person" size={20} />
          <h2>User details</h2>
          <button className="icon-button" type="button" onClick={onClose}><MatIcon name="close" size={18} /></button>
        </div>
        <div className="profile-detail-grid">
          <div className="profile-detail-row">
            <span><MatIcon name="badge" size={16} /> Name</span>
            <strong>{p.name || '—'}</strong>
          </div>
          <div className="profile-detail-row">
            <span><MatIcon name="phone" size={16} /> Phone</span>
            <strong>{p.phone || '—'}</strong>
          </div>
          <div className="profile-detail-row">
            <span><MatIcon name="email" size={16} /> Email</span>
            <strong>{p.email || '—'}</strong>
          </div>
          <div className="profile-detail-row">
            <span><MatIcon name="account_balance_wallet" size={16} /> Balance</span>
            <strong><MoneyDisplay value={p.balance} /></strong>
          </div>
          <div className="profile-detail-row">
            <span><MatIcon name="vpn_key" size={16} /> UID</span>
            <strong style={{ fontSize: '11px', wordBreak: 'break-all' }}>{user.uid}</strong>
          </div>
          <div className="profile-detail-row">
            <span><MatIcon name="badge" size={16} /> Role</span>
            <strong>{p.role || 'user'}</strong>
          </div>
          <div className="profile-detail-row">
            <span><MatIcon name="check_circle" size={16} /> Status</span>
            <strong style={{ color: p.status === 'banned' ? '#f87171' : '#74e0a5' }}>{p.status || 'active'}</strong>
          </div>
        </div>
        {p.phone && (
          <a href={`tel:${p.phone}`} className="modal-save" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, textDecoration: 'none' }}>
            <MatIcon name="call" size={16} /> Call {p.phone}
          </a>
        )}
        <div className="modal-btn-row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <button type="button" onClick={onClose}><MatIcon name="close" size={16} /> Close</button>
        </div>
      </section>
    </div>
  );
}

/* ── PricingEditDialog ──────────────────────────────────────────── */
function PricingEditDialog({ product, onClose, onSave }) {
  const [rules, setRules] = useState({});
  const [onlyContact, setOnlyContact] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    getAdminPricingRules().then(r => {
      setRules(r);
      setOnlyContact(isOnlyContactProduct(product, r));
    }).catch(() => {});
  }, [product?.pid]);

  if (!product) return null;

  const ruleKey = (pid, duration) => `${pid}_${(duration || 'default').trim().replace(/[^a-z0-9]+/gi, '_')}`;

  const getRule = dur => {
    const k = ruleKey(product.pid, dur);
    const existing = rules[k];
    return existing || { price: '', resellerPrice: '' };
  };

  const setRule = (dur, field, val) => {
    const k = ruleKey(product.pid, dur);
    setRules(r => ({ ...r, [k]: { ...r[k], [field]: val } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const item of product.pricing) {
        const dur = item.duration || item.label;
        const r = getRule(dur);
        if (r.price !== '' || r.resellerPrice !== '' || onlyContact || isOnlyContactProduct(product, rules)) {
          await adminSaveProductRule({
            pid: String(product.pid),
            duration: dur,
            price: r.price,
            resellerPrice: r.resellerPrice,
            onlyContact,
          });
        }
      }
      toast.success('Pricing rules saved');
      onSave();
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <section className="action-modal liquid-dialog pricing-dialog">
        <div className="dialog-title-row">
          <MatIcon name="edit" size={20} />
          <h2>Edit pricing — {product.name}</h2>
          <button className="icon-button" type="button" onClick={onClose}><MatIcon name="close" size={18} /></button>
        </div>
         <p className="muted dialog-sub">PID {product.pid} · Set fixed User and Reseller prices for each duration.</p>
        <label className="only-contact-toggle">
          <input type="checkbox" checked={onlyContact} onChange={e => setOnlyContact(e.target.checked)} />
          <span>
            <strong>Only Contact</strong>
            <small>Deduct balance, create the order, and ask the buyer to contact support for the key instead of using the API.</small>
          </span>
        </label>
        <div className="pricing-edit-list">
          {product.pricing.map((item, index) => {
            const dur = item.duration || item.label;
            const rule = getRule(dur);
            return (
              <div className="pricing-edit-row" key={`${dur}-${index}`}>
                <div className="pricing-edit-label">
                  <strong>{dur}</strong>
                  <span className="muted">API: <MoneyDisplay value={item.price} /></span>
                </div>
                <div className="pricing-edit-fields">
                  <label className="pricing-field-label">
                    <span className="pricing-field-caption"><MatIcon name="person" size={13} /> User price (₹)</span>
                    <input
                      className="pricing-edit-input"
                      type="number"
                      placeholder="Amount"
                      value={rule.price}
                      onChange={e => setRule(dur, 'price', e.target.value)}
                      min={0}
                    />
                  </label>
                  <label className="pricing-field-label">
                    <span className="pricing-field-caption"><MatIcon name="verified_user" size={13} /> Reseller price (₹)</span>
                    <input
                      className="pricing-edit-input"
                      type="number"
                      placeholder="Amount"
                      value={rule.resellerPrice}
                      onChange={e => setRule(dur, 'resellerPrice', e.target.value)}
                      min={0}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <div className="modal-btn-row">
          <button type="button" onClick={onClose} disabled={saving}><DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={16} /> Cancel</button>
          <button className="modal-save" type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : <><MatIcon name="check" size={17} /> Save pricing</>}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ── AdminPage ──────────────────────────────────────────────────── */
function AdminPage({ session, onSessionChange }) {
  const [tab, setTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [catalogMeta, setCatalogMeta] = useState({});
  const [catalogImportType, setCatalogImportType] = useState('user');
  const [catalogImportMode, setCatalogImportMode] = useState('catalog');
  const [catalogImportHtml, setCatalogImportHtml] = useState('');
  const [catalogSourceDomain, setCatalogSourceDomain] = useState('');
  const [catalogPidOverrides, setCatalogPidOverrides] = useState({});
  const [catalogImporting, setCatalogImporting] = useState(false);
  const [pidUpdateResults, setPidUpdateResults] = useState(null);
  const [productChannels, setProductChannels] = useState([]);
  const [channelForm, setChannelForm] = useState({ id: '', productName: '', feedbackUrl: '', fileUpdateUrl: '' });
  const [search, setSearch] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [fundForm, setFundForm] = useState({ uid: '', amount: '', mode: 'add' });
  const [resellerForm, setResellerForm] = useState({ username: '', password: '', fund: '' });
  const [userIncreasePercent, setUserIncreasePercent] = useState('0');
  const [resellerIncreasePercent, setResellerIncreasePercent] = useState('0');
  const [upiId, setUpiId] = useState('');
  const [minDeposit, setMinDeposit] = useState('50');
  const [resellerPrice, setResellerPrice] = useState('');
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [gatewayFee, setGatewayFee] = useState('0');
  const [cashfreeAppId, setCashfreeAppId] = useState('');
  const [communityLinks, setCommunityLinks] = useState({ resellerUpdatesUrl: '', getFileUrl: '', helpUrl: '' });
  const [historyUser, setHistoryUser] = useState(null);
  const [pricingProduct, setPricingProduct] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [apiChecking, setApiChecking] = useState(false);
  // Manual keys
  const [manualKeyForm, setManualKeyForm] = useState({ pid: '', productName: '', duration: '', key: '' });
  const [manualKeys, setManualKeys] = useState([]);
  // Admin alerts / Issues
  const [adminAlerts, setAdminAlerts] = useState([]);
  const [viewIssueUser, setViewIssueUser] = useState(null);
  const [issueFilter, setIssueFilter] = useState('today'); // today | yesterday | all
  // Gift codes
  const [gcAmount, setGcAmount] = useState('');
  const [gcMaxRedeems, setGcMaxRedeems] = useState('1');
  const [giftCodes, setGiftCodes] = useState([]);
  const [viewGcUsers, setViewGcUsers] = useState(null);
  // Site status
  const [siteStatus, setSiteStatus] = useState('operational');
  const [siteStatusMsg, setSiteStatusMsg] = useState('');

  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'announcements', label: 'Announcements', icon: 'campaign' },
    { id: 'users', label: 'Users', icon: 'people' },
    { id: 'resellers', label: 'Resellers', icon: 'verified_user' },
    { id: 'products', label: 'Products', icon: 'shopping_bag' },
    { id: 'product-data', label: 'Product Data', icon: 'cloud_upload' },
    { id: 'channels', label: 'Feedback & Files', icon: 'link' },
    { id: 'issues', label: 'Issues', icon: 'report' },
    { id: 'gift-codes', label: 'Gift Codes', icon: 'card_giftcard', lottie: '/icons/new/gift-code.json' },
    { id: 'dm-keys', label: 'DM Keys', icon: 'vpn_key' },
    { id: 'key-history', label: 'License History', icon: 'history' },
    { id: 'add-keys', label: 'License Keys', icon: 'vpn_key' },
    { id: 'payments', label: 'Payments', icon: 'payment' },
    { id: 'reports', label: 'Reports', icon: 'assessment' },
    { id: 'settings', label: 'Payment Settings', icon: 'settings' },
  ];

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const [overview, productList, alerts, status, gcList, channelList, catalogInfo, pricingSettings] = await Promise.all([
        getAdminOverview(),
        fetchStorefrontProducts('user').catch(() => []),
        getAdminAlerts().catch(() => []),
        getSiteStatus().catch(() => ({ status: 'operational', message: '' })),
        getGiftCodes().catch(() => []),
        getProductChannels().catch(() => []),
        getProductCatalogMeta().catch(() => ({})),
        getProductPricingSettings().catch(() => ({ userIncreasePercent: 0, resellerIncreasePercent: 0 })),
      ]);
      setData(overview);
      setProducts(productList);
      setUpiId(overview.upiId || '');
      setMinDeposit(String(overview.minDeposit || 50));
      setResellerPrice(String(overview.resellerPrice || ''));
      setGatewayEnabled(Boolean(overview.gatewayEnabled));
      setUpiEnabled(overview.upiEnabled !== false);
      setGatewayFee(String(overview.gatewayFee || 0));
      setCashfreeAppId(overview.cashfreeAppId || '');
      setCommunityLinks({
        resellerUpdatesUrl: overview.communityLinks?.resellerUpdatesUrl || '',
        getFileUrl: overview.communityLinks?.getFileUrl || '',
        helpUrl: overview.communityLinks?.helpUrl || '',
      });
      setManualKeys(overview.manualKeys || []);
      setAdminAlerts(alerts);
      setSiteStatus(status.status || 'operational');
      setSiteStatusMsg(status.message || '');
      setGiftCodes(gcList);
      setProductChannels(channelList);
      setCatalogMeta(catalogInfo);
      setCatalogSourceDomain(catalogInfo[catalogImportType]?.sourceDomain || '');
      setUserIncreasePercent(String(pricingSettings.userIncreasePercent || 0));
      setResellerIncreasePercent(String(pricingSettings.resellerIncreasePercent || 0));
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!session?.uid) return;
    getUserProfile(session.uid).then(next => onSessionChange(next)).catch(() => {});
    loadAdmin();
  }, [session?.uid]);

  if (!session) return <AdminLocked iconName="lock" title="Admin login required" text="Please login first to access the admin dashboard." action="Go to login" />;
  if (session.role !== 'admin') return <AdminLocked iconName="block" title="Admin only" text={`Your account role is ${session.role || 'user'}. Ask an admin to enable access.`} action="Back to dashboard" />;

  const users = data?.users || [];
  const keys = data?.keys || [];
  const deposits = data?.deposits || [];
  const transactions = data?.transactions || [];
  const resellers = data?.resellers || [];
  const announcements = data?.announcements || [];
  const pendingContactKeys = keys
    .filter(key => key.status === 'contact_pending')
    .sort((a, b) => (b.contactRequestedAt || b.purchasedAt || 0) - (a.contactRequestedAt || a.purchasedAt || 0));

  const filteredUsers = users.filter(u => `${u.name} ${u.phone} ${u.email} ${u.uid}`.toLowerCase().includes(search.toLowerCase()));
  const filteredProducts = products.filter(p => `${p.name} ${p.pid} ${p.game}`.toLowerCase().includes(search.toLowerCase())).slice(0, 20);

  const safeAction = async (action, success) => {
    try { await action(); toast.success(success); loadAdmin(); }
    catch (err) { toast.error(err.message); }
  };

  const checkApiStatus = async () => {
    setApiChecking(true);
    try {
      const result = await checkResellerBalance();
      setApiStatus(result);
    } catch (err) { setApiStatus({ error: true, message: err.message }); }
    finally { setApiChecking(false); }
  };

  const importCatalog = async event => {
    event.preventDefault();
    if (!catalogImportHtml.trim()) {
      toast.error('Paste the complete User or Reseller page source first.');
      return;
    }
    setCatalogImporting(true);
    try {
      if (catalogImportMode === 'pid') {
        const result = await adminUpdateProductPids(catalogImportType, catalogImportHtml);
        setPidUpdateResults(result);
        setCatalogImportHtml('');
        await loadAdmin();
        toast.success(`${result.changed.length} PID${result.changed.length === 1 ? '' : 's'} updated for ${catalogImportType === 'reseller' ? 'Reseller' : 'User'} Data`);
        return;
      }
      const result = await adminSaveProductCatalog(catalogImportType, catalogImportHtml, catalogSourceDomain, catalogPidOverrides);
      setCatalogImportHtml('');
      setCatalogPidOverrides({});
      const nextMeta = await getProductCatalogMeta().catch(() => catalogMeta);
      setCatalogMeta(nextMeta);
      await loadAdmin();
      toast.success(`${result.type === 'reseller' ? 'Reseller' : 'User'} catalog replaced: ${result.count} products${result.newProducts?.length ? ` · ${result.newProducts.length} new` : ''}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCatalogImporting(false);
    }
  };

  const catalogPreview = useMemo(() => {
    if (!catalogImportHtml.trim()) return { products: [], error: '' };
    try {
      return {
        products: catalogImportMode === 'pid'
          ? parseProductPidSource(catalogImportHtml)
          : parseProductSource(catalogImportHtml, catalogSourceDomain),
        error: '',
      };
    } catch (err) {
      return { products: [], error: err.message };
    }
  }, [catalogImportHtml, catalogImportMode, catalogSourceDomain]);

  const setSourceLinkMode = async enabled => {
    try {
      await adminSetProductCatalogLinkMode(catalogImportType, enabled);
      setCatalogMeta(current => ({
        ...current,
        [catalogImportType]: { ...(current[catalogImportType] || {}), sourceLinksEnabled: enabled },
      }));
      toast.success(enabled ? 'Pasted File Update links enabled' : 'Default group File Update links enabled');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const editCatalogProductLinks = product => {
    setChannelForm({
      id: '',
      productName: product.name || '',
      feedbackUrl: product.feedbackUrl || '',
      fileUpdateUrl: product.fileUpdateUrl || '',
    });
    setTab('channels');
  };

  const section = {
    dashboard: (
      <>
        <div className="admin-stat-grid">
          <AdminStat iconName="trending_up" label="Total revenue" value={<MoneyDisplay value={data?.stats?.totalRevenue || 0} />} accent="green" />
          <AdminStat iconName="people" label="Active users" value={data?.stats?.activeUsers || 0} accent="blue" />
          <AdminStat iconName="vpn_key" label="Keys sold" value={data?.stats?.keysSold || 0} accent="purple" />
          <AdminStat iconName="payment" label="Pending deposit" value={<MoneyDisplay value={data?.stats?.pendingDeposit || 0} />} accent="orange" />
        </div>

        {/* API Status Card */}
        <div className="admin-card api-status-card">
          <div className="admin-card-header">
            <div className="heading-title-row">
              <MatIcon name="api" size={20} />
               <div><h3>Reseller API Status</h3><p className="muted">Server-side configuration check — no product is purchased</p></div>
            </div>
            <button className="modal-save" onClick={checkApiStatus} disabled={apiChecking}>
              {apiChecking ? 'Checking…' : <><MatIcon name="refresh" size={16} /> Check now</>}
            </button>
          </div>
          {apiStatus && (
            <div className="api-status-result">
              {apiStatus.error
                ? <p className="muted" style={{ color: '#f87171' }}>❌ {apiStatus.message}</p>
                : (
                  <>
                    <p className="muted" style={{ marginBottom: 8 }}>
                       {apiStatus.__test === 'configuration_status'
                         ? `Configuration response · HTTP ${apiStatus.__httpStatus ?? '—'}`
                        : 'Provider response'}
                    </p>
                    <pre className="api-status-pre">{JSON.stringify(apiStatus, null, 2)}</pre>
                  </>
                )
              }
            </div>
          )}
           {!apiStatus && !apiChecking && <p className="muted empty-state">Press "Check now" to verify the server-side API configuration.</p>}
        </div>

        <div className="admin-two-col">
          <div className="admin-card">
            <h3>Quick actions</h3>
            <button onClick={() => setTab('announcements')}><MatIcon name="campaign" size={16} /> New announcement</button>
            <button onClick={() => setTab('users')}><MatIcon name="people" size={16} /> Manage users</button>
            <button onClick={() => setTab('products')}><MatIcon name="edit" size={16} /> Edit pricing</button>
            <button onClick={() => setTab('payments')}><MatIcon name="payment" size={16} /> Review payments</button>
          </div>
          <div className="admin-card">
            <h3>Inventory status</h3>
            <p className="muted"><MatIcon name="shopping_bag" size={14} /> {products.length} API products loaded</p>
            <p className="muted"><LottieIcon src="/icons/new/key-lottie.json" size={14} /> {keys.length} license key records</p>
            <p className="muted"><MatIcon name="inventory" size={14} /> {manualKeys.filter(k => !k.used).length} unused manual keys</p>
            <p className="muted"><MatIcon name="schedule" size={14} /> {deposits.filter(d => d.status === 'pending').length} pending payment requests</p>
          </div>
        </div>

        {/* Admin Alerts */}
        {adminAlerts.filter(a => !a.resolved).length > 0 && (
          <div className="admin-card" style={{ borderColor: 'rgba(255,112,137,0.4)' }}>
            <div className="admin-card-header">
              <div className="heading-title-row">
                <MatIcon name="error_outline" size={20} style={{ color: '#ff7089' }} />
                <div><h3 style={{ color: '#ff7089' }}>Alerts</h3><p className="muted">Keys exhausted — admin action needed</p></div>
              </div>
              <button className="danger-mini" onClick={() => safeAction(clearResolvedAlerts, 'Resolved alerts cleared')}>
                <MatIcon name="clear_all" size={14} /> Clear resolved
              </button>
            </div>
            {adminAlerts.filter(a => !a.resolved).map(alert => (
              <div key={alert.id} className="admin-alert-row">
                <div className="admin-alert-info">
                  <LottieIcon src="/icons/new/feat-crystal-skull.json" size={20} />
                  <div>
                    <strong>{alert.productName || 'Unknown product'}</strong>
                    <p className="muted">{alert.duration ? `${alert.duration} · ` : ''}{fmtDate(alert.timestamp)}</p>
                  </div>
                </div>
                <button className="modal-save" style={{ background: 'rgba(116,224,165,0.2)', color: '#74e0a5', border: '1px solid rgba(116,224,165,0.3)' }} onClick={() => safeAction(() => resolveAdminAlert(alert.id), 'Alert resolved — keys added')}>
                  <MatIcon name="check_circle" size={14} /> Resolved
                </button>
              </div>
            ))}
          </div>
        )}
      </>
    ),

    announcements: (
      <div className="admin-card">
        <h3>New announcement</h3>
        <form className="admin-form" onSubmit={e => { e.preventDefault(); safeAction(async () => { await adminSaveAnnouncement(announcement, annTitle); setAnnouncement(''); setAnnTitle(''); }, 'Announcement published'); }}>
          <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Title (optional)" style={{ marginBottom: 8 }} />
          <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} placeholder="Write announcement for users" />
          <button className="modal-save"><LottieIcon src="/icons/new/bell.json" size={16} /> Publish</button>
        </form>
        <AdminList items={announcements} empty="No announcements yet" render={item => (
          <AdminRow title={item.message} meta={fmtDate(item.createdAt)} status={item.status || 'active'} />
        )} />
      </div>
    ),

    users: (
      <div className="admin-card">
        <h3>Manage users</h3>
        <div className="search-box admin-search">
          <DeviceIcon emoji="/icons/new/search-emoji.json" icon="search" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, phone, email" />
        </div>
        <form className="admin-form compact" onSubmit={e => { e.preventDefault(); safeAction(async () => { await adminAdjustUserFund(fundForm.uid, fundForm.amount, fundForm.mode); setFundForm({ uid: '', amount: '', mode: 'add' }); }, 'User fund updated'); }}>
          <input value={fundForm.uid} onChange={e => setFundForm({ ...fundForm, uid: e.target.value })} placeholder="User UID" />
          <input value={fundForm.amount} onChange={e => setFundForm({ ...fundForm, amount: e.target.value })} placeholder="Amount" inputMode="numeric" />
          <select value={fundForm.mode} onChange={e => setFundForm({ ...fundForm, mode: e.target.value })}>
            <option value="add">Add fund</option>
            <option value="subtract">Subtract</option>
          </select>
          <button className="modal-save"><MatIcon name="account_balance_wallet" size={15} /> Update fund</button>
        </form>
        <AdminList items={filteredUsers} empty="No users found" render={user => (
          <AdminRow
            title={user.name || user.uid}
            meta={`${user.phone || user.email || user.uid} · ${fmtDate(user.createdAt)}`}
            status={<>{user.role || 'user'} · {user.status || 'active'} · <MoneyDisplay value={user.balance} /></>}
          >
            <button onClick={() => setFundForm({ uid: user.uid, amount: '', mode: 'add' })}><MatIcon name="account_balance_wallet" size={13} /> Fund</button>
            <button onClick={() => setHistoryUser(user)}><MatIcon name="history" size={13} /> History</button>
            <button onClick={() => safeAction(() => adminUpdateUser(user.uid, { reseller: !user.reseller }), user.reseller ? 'Reseller removed' : 'Reseller enabled')}>
              {user.reseller ? 'Remove reseller' : 'Reseller'}
            </button>
            <button className="danger-mini" onClick={() => safeAction(() => adminUpdateUser(user.uid, { status: user.status === 'banned' ? 'active' : 'banned' }), user.status === 'banned' ? 'User unbanned' : 'User banned')}>
              <MatIcon name={user.status === 'banned' ? 'check_circle' : 'block'} size={13} /> {user.status === 'banned' ? 'Unban' : 'Ban'}
            </button>
          </AdminRow>
        )} />
      </div>
    ),

    resellers: (
      <div className="admin-card">
        <h3>Manage resellers</h3>
        <form className="admin-form" onSubmit={e => { e.preventDefault(); safeAction(async () => { await adminSaveReseller(resellerForm); setResellerForm({ username: '', password: '', fund: '' }); }, 'Reseller saved'); }}>
          <input value={resellerForm.username} onChange={e => setResellerForm({ ...resellerForm, username: e.target.value })} placeholder="Username" />
          <input value={resellerForm.password} onChange={e => setResellerForm({ ...resellerForm, password: e.target.value })} placeholder="Password" type="password" />
          <input value={resellerForm.fund} onChange={e => setResellerForm({ ...resellerForm, fund: e.target.value })} placeholder="Opening fund" inputMode="numeric" />
          <button className="modal-save"><MatIcon name="verified_user" size={15} /> Save reseller</button>
        </form>
        <AdminList items={resellers} empty="No resellers yet" render={item => (
          <AdminRow title={item.username || item.id} meta={<>Fund <MoneyDisplay value={item.fund || 0} /> · Created {fmtDate(item.createdAt || item.updatedAt)}</>} status={item.status || 'active'}>
            <button onClick={() => setHistoryUser({ uid: item.id, name: item.username })}><MatIcon name="history" size={13} /> History</button>
            <button className="danger-mini" onClick={() => { if (window.confirm(`Delete reseller ${item.username}?`)) safeAction(() => adminDeleteReseller(item.id), 'Reseller deleted'); }}>
              <MatIcon name="delete" size={13} /> Delete
            </button>
          </AdminRow>
        )} />
      </div>
    ),

    products: (
      <div className="admin-card">
        <h3>Manage products &amp; pricing</h3>
        <p className="muted" style={{ marginBottom: 8 }}>Set separate global price increases for User and Reseller accounts, or select any product for fixed User/Reseller pricing and the DM / Only Contact switch.</p>
        <form
          className="admin-form global-pricing-form"
          onSubmit={e => {
            e.preventDefault();
            safeAction(
              () => adminSaveProductPricingSettings({ userIncreasePercent, resellerIncreasePercent }),
              'Global User and Reseller pricing saved',
            );
          }}
        >
          <div className="global-pricing-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label>
              Global User price increase (%)
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden="true" style={{ width: 18, textAlign: 'center', fontWeight: 700 }}>%</span>
                <input
                  value={userIncreasePercent}
                  onChange={e => setUserIncreasePercent(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="0"
                  inputMode="decimal"
                  min="0"
                  max="1000"
                  step="0.01"
                  style={{ flex: 1 }}
                />
              </div>
              <small className="muted">Applies only to User prices. Enter 0 to disable.</small>
            </label>
            <label>
              Global Reseller price increase (%)
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden="true" style={{ width: 18, textAlign: 'center', fontWeight: 700 }}>%</span>
                <input
                  value={resellerIncreasePercent}
                  onChange={e => setResellerIncreasePercent(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="0"
                  inputMode="decimal"
                  min="0"
                  max="1000"
                  step="0.01"
                  style={{ flex: 1 }}
                />
              </div>
              <small className="muted">Applies only to Reseller prices. Enter 0 to disable.</small>
            </label>
          </div>
          <div>
            <small className="muted">Example: ₹5 with 2% becomes ₹5.10. Each percentage is applied separately after the matching User/Reseller base price is resolved.</small>
          </div>
          <div>
            <button className="modal-save" type="submit">
              <MatIcon name="check" size={15} /> Save pricing
            </button>
          </div>
        </form>
        <div className="search-box admin-search">
          <DeviceIcon emoji="/icons/new/search-emoji.json" icon="search" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products" />
        </div>
        <AdminList items={filteredProducts} empty="No products loaded" render={product => (
          <AdminRow
            title={product.name}
            meta={`PID ${product.pid} · ${product.game} · ${product.platform || 'Platform'}`}
            status={
              <>
                {product.pricing?.length || 0} durations
                {isOnlyContactProduct(product, data?.pricingRules || {}) && <span className="reseller-badge-mini" style={{ marginLeft: 6 }}>DM ON</span>}
              </>
            }
          >
            <button onClick={() => setPricingProduct(product)}>
              <MatIcon name="edit" size={13} /> Pricing &amp; DM switch
            </button>
          </AdminRow>
        )} />
      </div>
    ),

    'product-data': (
      <div className="admin-card product-data-card">
        <div className="admin-card-header">
          <div className="heading-title-row">
            <MatIcon name="cloud_upload" size={22} />
            <div>
              <h3>{catalogImportMode === 'pid' ? 'Product PID Update' : 'Product Data Import'}</h3>
              <p className="muted">
                {catalogImportMode === 'pid'
                  ? 'Paste a PID source to update only matching product PIDs. Pricing and product data stay unchanged.'
                  : 'Paste the complete HTML source. Each submit fully replaces the selected catalog.'}
              </p>
            </div>
          </div>
        </div>

        <div className="catalog-import-tabs" role="tablist" aria-label="Catalog type">
          {[
            { id: 'user', label: 'User Data', icon: 'person' },
            { id: 'reseller', label: 'Reseller Data', icon: 'verified_user' },
            { id: 'pid', label: 'PID', icon: 'vpn_key' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              className={
                item.id === 'pid'
                  ? catalogImportMode === 'pid' ? 'active' : ''
                  : catalogImportMode !== 'pid' && catalogImportType === item.id ? 'active' : ''
              }
              onClick={() => {
                if (item.id === 'pid') {
                  setCatalogImportMode(current => current === 'pid' ? 'catalog' : 'pid');
                  setPidUpdateResults(null);
                  return;
                }
                if (catalogImportMode !== 'pid') setCatalogImportMode('catalog');
                setCatalogImportType(item.id);
                setCatalogSourceDomain(catalogMeta[item.id]?.sourceDomain || '');
                setPidUpdateResults(null);
              }}
            >
              <MatIcon name={item.icon} size={17} /> {item.label}
            </button>
          ))}
        </div>

        {catalogImportMode !== 'pid' ? (
          <div className="catalog-source-link-toggle">
            <div>
              <strong>Use File Update links from pasted source</strong>
              <small className="muted">
                Off keeps your mapped Telegram channel links. Feedback always uses your official feedback channel.
              </small>
            </div>
            <button
              type="button"
              className={`switch-button${catalogMeta[catalogImportType]?.sourceLinksEnabled ? ' on' : ''}`}
              role="switch"
              aria-checked={catalogMeta[catalogImportType]?.sourceLinksEnabled === true}
              onClick={() => setSourceLinkMode(!catalogMeta[catalogImportType]?.sourceLinksEnabled)}
            >
              <span />
              {catalogMeta[catalogImportType]?.sourceLinksEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        ) : (
          <div className="catalog-source-link-toggle catalog-pid-target">
            <div>
              <strong>PID update target: {catalogImportType === 'reseller' ? 'Reseller Data' : 'User Data'}</strong>
              <small className="muted">Click User Data or Reseller Data above to change the target. Only PID fields will change.</small>
            </div>
            <MatIcon name="vpn_key" size={19} />
          </div>
        )}

        <form className="admin-form catalog-import-form" onSubmit={importCatalog}>
          {catalogImportMode !== 'pid' && (
            <label>
              Source domain
              <input
                value={catalogSourceDomain}
                onChange={e => setCatalogSourceDomain(e.target.value)}
                placeholder="https://your-domain.com/"
                type="url"
                required
              />
              <small className="muted">Used to turn relative image/video links into full URLs.</small>
            </label>
          )}
          <label>
            {catalogImportMode === 'pid' ? 'PID source' : 'Complete page source'}
            <textarea
              value={catalogImportHtml}
              onChange={e => setCatalogImportHtml(e.target.value)}
              placeholder={catalogImportMode === 'pid'
                ? 'Paste the PID reference source here…'
                : 'Paste the full HTML source here…'}
              rows={12}
              required
            />
            <small className="muted">
              {catalogImportMode === 'pid'
                ? `Only PID values will update the existing ${catalogImportType === 'reseller' ? 'Reseller' : 'User'} catalog. Product names must match.`
                : 'Each submit fully replaces the selected catalog.'}
            </small>
          </label>
          {catalogImportHtml.trim() && (
            <div className="catalog-pid-preview">
              <div className="admin-card-header">
                <div>
                  <h3>{catalogImportMode === 'pid' ? 'Detected PID updates' : 'Detected products &amp; PIDs'}</h3>
                  <p className="muted">
                    {catalogPreview.products.length
                      ? catalogImportMode === 'pid'
                        ? `${catalogPreview.products.length} product PIDs found for ${catalogImportType === 'reseller' ? 'Reseller' : 'User'} Data.`
                        : `${catalogPreview.products.length} products found. Correct any PID before submitting.`
                      : catalogPreview.error || 'Reading source…'}
                  </p>
                </div>
              </div>
              {catalogPreview.products.length > 0 && (
                <div className="catalog-pid-table-wrap">
                  <table className="catalog-pid-table">
                    <thead>
                      <tr><th>Product</th><th>PID used for API</th><th>Durations / stock</th></tr>
                    </thead>
                    <tbody>
                      {catalogPreview.products.map(product => {
                        const currentPid = catalogPidOverrides[product.name] ?? product.pid;
                        return (
                          <tr key={`${product.name}-${product.pid}`}>
                            <td><strong>{product.name}</strong></td>
                            <td>
                              <input
                                value={currentPid}
                                onChange={e => setCatalogPidOverrides(current => ({ ...current, [product.name]: e.target.value }))}
                                aria-label={`PID for ${product.name}`}
                                inputMode="numeric"
                                readOnly={catalogImportMode === 'pid'}
                              />
                            </td>
                            <td>
                              <small>
                                {catalogImportMode === 'pid'
                                  ? 'Existing product data will be kept'
                                  : product.pricing.map(item => `${item.duration}${item.stock !== null ? ` [Stock: ${item.stock}]` : ''}`).join(' · ')}
                              </small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <button className="modal-save" type="submit" disabled={catalogImporting}>
            <MatIcon name="sync" size={16} />
            {catalogImporting
              ? catalogImportMode === 'pid' ? 'Updating PIDs…' : 'Updating catalog…'
              : catalogImportMode === 'pid'
                ? `Update ${catalogImportType === 'reseller' ? 'Reseller' : 'User'} PIDs`
                : `Submit ${catalogImportType === 'reseller' ? 'Reseller' : 'User'} Data`}
          </button>
        </form>

        {catalogImportMode === 'pid' && pidUpdateResults && (
          <div className="catalog-pid-results">
            <strong>PID update result</strong>
            <p className="muted">
              {pidUpdateResults.changed.length} changed · {pidUpdateResults.unchanged.length} unchanged
              {pidUpdateResults.unmatchedSource.length ? ` · ${pidUpdateResults.unmatchedSource.length} source names not matched` : ''}
            </p>
            {pidUpdateResults.changed.length > 0 && (
              <div className="catalog-pid-result-list">
                {pidUpdateResults.changed.map(item => (
                  <span key={item.name}><strong>{item.name}</strong>: {item.previousPid || '—'} → {item.pid}</span>
                ))}
              </div>
            )}
            {pidUpdateResults.unmatchedSource.length > 0 && (
              <small className="muted">
                Unmatched: {pidUpdateResults.unmatchedSource.map(item => `${item.name} (PID ${item.pid})`).join(' · ')}
              </small>
            )}
          </div>
        )}

        <div className="catalog-status-grid">
          {['user', 'reseller'].map(type => {
            const info = catalogMeta[type] || {};
            return (
              <div className={`catalog-status-item${catalogImportType === type ? ' selected' : ''}`} key={type}>
                <strong>{type === 'user' ? 'User Data' : 'Reseller Data'}</strong>
                <span>{info.count || 0} products</span>
                <small>{info.updatedAt ? `Updated ${fmtDate(info.updatedAt)}` : 'Not imported yet'}</small>
              </div>
            );
          })}
        </div>

        <div className="catalog-new-products">
          <div className="admin-card-header">
            <div>
              <h3>New products</h3>
              <p className="muted">Edit Feedback and File Update links for products detected in the latest import.</p>
            </div>
          </div>
          <AdminList
            items={catalogMeta[catalogImportType]?.newProducts || []}
            empty="No new products from the latest import"
            render={product => (
              <AdminRow
                title={product.name}
                meta={`PID ${product.pid || '—'}`}
                status={product.fileUpdateUrl ? 'File Update mapped' : 'File Update not set'}
              >
                <button type="button" onClick={() => editCatalogProductLinks(product)}>
                  <MatIcon name="edit" size={13} /> Edit links
                </button>
              </AdminRow>
            )}
          />
        </div>
      </div>
    ),

    channels: (
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="heading-title-row">
            <MatIcon name="link" size={22} />
            <div>
              <h3>Feedback &amp; File Update links</h3>
              <p className="muted">Manual Firebase records override the built-in product mappings.</p>
            </div>
          </div>
        </div>
        <form className="admin-form" onSubmit={e => {
          e.preventDefault();
          safeAction(async () => {
            await adminSaveProductChannel(channelForm);
            setChannelForm({ id: '', productName: '', feedbackUrl: '', fileUpdateUrl: '' });
          }, 'Product links saved');
        }}>
          <label>
            Product name
            <input
              value={channelForm.productName}
              onChange={e => setChannelForm(v => ({ ...v, productName: e.target.value }))}
              placeholder="Product name or brand"
              required
            />
          </label>
          <label>
            Feedback URL
            <input
              value={channelForm.feedbackUrl}
              onChange={e => setChannelForm(v => ({ ...v, feedbackUrl: e.target.value }))}
              placeholder="https://t.me/..."
              type="url"
            />
          </label>
          <label>
            File Update URL
            <input
              value={channelForm.fileUpdateUrl}
              onChange={e => setChannelForm(v => ({ ...v, fileUpdateUrl: e.target.value }))}
              placeholder="https://t.me/..."
              type="url"
            />
          </label>
          <div className="modal-btn-row">
            <button className="modal-save" type="submit">
              <MatIcon name={channelForm.id ? 'save' : 'add_link'} size={16} /> {channelForm.id ? 'Update link' : 'Add link'}
            </button>
            {channelForm.id && (
              <button type="button" onClick={() => setChannelForm({ id: '', productName: '', feedbackUrl: '', fileUpdateUrl: '' })}>
                <MatIcon name="close" size={16} /> Cancel edit
              </button>
            )}
          </div>
        </form>
        <AdminList items={productChannels} empty="No manual product links configured" render={channel => (
          <AdminRow
            title={channel.productName}
            meta={<>{channel.feedbackUrl ? 'Feedback ready' : 'No feedback link'} · {channel.fileUpdateUrl ? 'File Update ready' : 'File Update not set'}</>}
            status="Custom"
          >
            <button type="button" onClick={() => setChannelForm({
              id: channel.id,
              productName: channel.productName || '',
              feedbackUrl: channel.feedbackUrl || '',
              fileUpdateUrl: channel.fileUpdateUrl || '',
            })}>
              <MatIcon name="edit" size={13} /> Edit
            </button>
            <button type="button" className="danger-mini" onClick={() => {
              if (window.confirm(`Hide links for ${channel.productName}?`)) {
                safeAction(() => adminDeleteProductChannel(channel), 'Product link deleted');
              }
            }}>
              <MatIcon name="delete" size={13} /> Delete
            </button>
          </AdminRow>
        )} />
      </div>
    ),

    'gift-codes': (
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="heading-title-row">
            <DeviceIcon emoji="/icons/new/gift-code.json" icon="card_giftcard" size={22} />
            <div><h3>Gift codes</h3><p className="muted">Create and manage gift codes for users</p></div>
          </div>
        </div>
        <form className="admin-form compact" onSubmit={e => { e.preventDefault(); safeAction(async () => {
          const res = await adminCreateGiftCode(gcAmount, gcMaxRedeems);
          setGcAmount(''); setGcMaxRedeems('1');
          toast.success(`Gift code ${res.code} created for ₹${res.amount}`, { icon: <DeviceIcon emoji="/icons/new/gift-code.json" icon="card_giftcard" size={18} /> });
        }, 'Gift code created'); }}>
          <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
            <DeviceIcon emoji="/icons/new/rupee-emoji.json" icon="currency_rupee" size={16} />
            <input value={gcAmount} onChange={e => setGcAmount(e.target.value)} placeholder="Amount" inputMode="numeric" required style={{flex:1}} />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <MatIcon name="people" size={18} />
            <input value={gcMaxRedeems} onChange={e => setGcMaxRedeems(e.target.value)} placeholder="Max users" inputMode="numeric" style={{width:60}} />
          </div>
          <button className="modal-save" type="submit"><DeviceIcon emoji="/icons/new/gift-code.json" icon="card_giftcard" size={16} /> Create</button>
        </form>
        <AdminList items={giftCodes} empty="No gift codes created yet" render={gc => (
          <AdminRow
            title={<span style={{display:'flex',alignItems:'center',gap:6}}><DeviceIcon emoji="/icons/new/gift-code.json" icon="card_giftcard" size={16} /> {gc.code}</span>}
            meta={`₹${gc.amount} · ${gc.totalRedeemed || 0}/${gc.maxRedeems} used · ${fmtDate(gc.createdAt)}`}
            status={gc.active ? '🟢 Active' : '🔴 Exhausted'}
          >
            <button onClick={() => setViewGcUsers(gc)}><MatIcon name="visibility" size={13} /> Users</button>
          </AdminRow>
        )} />
        {viewGcUsers && (
          <GiftCodeUsersDialog gc={viewGcUsers} onClose={() => setViewGcUsers(null)} />
        )}
      </div>
    ),

    'key-history': (
      <div className="admin-card">
        <h3>License History</h3>
        <p className="muted" style={{ marginBottom: 8 }}>All issued keys and completed DM orders</p>
        <AdminList items={keys.filter(key => key.status !== 'contact_pending' && key.status !== 'contact_rejected')} empty="No completed license keys yet" render={key => (
          <AdminRow
            title={key.productName || key.product || key.name || 'License key'}
            meta={`${key.user || key.uid || 'User'} · ${key.duration || '—'} · ${fmtDate(key.purchasedAt || key.createdAt)}`}
            status={key.status || 'active'}
          >
            <button className="danger-mini" onClick={() => { if (window.confirm('Delete this key record?')) safeAction(() => adminDeleteLicenseKey(key.id), 'Key deleted'); }}>
              <MatIcon name="delete" size={13} /> Delete
            </button>
          </AdminRow>
        )} />
      </div>
    ),

    'dm-keys': (
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="heading-title-row">
            <MatIcon name="vpn_key" size={21} />
            <div>
              <h3>DM Key Requests</h3>
              <p className="muted">Paid Only Contact orders waiting for a key</p>
            </div>
          </div>
          <strong className="admin-count-badge">{pendingContactKeys.length} pending</strong>
        </div>
        <AdminList items={pendingContactKeys} empty="No pending DM key requests" render={key => (
          <AdminRow
            title={key.productName || key.product || 'Product'}
            meta={
              <>
                {key.user || key.uid || 'User'} · {key.duration || '—'} · <MoneyDisplay value={key.price || 0} /> · {fmtDate(key.contactRequestedAt || key.purchasedAt || key.createdAt)}
              </>
            }
            status="Pending"
          >
            <button className="modal-save" onClick={() => {
              const replacement = window.prompt(`Give key to ${key.user || key.uid || 'this user'}:`, '');
              if (replacement?.trim()) {
                safeAction(() => adminDeliverContactKey(key.id, replacement), 'Key delivered — order approved');
              }
            }}>
              <MatIcon name="vpn_key" size={13} /> Approve & give key
            </button>
            <button className="danger-mini" onClick={() => {
              const confirmed = window.confirm(`Reject this request and refund ₹${Number(key.price || 0).toLocaleString('en-IN')} to ${key.user || key.uid || 'the user'}?`);
              if (confirmed) {
                safeAction(() => adminRejectContactKey(key.id), 'Request rejected — amount refunded');
              }
            }}>
              <MatIcon name="close" size={13} /> Reject & refund
            </button>
          </AdminRow>
        )} />
      </div>
    ),

    'add-keys': (
      <div className="admin-card">
        <h3>Add Manual License Keys</h3>
        <p className="muted" style={{ marginBottom: 8 }}>These are fallback keys delivered if the reseller API fails.</p>
        <form className="admin-form manual-key-form" onSubmit={e => {
          e.preventDefault();
          safeAction(async () => {
            await adminAddManualKey(manualKeyForm.pid, manualKeyForm.productName, manualKeyForm.duration, manualKeyForm.key);
            setManualKeyForm({ pid: '', productName: '', duration: '', key: '' });
          }, 'Manual key added');
        }}>
          <select value={manualKeyForm.pid} onChange={e => {
            const prod = products.find(p => String(p.pid) === e.target.value);
            setManualKeyForm(f => ({ ...f, pid: e.target.value, productName: prod?.name || '' }));
          }}>
            <option value="">Select product…</option>
            {products.map(p => <option value={String(p.pid)} key={p.pid}>{p.name} (PID {p.pid})</option>)}
          </select>
          <input value={manualKeyForm.duration} onChange={e => setManualKeyForm(f => ({ ...f, duration: e.target.value }))} placeholder="Duration (e.g. 1 Day)" />
          <input value={manualKeyForm.key} onChange={e => setManualKeyForm(f => ({ ...f, key: e.target.value }))} placeholder="License key value" />
          <button className="modal-save" type="submit">
            <MatIcon name="add" size={15} /> Add key
          </button>
        </form>
        <h4 style={{ margin: '16px 0 8px' }}>Stored manual keys ({manualKeys.length})</h4>
        <AdminList items={manualKeys} empty="No manual keys stored" render={k => (
          <AdminRow
            title={k.productName || k.pid}
            meta={`Duration: ${k.duration} · Added ${fmtDate(k.createdAt)}`}
            status={k.used ? '✓ Used' : '● Available'}
          >
            {!k.used && (
              <button className="danger-mini" onClick={() => { if (window.confirm('Delete this manual key?')) safeAction(() => adminDeleteManualKey(k.id), 'Key deleted'); }}>
                <MatIcon name="delete" size={13} /> Delete
              </button>
            )}
          </AdminRow>
        )} />
      </div>
    ),

    issues: (
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="heading-title-row">
            <LottieIcon src="/icons/new/feat-crystal-skull.json" size={24} />
            <div><h3>Issues <span className="muted" style={{fontSize:'0.85rem',fontWeight:400}}>({adminAlerts.length})</span></h3><p className="muted">Users who got blocked due to no keys</p></div>
          </div>
          {adminAlerts.some(a => !a.resolved) && (
            <button className="danger-mini" onClick={() => safeAction(clearResolvedAlerts, 'Resolved alerts cleared')}>
              <MatIcon name="clear_all" size={14} /> Clear resolved
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="issue-filter-row">
          {['today','yesterday','all'].map(f => (
            <button key={f} className={`issue-filter-btn${issueFilter === f ? ' active' : ''}`}
              onClick={() => setIssueFilter(f)}>
              {f === 'today' ? <><MatIcon name="today" size={14} /> Today</> :
               f === 'yesterday' ? <><MatIcon name="date_range" size={14} /> Yesterday</> :
               <><MatIcon name="list" size={14} /> All</>}
            </button>
          ))}
          {adminAlerts.filter(a => a.resolved).length > 0 && (
            <button className="danger-mini" style={{marginLeft:'auto'}} onClick={() => {
              if (window.confirm('Clear all resolved issue history?')) safeAction(clearResolvedAlerts, 'Issue history cleared');
            }}>
              <MatIcon name="delete_sweep" size={14} /> Clear history
            </button>
          )}
        </div>

        {(() => {
          const today = new Date();
          const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
          const startYesterday = startToday - 86400000;
          const endYesterday = startToday - 1;

          const filtered = adminAlerts.filter(a => {
            if (issueFilter === 'all') return true;
            const ts = a.timestamp || 0;
            if (issueFilter === 'today') return ts >= startToday;
            return ts >= startYesterday && ts <= endYesterday;
          });

          return (
            <AdminList items={filtered} empty={issueFilter === 'all' ? 'No issues — all clear!' : `No issues ${issueFilter}`} render={alert => (
              <AdminRow
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {alert.resolved ? <MatIcon name="check_circle" size={14} style={{ color: '#74e0a5' }} /> : <LottieIcon src="/icons/new/feat-crystal-skull.json" size={18} />}
                    {alert.productName || 'Unknown product'}
                  </span>
                }
                meta={`${alert.duration || '—'} · ${fmtDate(alert.timestamp)}`}
                status={alert.resolved ? '✓ Resolved' : '⚠ Open'}
              >
                {alert.uid && (
                  <button onClick={() => setViewIssueUser({ uid: alert.uid, name: alert.userName, phone: alert.userPhone })}>
                    <MatIcon name="visibility" size={13} /> View user
                  </button>
                )}
                {!alert.resolved && (
                  <button className="modal-save" style={{ background: 'rgba(116,224,165,0.2)', color: '#74e0a5', border: '1px solid rgba(116,224,165,0.3)' }}
                    onClick={() => safeAction(() => resolveAdminAlert(alert.id), 'Issue resolved — user can purchase now')}>
                    <MatIcon name="check_circle" size={13} /> Resolve
                  </button>
                )}
              </AdminRow>
            )} />
          );
        })()}
      </div>
    ),

    payments: (
      <div className="admin-card">
        <h3>Payment requests</h3>
        <AdminList items={deposits} empty="No payment requests" render={payment => (
          <AdminRow
            title={<span style={{display:'flex',alignItems:'center',gap:6}}>{payment.user || payment.uid || 'User'} {payment.type === 'reseller' && <span className="reseller-badge-mini">RESELLER</span>}</span>}
            meta={<><MoneyDisplay value={payment.amount || 0} /> credit · {payment.method || 'UPI'}{payment.method === 'Cashfree' && <> · <MoneyDisplay value={payment.paidAmount || payment.amount || 0} /> paid{payment.gatewayFee ? ` · ₹${payment.gatewayFee} fee` : ''}</>}{payment.method !== 'Cashfree' && <> · {payment.type === 'reseller' ? 'Reseller unlock' : 'From: ' + (payment.senderUpi || '—')}</>} · {fmtDate(payment.createdAt)}</>}
            status={payment.method === 'Cashfree' && payment.autoCredited ? 'approved · auto credited' : (payment.status || 'pending')}
          >
            {payment.status === 'pending' && payment.method !== 'Cashfree' && (
              <>
                <button onClick={() => safeAction(() => adminUpdatePaymentRequest(payment.id, 'approved'), payment.type === 'reseller' ? 'Reseller unlocked — role upgraded' : 'Payment approved — balance credited')}>
                  <MatIcon name="check_circle" size={13} /> Approve
                </button>
                <button className="danger-mini" onClick={() => safeAction(() => adminUpdatePaymentRequest(payment.id, 'rejected'), 'Payment rejected')}>
                  <MatIcon name="close" size={13} /> Reject
                </button>
              </>
            )}
          </AdminRow>
        )} />
      </div>
    ),

    reports: (
      <div className="admin-card">
        <h3>Transaction reports</h3>
        <AdminList items={transactions} empty="No transactions yet" render={tx => (
          <AdminRow
            title={tx.type || 'Transaction'}
            meta={<>{tx.uid || 'User'} · <MoneyDisplay value={tx.amount || 0} /> · {fmtDate(tx.createdAt)}</>}
            status={tx.note || tx.status || 'record'}
          />
        )} />
      </div>
    ),

    settings: (
      <><div className="admin-card">
        <h3>Site status</h3>
        <form className="admin-form" onSubmit={e => { e.preventDefault(); safeAction(() => setSiteStatus(siteStatus, siteStatusMsg), 'Site status updated'); }}>
          <label>
            <DeviceIcon emoji="/icons/new/shield-verify.json" icon="security" size={16} /> Status
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <MatIcon name={siteStatus === 'operational' ? 'check_circle' : 'warning'} size={18} style={{ color: siteStatus === 'operational' ? '#74e0a5' : '#ff7089' }} />
              <select value={siteStatus} onChange={e => setSiteStatus(e.target.value)} style={{ flex: 1 }}>
                <option value="operational">🟢 Operational — site working fine</option>
                <option value="down">🔴 Down — keys exhausted, show alert</option>
              </select>
            </div>
          </label>
          <label>
            <LottieIcon src="/icons/new/bell.json" size={16} /> Banner message
            <textarea value={siteStatusMsg} onChange={e => setSiteStatusMsg(e.target.value)} placeholder="e.g. Site is completely fine. You can purchase now." rows={2} style={{ marginTop: 4 }} />
          </label>
          <button className="modal-save" type="submit"><DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={16} /> Update status</button>
        </form>
      </div>
      <div className="admin-card">
        <h3><MatIcon name="api" size={20} /> Reseller API Settings</h3>
        <p className="muted">
          The provider API is called by a server-side proxy. API credentials must not be
          entered in this browser form or stored in Firebase, because that would expose
          your provider wallet to anyone who can inspect the app.
        </p>
        <div className="api-setup-hint">
           <strong>Production setup</strong>
           <p className="muted">Set <code>RESELLER_API_KEY</code> and <code>RESELLER_MASTER_KEY</code> as production Secrets on the hosting project, and set <code>RESELLER_ENDPOINT</code> to <code>https://xyzcheats.com/api/reseller_v1.php</code>.</p>
           <p className="muted">Then use Dashboard → Reseller API Status → Check now. This verifies server configuration without making a purchase.</p>
           <p className="muted">The provider can still reject a valid request when its own wallet has no balance. In that case the user wallet is refunded and the error explains the reason.</p>
        </div>
        <button className="modal-save" type="button" onClick={() => { setTab('dashboard'); setTimeout(checkApiStatus, 0); }}>
          <MatIcon name="api" size={16} /> Check server configuration
        </button>
      </div>
      <div className="admin-card">
        <h3><img src={telegramLogo} alt="" style={{ width: 20, height: 20, verticalAlign: 'middle', marginRight: 7 }} /> Telegram community links</h3>
        <p className="muted">These links control reseller updates, purchased file access, and the floating help button.</p>
        <form className="admin-form" onSubmit={e => {
          e.preventDefault();
          safeAction(() => adminSaveCommunityLinks(communityLinks), 'Telegram links saved');
        }}>
          <label>
            Reseller All Update / Join link
            <input value={communityLinks.resellerUpdatesUrl} onChange={e => setCommunityLinks(v => ({ ...v, resellerUpdatesUrl: e.target.value }))} placeholder="https://t.me/your_reseller_channel" type="url" />
          </label>
          <label>
            Get File link
            <input value={communityLinks.getFileUrl} onChange={e => setCommunityLinks(v => ({ ...v, getFileUrl: e.target.value }))} placeholder="https://t.me/your_files_channel" type="url" />
          </label>
          <label>
            Get Help link
            <input value={communityLinks.helpUrl} onChange={e => setCommunityLinks(v => ({ ...v, helpUrl: e.target.value }))} placeholder="https://t.me/your_support" type="url" />
          </label>
          <button className="modal-save" type="submit"><img src={telegramLogo} alt="" style={{ width: 17, height: 17 }} /> Save Telegram links</button>
        </form>
      </div>
      <div className="admin-card">
        <h3><MatIcon name="restart_alt" size={20} /> Key reset requests</h3>
        <p className="muted">Review user requests from My Orders.</p>
        <AdminList items={data?.keyResetRequests || []} empty="No key reset requests" render={request => (
          <AdminRow
            title={`${request.productName || 'License'} · ${request.duration || '—'}`}
            meta={<>{request.uid} · {request.reason} · {fmtDate(request.createdAt)}</>}
            status={request.status || 'pending'}
          >
            {request.status === 'pending' && (
              <>
                <button className="modal-save" onClick={() => {
                  const replacement = window.prompt('Replacement key (optional):', '');
                  safeAction(() => adminReviewKeyResetRequest(request.id, 'approved', replacement || ''), 'Key reset approved');
                }}>
                  <MatIcon name="check_circle" size={13} /> Approve
                </button>
                <button className="danger-mini" onClick={() => safeAction(() => adminReviewKeyResetRequest(request.id, 'rejected'), 'Key reset rejected')}>
                  <MatIcon name="close" size={13} /> Reject
                </button>
              </>
            )}
          </AdminRow>
        )} />
      </div>
      <div className="admin-card">
        <h3>UPI payment settings</h3>
                <form className="admin-form" onSubmit={e => {
                  e.preventDefault();
                  safeAction(
                    () => adminSaveUpi(upiId, minDeposit, resellerPrice, {
                      gatewayEnabled,
                      upiEnabled,
                      gatewayFee,
                      cashfreeAppId,
                    }),
                    'Payment settings saved',
                  );
                }}>
          <div className="payment-toggle-grid">
            <label className="payment-toggle-card">
              <span><MatIcon name="credit_card" size={19} /><strong>Gateway</strong><small>Cashfree production checkout</small></span>
              <input type="checkbox" checked={gatewayEnabled} onChange={e => setGatewayEnabled(e.target.checked)} />
            </label>
            <label className="payment-toggle-card">
              <span><MatIcon name="account_balance" size={19} /><strong>UPI</strong><small>Manual UPI + admin approval</small></span>
              <input type="checkbox" checked={upiEnabled} onChange={e => setUpiEnabled(e.target.checked)} />
            </label>
          </div>
          <label>
            Cashfree App ID
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MatIcon name="vpn_key" size={18} />
              <input value={cashfreeAppId} onChange={e => setCashfreeAppId(e.target.value)} placeholder="Cashfree production App ID" style={{ flex: 1 }} />
            </div>
            <small className="muted">Secret key is kept securely in the deployment environment, never in Firebase/browser.</small>
          </label>
          <label>
             Gateway charge (%)
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <span aria-hidden="true" style={{ width: 18, textAlign: 'center', fontWeight: 700 }}>%</span>
               <input value={gatewayFee} onChange={e => setGatewayFee(e.target.value.replace(/[^\d.]/g, ''))} placeholder="2" inputMode="decimal" min="0" max="100" style={{ flex: 1 }} />
            </div>
            <small className="muted">Percentage charged only by Gateway. Example: ₹100 credit + 2% (₹2) fee = ₹102 payment; wallet gets ₹100. UPI has no extra charge.</small>
          </label>
          <label>
            UPI ID
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MatIcon name="payment" size={18} />
              <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@upi" style={{ flex: 1 }} />
            </div>
          </label>
          <label>
            <DeviceIcon emoji="/icons/new/rupee-emoji.json" icon="currency_rupee" size={16} /> Minimum deposit
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MatIcon name="account_balance_wallet" size={18} />
              <input value={minDeposit} onChange={e => setMinDeposit(e.target.value)} placeholder="50" inputMode="numeric" style={{ flex: 1 }} />
            </div>
          </label>
          <label>
            <MatIcon name="verified_user" size={16} /> Reseller unlock price
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MatIcon name="sell" size={18} />
              <input value={resellerPrice} onChange={e => setResellerPrice(e.target.value)} placeholder="1000" inputMode="numeric" style={{ flex: 1 }} />
            </div>
          </label>
          <button className="modal-save" type="submit"><MatIcon name="check" size={15} /> Save payment settings</button>
        </form>
        <div className="upi-preview">
          {upiId
            ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(`upi://pay?pa=${upiId}`)}`} alt="UPI QR" />
            : <p className="muted">QR will appear after UPI ID is saved.</p>}
        </div>
      </div></>
    ),
  }[tab];

  return (
    <main className="dashboard-page admin-page">
      <img className="dashboard-backdrop" src="/dashboard-dark-bg.webp" alt="" aria-hidden="true" loading="lazy" />
      <div className="dashboard-veil" />
      <div className={`admin-shell${collapsed ? ' collapsed' : ''}`}>
        <aside className="admin-tabs glass-card">
          <div className="admin-brand">
            <img src={logo} alt="Logo" />
            <div><span>Admin</span><strong>Control panel</strong></div>
            <button onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
              {collapsed ? <MatIcon name="menu" size={18} /> : <MatIcon name="close" size={18} />}
            </button>
          </div>
          <div className="admin-tab-list">
            {adminTabs.map(({ id, label, icon }) => (
              <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                {id === 'issues' ? <LottieIcon src="/icons/new/feat-crystal-skull.json" size={20} /> :
                 id === 'gift-codes' ? <DeviceIcon emoji="/icons/new/gift-code.json" icon="card_giftcard" size={18} /> :
                 <MatIcon name={icon} size={18} />}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </aside>
        <section className="admin-main">
          <div className="admin-topline">
            <div>
              <p className="dash-kicker">ADMIN DASHBOARD</p>
              <h1>{adminTabs.find(t => t.id === tab)?.label}</h1>
            </div>
            <button className="icon-button" onClick={loadAdmin} aria-label="Refresh">
              <MatIcon name="refresh" size={17} />
            </button>
          </div>
          {loading ? <PageSkeleton tab="admin" /> : section}
        </section>
      </div>
      <Toaster position="top-center" offset={78} theme="dark" toastOptions={toastOptions} />
      {historyUser && <UserHistoryDialog user={historyUser} onClose={() => setHistoryUser(null)} />}
      {viewIssueUser && <UserViewDialog user={viewIssueUser} onClose={() => setViewIssueUser(null)} />}
      {pricingProduct && <PricingEditDialog product={pricingProduct} onClose={() => setPricingProduct(null)} onSave={loadAdmin} />}
    </main>
  );
}

function AdminLocked({ iconName, title, text, action }) {
  return (
    <main className="dashboard-page admin-page">
      <div className="dashboard-veil" />
      <section className="admin-locked glass-card">
        <MatIcon name={iconName} size={32} />
        <h1>{title}</h1>
        <p className="muted">{text}</p>
        <button className="buy-product" onClick={() => window.location.assign('/')}>{action}</button>
      </section>
    </main>
  );
}

/* ── AddFundPage — standalone deposit flow at /add-fund ────────── */
function AddFundPage({ session, onSessionChange }) {
  const [step, setStep] = useState('amount'); // amount | method | qr | confirm | pending
  const [amount, setAmount] = useState('');
  const [senderUpi, setSenderUpi] = useState('');
  const [paySettings, setPaySettings] = useState({ upiId: '', minDeposit: 50, resellerPrice: 0, gatewayEnabled: false, upiEnabled: true, gatewayFee: 0 });
  const [isResellerUnlock, setIsResellerUnlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [profile, setProfile] = useState(session);
  const [gatewayOrder, setGatewayOrder] = useState(null);
  const [gatewayAutoCredited, setGatewayAutoCredited] = useState(false);

  useEffect(() => {
    if (!session?.uid) return;
    getPaymentSettings()
      .then(setPaySettings)
      .catch(err => toast.error(err.message));
    getUserProfile(session.uid)
      .then(next => { setProfile(next); onSessionChange(next); })
      .catch(() => {});
  }, [session?.uid]);

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];
  const gatewayFeeAmount = gatewayChargeAmount(amount, paySettings.gatewayFee);
  const gatewayTotalAmount = roundMoney(Number(amount || 0) + gatewayFeeAmount);

  const qrUrl = paySettings.upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(`upi://pay?pa=${paySettings.upiId}&am=${amount}&cu=INR&tn=WalletDeposit`)}`
    : '';

  const upiPayLink = app => {
    const pa = encodeURIComponent(paySettings.upiId);
    const am = encodeURIComponent(amount);
    const tn = encodeURIComponent('Wallet Deposit');
    const base = `pa=${pa}&pn=DevX&am=${am}&cu=INR&tn=${tn}`;
    if (app === 'gpay')    return `tez://upi/pay?${base}`;
    if (app === 'phonepe') return `phonepe://pay?${base}`;
    if (app === 'paytm')   return `paytmmp://pay?${base}`;
    return `upi://pay?${base}`;
  };

  const downloadQR = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `pay-${paySettings.upiId}-${amount}.png`;
      a.click();
    };
    img.onerror = () => window.open(qrUrl, '_blank');
    img.src = qrUrl + '&_t=' + Date.now();
  };

  const handleAmountNext = e => {
    e.preventDefault();
    openPaymentMethod();
  };

  const openPaymentMethod = () => {
    const val = Number(amount);
    if (!val || val < paySettings.minDeposit) {
      toast.error(`Minimum deposit is ${money(paySettings.minDeposit)}`);
      return;
    }
    if (!paySettings.gatewayEnabled && !paySettings.upiEnabled) {
      toast.error('Payment methods are not available right now. Contact admin.');
      return;
    }
    if (paySettings.gatewayEnabled && paySettings.upiEnabled) {
      setStep('method');
    } else if (paySettings.gatewayEnabled) {
      startGatewayPayment();
    } else {
      if (!paySettings.upiId) {
        toast.error('UPI payment is not configured yet. Contact admin.');
        return;
      }
      setStep('qr');
    }
  };

  const loadCashfreeSdk = () => new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve(window.Cashfree);
    const existing = document.querySelector('script[data-cashfree-sdk]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Cashfree), { once: true });
      existing.addEventListener('error', () => reject(new Error('Cashfree checkout could not load.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.dataset.cashfreeSdk = 'true';
    script.onload = () => window.Cashfree ? resolve(window.Cashfree) : reject(new Error('Cashfree checkout is unavailable.'));
    script.onerror = () => reject(new Error('Cashfree checkout could not load.'));
    document.head.appendChild(script);
  });

  const startGatewayPayment = async () => {
    const creditAmount = Number(amount);
    const totalAmount = roundMoney(creditAmount + gatewayChargeAmount(creditAmount, paySettings.gatewayFee));
    setBusy(true);
    try {
      const order = await createCashfreeOrder({
        amount: totalAmount,
        customerId: session.uid,
        customerName: profile.name || 'Customer',
        customerPhone: profile.phone || '9999999999',
        customerEmail: profile.email || `${session.uid}@customer.local`,
        appId: paySettings.cashfreeAppId,
      });
      setGatewayOrder({ ...order, creditAmount, totalAmount });
      const Cashfree = await loadCashfreeSdk();
      const checkout = Cashfree({ mode: 'production' });
      await checkout.checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: '_modal' });
      const verified = await verifyCashfreeOrder(order.orderId, paySettings.cashfreeAppId);
      if (verified.status !== 'PAID') throw new Error('Payment was not completed.');
      if (Math.abs(Number(verified.orderAmount || 0) - totalAmount) > 0.01) {
        throw new Error('Payment amount could not be verified. Please contact admin.');
      }
      const payType = isResellerUnlock ? 'reseller' : 'deposit';
      const id = await createGatewayPaymentRequest(session.uid, creditAmount, totalAmount, order.orderId, profile.name || profile.phone, payType);
      setPendingId(id);
      setGatewayAutoCredited(true);
      setStep('pending');
      toast.success(`${money(creditAmount)} added to your wallet.`);
    } catch (err) {
      toast.error(err.message || 'Gateway payment failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitDeposit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const payType = isResellerUnlock ? 'reseller' : 'deposit';
      const id = await createPaymentRequest(session.uid, amount, senderUpi, profile.name || profile.phone, payType);
      setPendingId(id);
      setStep('pending');
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const goBack = () => navigate('/');

  return (
    <main className="dashboard-page">
      <img className="dashboard-backdrop" src="/dashboard-dark-bg.webp" alt="" aria-hidden="true" loading="lazy" />
      <div className="dashboard-veil" />
      <div className="dash-content no-header">

        {/* Step: amount */}
        {step === 'amount' && (
          <div className="deposit-page">
            <div className="deposit-page-header">
              <button className="back-link emoji-back mb-[5px]" onClick={goBack}>
                <DeviceIcon emoji="/icons/new/back-arrow-emoji.json" icon="arrow_back" size={26} />
              </button>
              <h2>{isResellerUnlock ? 'Unlock Reseller Panel' : 'Add funds'}</h2>
            </div>
            {/* Reseller unlock banner — only when not already a reseller */}
            {paySettings.resellerPrice > 0 && profile?.role !== 'reseller' && !isResellerUnlock && (
              <div className="reseller-unlock-banner glass-card">
                <div className="reseller-unlock-header">
                  <MatIcon name="verified_user" size={28} style={{ color: '#c795ff' }} />
                  <h3>Unlock Reseller <span className="reseller-badge">RESELLER</span></h3>
                </div>
                <p className="muted">Get discounted prices on all products &amp; start reselling today!</p>
                <button className="reseller-unlock-btn" type="button" onClick={() => { setIsResellerUnlock(true); setAmount(String(paySettings.resellerPrice)); }}>
                  <MatIcon name="lock_open" size={16} /> Unlock for <MoneyDisplay value={paySettings.resellerPrice} />
                </button>
              </div>
            )}
            <div className="deposit-page-card">
              {isResellerUnlock ? (
                <>
                  <p className="muted deposit-label"><MatIcon name="verified_user" size={20} /> Reseller unlock payment</p>
                  <div className="reseller-unlock-summary">
                    <p>Pay <strong><MoneyDisplay value={paySettings.resellerPrice} /></strong> to upgrade your account to <strong>Reseller</strong>.</p>
                    <p className="muted" style={{fontSize:12}}>Admin will verify your payment and activate reseller privileges.</p>
                  </div>
                  <button className="deposit-proceed-btn" type="button" onClick={openPaymentMethod}>
                    <DeviceIcon emoji="/icons/new/proceed-emoji.json" icon="arrow_forward" size={18} /> Proceed to pay <MatIcon name="arrow_forward" size={17} />
                  </button>
                </>
              ) : (
                <>
                  <p className="muted deposit-label"><DeviceIcon emoji="/icons/new/choose-amount-emoji.json" icon="attach_money" size={18} /> Choose amount</p>
                  <div className="quick-amounts">
                    {quickAmounts.map(a => (
                      <button key={a} type="button" className={`quick-chip${amount == a ? ' active' : ''}`} onClick={() => setAmount(String(a))}>
                        <MoneyDisplay value={a} />
                      </button>
                    ))}
                  </div>
                  <p className="muted deposit-hint"><DeviceIcon emoji="/icons/new/min-deposit-emoji.json" icon="monetization_on" size={16} /> Min. deposit: <MoneyDisplay value={paySettings.minDeposit} /></p>
                   {paySettings.gatewayEnabled && (
                     <p className="muted deposit-hint gateway-fee-hint">
                       Gateway charge: <strong>{paySettings.gatewayFee || 0}%</strong>
                       {amount && <> · Pay <strong><MoneyDisplay value={gatewayTotalAmount} /></strong> to add <strong><MoneyDisplay value={amount} /></strong> wallet credit</>}
                     </p>
                   )}
                  <hr className="deposit-divider" />
                  <form onSubmit={handleAmountNext}>
                    <label htmlFor="dep-amount"><DeviceIcon emoji="/icons/new/custom-amount-emoji.json" icon="edit" size={16} /> <DeviceIcon emoji="/icons/new/rupee-emoji.json" icon="currency_rupee" size={16} /> Custom amount</label>
                    <input id="dep-amount" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={'Min ' + money(paySettings.minDeposit)} required />
                    <button className="deposit-proceed-btn" type="submit">
                      <DeviceIcon emoji="/icons/new/proceed-emoji.json" icon="arrow_forward" size={18} /> Proceed to pay <MatIcon name="arrow_forward" size={17} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {step === 'method' && (
          <div className="payment-method-backdrop">
            <section className="payment-method-dialog liquid-dialog">
              <div className="dialog-title-row">
                <DeviceIcon emoji="/icons/new/confirm-payment.json" icon="payment" size={26} />
                <h2>How do you want to pay?</h2>
              </div>
              <p className="muted">Choose a payment method for your wallet top-up.</p>
              <div className="payment-summary">
                <div>
                  <span>Wallet credit</span>
                  <strong><MoneyDisplay value={amount} /></strong>
                </div>
                <div className="payment-summary-note">
                  <span>UPI <b>₹0 fee</b></span>
                  <span>Gateway <b>{paySettings.gatewayFee || 0}%</b></span>
                </div>
              </div>
              <div className="payment-method-options">
                <button type="button" className="payment-method-option" onClick={() => setStep('qr')}>
                  <DeviceIcon emoji="/icons/new/bank-emoji.json" icon="account_balance" size={26} />
                  <span><strong>UPI</strong><small>No extra charge · Pay <b><MoneyDisplay value={amount} /></b> · QR, GPay, PhonePe or Paytm</small></span>
                  <MatIcon name="arrow_forward" size={18} />
                </button>
                <button type="button" className="payment-method-option gateway" onClick={startGatewayPayment} disabled={busy}>
                  <DeviceIcon emoji="/icons/new/verified-badge.json" icon="credit_card" size={26} />
                  <span><strong>Cashfree Gateway</strong><small>{paySettings.gatewayFee || 0}% charge = <b><MoneyDisplay value={gatewayFeeAmount} /></b> · Pay <b><MoneyDisplay value={gatewayTotalAmount} /></b></small></span>
                  <MatIcon name="arrow_forward" size={18} />
                </button>
              </div>
              <button type="button" className="back-link" onClick={() => setStep('amount')} disabled={busy}>
                <MatIcon name="arrow_back" size={16} /> Change amount
              </button>
            </section>
          </div>
        )}

        {/* Step: QR */}
        {step === 'qr' && (
          <div className="deposit-page">
            <div className="deposit-page-header">
              <button className="back-link emoji-back mb-[5px]" onClick={() => setStep('amount')}>
                <DeviceIcon emoji="/icons/new/back-arrow-emoji.json" icon="arrow_back" size={26} />
              </button>
              <h2>Scan &amp; Pay</h2>
            </div>
            <p className="deposit-label"><DeviceIcon emoji="/icons/new/send-emoji.json" icon="send" size={16} /> Send exactly <strong><MoneyDisplay value={amount} /></strong> to:</p>
            <p className="upi-id-display"><DeviceIcon emoji="/icons/new/bank-emoji.json" icon="account_balance" size={18} /> {paySettings.upiId}</p>
            {qrUrl && (
              <div className="qr-wrap">
                <img className="qr-image" src={qrUrl} alt="UPI QR code" />
                <button type="button" className="qr-dl-btn" onClick={downloadQR}>
                  <DeviceIcon emoji="/icons/new/download-emoji.json" icon="download" size={16} /> Download QR
                </button>
              </div>
            )}
            <div className="upi-apps-row">
              <a href={upiPayLink('gpay')} className="upi-app-btn gpay">
                <SiGooglepay size={26} /> GPay
              </a>
              <a href={upiPayLink('phonepe')} className="upi-app-btn phonepe">
                <SiPhonepe size={20} /> PhonePe
              </a>
              <a href={upiPayLink('paytm')} className="upi-app-btn paytm">
                <SiPaytm size={20} /> Paytm
              </a>
            </div>
            <p className="muted qr-hint"><LottieIcon src="/icons/new/qr-hint-emoji.json" size={16} /> Tap an app to pay directly, or scan the QR above <LottieIcon src="/icons/new/qr-hint-emoji.json" size={16} /></p>
            <button className="deposit-paid-btn" type="button" onClick={() => setStep('confirm')}>
              I have paid <DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={24} />
            </button>
          </div>
        )}

        {/* Step: confirm */}
        {step === 'confirm' && (
          <div className="deposit-page">
            <div className="deposit-page-header">
              <button className="back-link emoji-back mb-[5px]" onClick={() => setStep('qr')}>
                <DeviceIcon emoji="/icons/new/back-arrow-emoji.json" icon="arrow_back" size={26} />
              </button>
              <h2>{isResellerUnlock ? 'Confirm Reseller Unlock' : 'Confirm payment'}</h2>
            </div>
            <p className="deposit-label">Enter your UPI transaction UTR number so admin can verify your payment.</p>
            <form onSubmit={submitDeposit}>
              <label htmlFor="sender-upi">{isResellerUnlock ? 'UTR number for reseller payment' : 'UTR / UPI transaction ID'}</label>
              <input id="sender-upi" value={senderUpi} onChange={e => setSenderUpi(e.target.value)} placeholder="Enter UTR number" required />
              <p className="muted qr-hint">Amount: <strong><MoneyDisplay value={amount} /></strong> → {paySettings.upiId}</p>
              {isResellerUnlock && <p className="muted reseller-confirm-hint">Your account will be upgraded to <strong>Reseller</strong> after admin approval.</p>}
              <button className="deposit-proceed-btn" type="submit" disabled={busy}>
                {busy ? 'Submitting…' : <><MatIcon name="check" size={17} /> Submit</>}
              </button>
            </form>
          </div>
        )}

        {/* Step: pending */}
        {step === 'pending' && (
          <div className="deposit-page">
            <div className="deposit-page-header">
              <h2>Request submitted</h2>
            </div>
            <div className="deposit-page-card pending">
              <p className="muted">{gatewayAutoCredited
                ? <><strong><MoneyDisplay value={amount} /></strong> has been added to your wallet instantly via Cashfree.</>
                : <>Your deposit of <strong><MoneyDisplay value={amount} /></strong> is pending admin approval.</>}</p>
              <p className="muted">Request ID: <strong className="pending-id">{pendingId}</strong></p>
              <button className="deposit-proceed-btn" type="button" onClick={goBack}>
                <MatIcon name="close" size={17} /> Close
              </button>
            </div>
          </div>
        )}

        <Toaster position="top-center" offset={78} theme="dark" toastOptions={toastOptions} />
      </div>
    </main>
  );
}

/* ── Simple router — history.pushState based ──────────────────── */
function usePathname() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);
  return path;
}

function navigate(to) {
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/* ── App root ───────────────────────────────────────────────────── */
function App() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [siteStatus, setSiteStatus] = useState({ status: 'operational', message: '' });
  const [perfMode, setPerfMode] = useState(() => {
    if (localStorage.getItem('perf_dont_ask') === '1') return localStorage.getItem('perf_mode') || 'high';
    return null;
  });
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_session') || 'null'); } catch { return null; }
  });
  const path = usePathname();
  const knownPath = path === '/' || path === '/admin' || path === '/add-fund' || path === '/low' || path === '/low/';

  useEffect(() => { initSecurity(); }, []);

  useEffect(() => {
    getSiteStatus().then(setSiteStatus).catch(() => {});
    const interval = setInterval(() => { getSiteStatus().then(setSiteStatus).catch(() => {}); }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const upd = () => setOnline(navigator.onLine);
    window.addEventListener('online', upd);
    window.addEventListener('offline', upd);
    return () => { window.removeEventListener('online', upd); window.removeEventListener('offline', upd); };
  }, []);

  /* ── Register Service Worker ── */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const updateSession = next => { localStorage.setItem('app_session', JSON.stringify(next)); setSession(next); };
  const logout = () => { localStorage.removeItem('app_session'); setSession(null); };

  useEffect(() => {
    let active = true;
    getGoogleRedirectResult()
      .then(async result => {
        if (!active || !result?.user) return;
        const user = await ensureGoogleUser(result.user);
        if (active) updateSession(user);
      })
      .catch(error => {
        if (active) toast.error(error?.message || 'Google login could not be completed.');
      });
    return () => { active = false; };
  }, []);

  const perfValue = perfMode || 'high';
  if (!online) return <PerfCtx.Provider value={perfValue}><ErrorTv mode="offline" /></PerfCtx.Provider>;
  if (!knownPath) return <PerfCtx.Provider value={perfValue}><ErrorTv mode="404" /></PerfCtx.Provider>;
  if (!session) return <PerfCtx.Provider value={perfValue}><Login onSuccess={updateSession} siteStatus={siteStatus} /><Toaster position="top-center" offset={78} theme="dark" toastOptions={toastOptions} /></PerfCtx.Provider>;
  if (path === '/admin') return <PerfCtx.Provider value={perfValue}><AdminPage session={session} onSessionChange={updateSession} /></PerfCtx.Provider>;
  if (path === '/add-fund') return <PerfCtx.Provider value={perfValue}><AddFundPage session={session} onSessionChange={updateSession} /></PerfCtx.Provider>;
  return (
    <PerfCtx.Provider value={perfValue}>
      <Dashboard
        session={session}
        onSessionChange={updateSession}
        onLogout={logout}
        siteStatus={siteStatus}
        perfMode={perfMode}
        onPerfSelect={setPerfMode}
      />
    </PerfCtx.Provider>
  );
}

/* ── Error TV ───────────────────────────────────────────────────── */
function ErrorTv({ mode }) {
  const is404 = mode === '404';
  return (
    <main className={`error-page${is404 ? ' not-found-mode' : ' offline-mode'}`}>
      <div className="error-stars" />
      <section className="retro-tv-wrap" aria-label={is404 ? '404 page' : 'Network error'}>
        <div className="retro-tv-main">
          <div className="retro-antenna">
            <div className="retro-antenna-shadow" />
            <div className="retro-a1" /><div className="retro-a1d" />
            <div className="retro-a2" /><div className="retro-a2d" />
          </div>
          <div className="retro-tv">
            <div className="retro-curve">
              <svg className="retro-curve-svg" viewBox="0 0 189.929 189.929" aria-hidden="true">
                <path d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13 C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z" />
              </svg>
            </div>
            <div className="retro-display">
              <div className="retro-screen-out">
                <div className="retro-screen-inner">
                  <div className={is404 ? 'retro-screen retro-screen-bars' : 'retro-screen'}>
                    <span className="retro-screen-text">{is404 ? 'NOT FOUND' : 'Check Your Network :('}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="retro-lines"><div /><div /><div /></div>
            <div className="retro-buttons">
              <div className="retro-b1"><div /></div>
              <div className="retro-b2" />
              <div className="retro-speakers">
                <div className="retro-g1"><div /><div /><div /></div>
                <div className="retro-g" /><div className="retro-g" />
              </div>
            </div>
          </div>
          <div className="retro-bottom"><div /><div /><div /></div>
        </div>
        {is404 && <div className="text-404"><span>4</span><span>0</span><span>4</span></div>}
      </section>
      <div className="error-copy">
        <img src={logo} alt="Brand logo" />
        <h1>{is404 ? 'Page not found' : 'You are offline'}</h1>
        <p>{is404 ? 'This route does not exist. Go back to the main app.' : 'Please check your internet connection and try again.'}</p>
        <button className="buy-product error-action" onClick={() => is404 ? window.location.assign('/') : window.location.reload()}>
          {is404 ? 'Go Home' : 'Retry'}
        </button>
      </div>
    </main>
  );
}

/* ── ResellerBenefitsDialog ─────────────────────────────────────── */
function ResellerBenefitsDialog({ resellerPrice, onUnlock, onClose }) {
  const [visible, setVisible] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    if (dontShow) localStorage.setItem('reseller_dont_show', '1');
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const benefits = [
    { emoji: 'crown.json', label: 'Discounted prices', desc: 'Get exclusive lower prices on all products compared to regular users.' },
    { emoji: 'shopping-cart.json', label: 'Resell & earn', desc: 'Purchase at reseller prices and sell to others at your own markup.' },
    { emoji: 'gift-code.json', label: 'Bulk purchasing', desc: 'Buy in bulk quantities with special bulk pricing tiers.' },
    { emoji: 'shield-verify.json', label: 'Priority support', desc: 'Get faster response times and dedicated priority support.' },
    { emoji: 'active-keys.json', label: 'Early access', desc: 'Be first to access new products before they launch publicly.' },
    { emoji: 'verified-badge.json', label: 'Reseller badge', desc: 'Stand out with an exclusive reseller badge on your profile.' },
  ];

  return (
    <div className={`reseller-benefits-backdrop ${visible ? 'visible' : ''}`} role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <section className={`reseller-benefits-dialog ${visible ? 'visible' : ''}`}>
        <button className="reseller-benefits-close" onClick={handleClose} aria-label="Close">
          <DeviceIcon emoji="/icons/new/close-emoji.json" icon="close" size={16} />
        </button>

        <div className="reseller-benefits-header">
          <DeviceIcon emoji="/icons/new/verified-badge.json" icon="verified_user" size={40} />
          <h2>Reseller Panel</h2>
          <span className="reseller-badge" style={{fontSize:11,padding:'3px 12px'}}>PREMIUM</span>
        </div>

        <p className="muted reseller-benefits-subtitle">
          Upgrade to reseller and unlock premium privileges.
        </p>

        <div className="reseller-benefits-list">
          {benefits.map((b, i) => (
            <div key={i} className="reseller-benefit-item" style={{animationDelay: `${0.1 + i * 0.05}s`}}>
              <div className="reseller-benefit-icon">
                <LottieIcon src={`/icons/new/${b.emoji}`} size={24} />
              </div>
              <div className="reseller-benefit-text">
                <strong>{b.label}</strong>
                <p className="muted">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="reseller-benefits-footer">
          <label className="reseller-dont-show" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} />
            Don't show again
          </label>
          <button className="reseller-unlock-btn" onClick={onUnlock}>
            <DeviceIcon emoji="/icons/new/verified-check.json" icon="check_circle" size={20} />
            {resellerPrice > 0 ? `Unlock for ${money(resellerPrice)}` : 'Unlock now'}
          </button>
          <p className="muted" style={{fontSize:11,marginTop:6}}>One-time payment · No recurring fees</p>
        </div>
      </section>
    </div>
  );
}

export default App;
