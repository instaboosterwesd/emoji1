import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { createRoot } from 'react-dom/client';
import { FcGoogle } from 'react-icons/fc';
import { SiGooglepay, SiPhonepe, SiPaytm } from 'react-icons/si';
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
  adminSaveReseller,
  adminSaveUpi,
  adminUpdateUser,
  adminDeleteLicenseKey,
  adminUpdatePaymentRequest,
  fetchGameProducts,
  getAdminOverview,
  getPaymentSettings,
  createPaymentRequest,
  getUserTransactions,
  getUserLicenseKeys,
  getAdminPricingRules,
  adminAddManualKey,
  adminDeleteManualKey,
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

/* ── Brand icon map ─────────────────────────────────────────────── */
const productBrandIcons = [
  { test: n => /apk mc/i.test(n), icon: '/icons/brands/apk-mc.png' },
  // { test: n => /ios cloud codm/i.test(n), icon: '/icons/brands/ios-cloud-codm.png' },
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
const productIconFor = name => productBrandIcons.find(b => b.test(name || ''))?.icon || '/icons/new/product-box.png';

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
          <LottieIcon src="/icons/new/verified-check.json" size={18} />
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
            <p className="eyebrow"><LottieIcon src="/icons/new/shield-verify.json" size={20} /> SECURE VERIFICATION <LottieIcon src="/icons/new/shield-verify.json" size={20} /></p>
            <h1><LottieIcon src="/icons/new/otp-clipboard.json" size={28} /> Enter your OTP</h1>
            <p className="intro">We sent a 4-digit code to +{country.dialCode} {phone}.</p>
            <form onSubmit={verifyOtp}>
              <label htmlFor="otp">Verification code</label>
              <input className="otp-input" id="otp" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} placeholder="0000" autoFocus required />
              <button className="primary" type="submit"><LottieIcon src="/icons/new/verified-check.json" size={22} /> Verify &amp; continue <MatIcon name="arrow_forward" size={19} /></button>
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

/* ── Dashboard shell ────────────────────────────────────────────── */
function Dashboard({ session, onSessionChange, onLogout, siteStatus, perfMode, onPerfSelect }) {
  const [tab, setTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [dialog, setDialog] = useState(null);
  const [profile, setProfile] = useState(session);
  const [apiState, setApiState] = useState({ apiKey: '', last4: session.apiKeyLast4 || '' });
  const [purchase, setPurchase] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [resolvedNotif, setResolvedNotif] = useState(null);

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

  const openNotifs = () => {
    setShowNotifs(true);
    setHasUnread(false);
    localStorage.setItem('notif_seen_at', String(Date.now()));
  };

  useEffect(() => { setPageLoading(false); }, [tab]);

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
    tab === 'orders' ? <OrdersView session={session} /> :
    tab === 'buy' ? <ProductsView session={session} onBuy={setPurchase} /> :
    tab === 'wallet' ? <WalletView session={session} profile={profile} refreshProfile={refreshProfile} /> :
    tab === 'profile' ? <ProfileView profile={profile} openDialog={setDialog} openApi={openApi} /> :
    <DashboardHome profile={profile} role={profile.role} setTab={setTab} />;

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
          <LottieIcon src="/icons/new/verified-check.json" size={18} />
          <span>{siteStatus.message}</span>
        </div>
      )}
      <div key={`${tab}-${pageLoading}`} className={`dash-content tab-motion${tab === 'dashboard' ? '' : ' no-header'}`}>
        {pageLoading ? <PageSkeleton tab={tab} /> : section}
      </div>
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
              <button className="notif-close-btn" onClick={() => setShowNotifs(false)}><LottieIcon src="/icons/new/close-emoji.json" size={16} /></button>
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
            <h2><LottieIcon src="/icons/new/verified-badge.json" size={22} /> Issue Resolved!</h2>
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
                <LottieIcon src="/icons/new/shopping-cart.json" size={18} /> Buy now
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
      <PurchaseDialog purchase={purchase} session={session} close={() => setPurchase(null)} onPurchased={refreshProfile} />
      <Toaster position="top-center" offset={78} theme={theme} toastOptions={toastOptions} icons={{ success: <LottieIcon src="/icons/new/verified-check.json" size={22} /> }} />
    </main>
  );
}

/* ── DashboardHome ──────────────────────────────────────────────── */
function DashboardHome({ profile, role, setTab }) {
  return (
    <>
      <SectionTitle title={<><LottieIcon src="/icons/new/shop-store.json" size={26} /> Dashboard</>} subtitle={<>Here's what is happening today <LottieIcon src="/icons/new/today-emoji.json" size={18} /></>} />
      <div className="balance-card">
        <span>My balance</span>
        <strong className="balance-amount"><LottieIcon src="/icons/new/balance-emoji.json" size={22} /><span>₹{money(profile.balance)}</span></strong>
        <button className="add-funds has-lottie" onClick={() => setTab('wallet')}>
          <LottieIcon src="/icons/new/add-funds-plus.json" size={22} /> Deposit
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
          <LottieIcon src="/icons/new/crown.json" size={22} /> Open admin dashboard
        </button>
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

/* ── LottieIcon — plays a Lottie JSON animation inline ─────────── */
function LottieIcon({ src, size = 24, loop = true, className = '' }) {
  const perf = usePerf();
  const ref = useRef(null);
  useEffect(() => {
    if (perf !== 'high' || !ref.current) return;
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: 'svg',
      loop,
      autoplay: true,
      path: src,
    });
    return () => anim.destroy();
  }, [src, loop, perf]);
  return (
    <span
      ref={ref}
      className={className}
      style={{ display: 'inline-block', width: size, height: size, verticalAlign: 'middle' }}
    />
  );
}

/* ── PerformanceDialog — first-visit device picker ─────────────── */
function PerformanceDialog({ onSelect }) {
  const [dontAsk, setDontAsk] = useState(false);

  const pick = mode => {
    localStorage.setItem('perf_mode', mode);
    if (dontAsk) localStorage.setItem('perf_dont_ask', '1');
    onSelect(mode);
  };

  return (
    <div className="perf-dialog-backdrop">
      <div className="perf-dialog liquid-dialog">
        <div className="perf-dialog-icon">⚡</div>
        <h2>Choose your experience</h2>
        <p className="perf-dialog-desc">
          Select your device performance level for the best experience.
        </p>
        <div className="perf-dialog-options">
          <button className="perf-option perf-high" onClick={() => pick('high')}>
            <span className="perf-option-icon">🚀</span>
            <div>
              <strong>High Performance Device</strong>
              <span className="perf-option-desc">Full animations &amp; effects</span>
            </div>
          </button>
          <button className="perf-option perf-low" onClick={() => pick('low')}>
            <span className="perf-option-icon">📱</span>
            <div>
              <strong>Low Performance Device</strong>
              <span className="perf-option-desc">Static icons, smoother browsing</span>
            </div>
          </button>
        </div>
        <label className="perf-dont-ask">
          <input type="checkbox" checked={dontAsk} onChange={e => setDontAsk(e.target.checked)} />
          <span>Don&apos;t ask again</span>
        </label>
      </div>
    </div>
  );
}

/* ── WalletView — wallet home page ──────────────────────────────── */
function WalletView({ session, profile, refreshProfile }) {
  const [paySettings, setPaySettings] = useState({ upiId: '', minDeposit: 50 });
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

  const txIcon = type => {
    if (type === 'deposit_approved') return 'add_circle';
    if (type === 'purchase') return 'shopping_cart';
    if (type?.includes('admin')) return 'admin_panel_settings';
    return 'receipt_long';
  };

  const txColor = type => {
    if (type === 'deposit_approved' || type === 'admin_add') return '#4ade80';
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
          <LottieIcon src="/icons/new/add-funds-plus.json" size={22} /> Add funds
        </button>
      </div>

      {/* ── Transaction history ── */}
      <div className="glass-card">
        <div className="card-heading history-heading">
          <div className="heading-title-row">
            <LottieIcon src="/icons/new/history-title-emoji.json" size={26} />
            <div><h3>Transaction history</h3><p className="muted">All deposits and purchases</p></div>
          </div>
          <button className="icon-button" onClick={loadData} aria-label="Refresh">
            <LottieIcon src="/icons/new/history-emoji.json" size={26} />
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
                        ? <img src={productIconFor((tx.note || '').split('·')[0].trim())} style={{width:24,height:24,objectFit:'contain',borderRadius:7}} alt="" />
                        : tx.type === 'deposit_approved'
                          ? <LottieIcon src="/icons/new/add-funds-plus.json" size={22} />
                          : tx.type === 'admin_add'
                            ? <LottieIcon src="/icons/new/topup-emoji.json" size={22} />
                            : <MatIcon name={txIcon(tx.type)} size={18} style={{ filter: 'invert(0.8)' }} />}
                    </span>
                    <div className="tx-main">
                      <strong>{tx.note || tx.type || 'Transaction'}</strong>
                      <span>{fmtDate(tx.createdAt)}</span>
                    </div>
                    <b className="tx-amount" style={{ color: txColor(tx.type) }}>
                      {(tx.type === 'deposit_approved' || tx.type === 'admin_add') ? '+' : '-'}<MoneyDisplay value={tx.amount} />
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
function OrdersView({ session }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserLicenseKeys(session.uid);
      setKeys(data);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [session.uid]);

  useEffect(() => { load(); }, [load]);

  const filtered = keys.filter(k =>
    `${k.productName || k.product || ''} ${k.duration || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  if (selected) {
    return (
      <>
        <button className="back-link" onClick={() => setSelected(null)}><MatIcon name="arrow_back" size={16} /> Back to orders</button>
        <SectionTitle title={selected.productName || selected.product || 'Order'} subtitle="Complete order details" />
        <div className="glass-card detail-card">
          <Detail label="Product" icon={productIconFor(selected.productName || selected.product)} value={selected.productName || selected.product || '—'} />
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
        </div>
      </>
    );
  }

  return (
    <>
      <SectionTitle title={<><LottieIcon src="/icons/new/my-orders.json" size={26} /> My Orders</>} subtitle={<><LottieIcon src="/icons/new/track-emoji.json" size={16} /> Track your purchased license keys</>} />
      <div className="filter-row">
        <div className="search-box">
          <LottieIcon src="/icons/new/search-emoji.json" size={18} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search orders" />
        </div>
        <button className="icon-button" onClick={load} aria-label="Refresh orders"><LottieIcon src="/icons/new/refresh-emoji.json" size={22} /></button>
      </div>
      <div className="glass-card">
        {loading
          ? <p className="muted empty-state">Loading…</p>
          : filtered.length === 0
            ? <p className="muted empty-state">No orders yet. Buy a product to get started.</p>
            : filtered.map(k => (
              <button className="order-button" key={k.id} onClick={() => setSelected(k)}>
                <div className="order-row">
                  <div className="order-icon has-brand-img"><img src={productIconFor(k.productName || k.product)} style={{width:30,height:30,objectFit:'contain',borderRadius:9}} alt="" /></div>
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
function ProductsView({ session, onBuy }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [pricingRules, setPricingRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);
  const [pricingOpen, setPricingOpen] = useState({});
  const [expandedFeatures, setExpandedFeatures] = useState({});
  const [visibleCount, setVisibleCount] = useState(3);

  const applyPricing = useCallback((product) => {
    return {
      ...product,
      pricing: product.pricing.map(item => {
        const key = `${product.pid}_${(item.duration || item.label || '').trim().replace(/[^a-z0-9]+/gi, '_')}`;
        const rule = pricingRules[key];
        if (!rule) return item;
        const basePrice = Number(item.price || 0);
        let finalPrice = basePrice;
        if (rule.price !== '' && rule.price !== undefined && rule.price !== null) finalPrice = Number(rule.price);
        else if (rule.percent !== '' && rule.percent !== undefined && rule.percent !== null) finalPrice = Math.round(basePrice * (1 + Number(rule.percent) / 100));
        return { ...item, price: finalPrice, originalPrice: basePrice };
      }),
    };
  }, [pricingRules]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [prods, rules] = await Promise.all([
        fetchGameProducts(),
        getAdminPricingRules().catch(() => ({})),
      ]);
      setPricingRules(rules);
      setProducts(prods);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const games = useMemo(() => ['all', ...new Set(products.map(p => p.game).filter(Boolean))], [products]);

  const filtered = useMemo(() => products.filter(p => {
    const hay = `${p.name} ${p.pid} ${p.game} ${p.platform}`.toLowerCase();
    const matchSearch = hay.includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.game === filter;
    const typeText = `${p.name} ${p.game} ${p.platform} ${p.features.join(' ')}`.toLowerCase();
    const matchPlatform = platformFilter === 'all'
      || (platformFilter === 'nonroot' && (typeText.includes('nonroot') || typeText.includes('non root') || typeText.includes('non-root')))
      || (platformFilter === 'root' && typeText.includes('root') && !(typeText.includes('nonroot') || typeText.includes('non root')))
      || (platformFilter === 'pc' && typeText.includes('pc'))
      || (platformFilter === 'ios' && (typeText.includes('ios') || typeText.includes('iphone')));
    return matchSearch && matchFilter && matchPlatform;
  }), [products, search, filter, platformFilter]);

  useEffect(() => { setVisibleCount(5); }, [search, filter, platformFilter]);

  const visibleProducts = filtered.slice(0, visibleCount).map(applyPricing);

  return (
    <>
      <SectionTitle title={<><LottieIcon src="/icons/new/shopping-cart.json" size={26} /> Buy Products</>} subtitle="Live products with pricing" />
      <div className="filter-row product-filter">
        <div className="search-box">
          <LottieIcon src="/icons/new/search-emoji.json" size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or PID" />
        </div>
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
        <button className="icon-button" onClick={load} aria-label="Refresh"><MatIcon name="refresh" size={17} /></button>
      </div>
      <div className="product-list">
        {loading && <ProductSkeletonList />}
        {!loading && error && <div className="glass-card"><p className="muted empty-state">{error}</p></div>}
        {!loading && !error && !filtered.length && <div className="glass-card"><p className="muted empty-state">No products found</p></div>}
        {visibleProducts.map(product => {
          const duration = product.pricing[0];
          const available = product.pricing.length > 0;
          const shownFeatures = expandedFeatures[product.pid] ? product.features : product.features.slice(0, 3);
          return (
            <article className="glass-card product-card" key={product.pid}>
              <div className="product-media">
                {playingVideo === product.pid && product.videos[0] ? (
                  <video src={product.videos[0]} controls autoPlay playsInline poster={product.image || undefined} />
                ) : (
                  <button className="video-thumb" type="button" onClick={() => product.videos[0] ? setPlayingVideo(product.pid) : null}>
                    {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <div className="product-media-fallback"><MatIcon name="shopping_bag" size={30} style={{ filter: 'invert(0.5)' }} /></div>}
                    {product.videos[0] && <span className="play-badge"><LottieIcon src="/icons/new/play-emoji.json" size={54} /></span>}
                  </button>
                )}
              </div>
              <div className={`product-head${product.features.length > 3 ? ' has-toggle' : ''}${expandedFeatures[product.pid] ? ' expanded' : ''}`}>
                <div className="product-icon"><img src={productIconFor(product.name)} alt="" /></div>
                <div><h3>{product.name}</h3><p className="muted">{product.game} · {product.platform || 'Platform'} · ID {product.pid}</p></div>
                {product.features.length > 3 && <button className="feature-toggle" type="button" onClick={() => setExpandedFeatures(s => ({ ...s, [product.pid]: !s[product.pid] }))} aria-label="Toggle features">{expandedFeatures[product.pid] ? <LottieIcon src="/icons/new/arrows-up-green.json" size={20} /> : <LottieIcon src="/icons/new/phone-arrow.json" size={20} />}</button>}
              </div>
              {product.features.length > 0 && (
                <div className="feature-list">
                  {shownFeatures.map((f) => {
                    const featIcons = [
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
                    const hash = (product.pid + f).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
                    return <div key={`${product.pid}-${f}`}><span><LottieIcon src={featIcons[hash % featIcons.length]} size={15} /></span>{f}</div>;
                  })}
                </div>
              )}
              <button className="primary buy-product" type="button" disabled={!available} onClick={() => setPricingOpen(s => ({ ...s, [product.pid]: !s[product.pid] }))}>
                <LottieIcon src="/icons/new/buy-now-btn.json" size={22} /> Buy Now <MatIcon name="arrow_forward" size={17} />
              </button>
              {available && pricingOpen[product.pid] && (
                <div className="duration-grid pricing-drop">
                  {product.pricing.slice(0, 8).map(item => (
                    <button
                      className={duration?.label === item.label ? 'active' : ''}
                      key={`${product.pid}-${item.label}`}
                      onClick={() => { setPricingOpen(s => ({ ...s, [product.pid]: false })); onBuy({ product, duration: item }); }}
                    >
                      <span className="duration-label-row"><LottieIcon src="/icons/new/timer.json" size={18} />{item.label}</span>
                      <b><MoneyDisplay value={item.price} /></b>
                      {item.originalPrice && item.originalPrice !== item.price && <s className="original-price"><MoneyDisplay value={item.originalPrice} /></s>}
                    </button>
                  ))}
                </div>
              )}
              {!available && <p className="muted empty-state product-empty">Pricing unavailable</p>}
            </article>
          );
        })}
        {!loading && !error && visibleCount < filtered.length && (
          <button className="load-more glass-card" type="button" onClick={() => setVisibleCount(c => c + 3)}>Load more products</button>
        )}
      </div>
    </>
  );
}

/* ── PurchaseDialog — real purchaseProduct() ────────────────────── */
function PurchaseDialog({ purchase, session, close, onPurchased }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { key, source }

  if (!purchase) return null;
  const { product, duration } = purchase;

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await purchaseProduct(
        session.uid,
        product,
        duration,
        duration.price,
        session.name || session.phone || session.uid,
      );
      setResult(res);
      toast.success('Purchase successful!', { description: `${product.name} · ${duration.duration || duration.label}` });
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
              <MatIcon name="check_circle" size={26} style={{ filter: 'invert(70%) sepia(1) saturate(3) hue-rotate(85deg)' }} />
              <h2>Order placed!</h2>
            </div>
            <p className="muted dialog-sub">{product.name} · {duration.duration || duration.label}</p>
            <div className="key-reveal-box">
              <label>Your license key</label>
              <code>{result.key}</code>
              <button type="button" className="copy-key-btn" onClick={() => { navigator.clipboard.writeText(result.key); toast.success('Key copied!'); }}>
                <MatIcon name="content_copy" size={15} /> Copy key
              </button>
            </div>
            <p className="muted" style={{ fontSize: '0.75rem' }}>Source: {result.source === 'manual' ? 'Manual key (admin-provided)' : 'Reseller API'}</p>
            <div className="modal-btn-row" style={{ justifyContent: 'center' }}>
              <button className="modal-save" type="button" onClick={handleClose}><MatIcon name="check" size={17} /> Done</button>
            </div>
          </>
        ) : (
          <>
            <h2><LottieIcon src="/icons/new/confirm-buy-emoji.json" size={24} /> Confirm purchase</h2>
            <div className="purchase-summary">
              <div className="purchase-title">
                <span>Selected product</span>
                <strong>{product.name}</strong>
                <small>PID {product.pid}</small>
              </div>
              <img src={productIconFor(product.name)} alt="" />
            </div>
            <div className="purchase-meta-grid">
              <div><span><img src="/icons/new/game-logo.webp" style={{width:18,height:18,objectFit:'contain',verticalAlign:'middle',marginRight:3}} alt="" /> Game</span><strong>{product.game || 'Product'}</strong></div>
              <div><span><LottieIcon src="/icons/new/timer.json" size={18} /> Duration</span><strong>{duration.duration || duration.label}</strong></div>
              <div><span><LottieIcon src="/icons/new/money-bag.json" size={18} /> Price</span><strong><MoneyDisplay value={duration.price} /></strong></div>
              <div><span><LottieIcon src="/icons/new/platform-emoji.json" size={18} /> Platform</span><strong>{product.platform || 'Access key'}</strong></div>
            </div>
            <p className="purchase-note"><LottieIcon src="/icons/new/pig-emoji.json" size={18} /> Balance will be deducted. A key will be delivered instantly.</p>
            <div className="modal-btn-row">
              <button type="button" onClick={close} disabled={busy}><LottieIcon src="/icons/new/close-emoji.json" size={18} /> Cancel</button>
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
function ProfileView({ profile, openDialog, openApi }) {
  const [giftOpen, setGiftOpen] = useState(false);
  return (
    <>
      <SectionTitle title={<><LottieIcon src="/icons/new/profile-lottie.json" size={26} /> Profile</>} subtitle="Manage your account" />
      <div className="glass-card profile-card">
        <img src={profile.photoData || logo} alt="Profile" />
        <div>
          <h3 style={{display:'flex',alignItems:'center',gap:'6px'}}>{profile.name || 'Account holder'}<LottieIcon src="/icons/new/verified-badge.json" size={22} /></h3>
          <p className="muted">{profile.email || profile.phone || 'Verified account'}</p>
          <p className="muted">Balance <MoneyDisplay value={profile.balance} /> · {profile.status || 'active'}</p>
        </div>
      </div>
      <div className="glass-card profile-actions">
        <button className="has-lottie" onClick={() => openDialog('edit')}><LottieIcon src="/icons/new/edit-profile.json" size={24} />Edit profile</button>
        <button className="has-lottie" onClick={() => openDialog('password')}><LottieIcon src="/icons/new/lock-emoji.json" size={24} />Change password</button>
        <button className="has-lottie" onClick={openApi}><LottieIcon src="/icons/new/api-settings.json" size={24} />API settings</button>
        <button className="has-lottie" onClick={() => setGiftOpen(true)}><LottieIcon src="/icons/new/gift-code.json" size={24} />Gift code</button>
        <button className="danger has-lottie" onClick={() => openDialog('logout')}><LottieIcon src="/icons/new/logout-flash.json" size={24} />Logout</button>
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
      toast.success(`Gift code redeemed! ₹${res.amount} added to wallet.`, { icon: <LottieIcon src="/icons/new/gift-code.json" size={22} /> });
      setCode('');
      getUserGiftRedemptions(uid).then(setHistory).catch(() => {});
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="action-modal liquid-dialog" style={{ maxWidth: 420 }}>
        <div className="dialog-title-row">
          <LottieIcon src="/icons/new/gift-code.json" size={24} />
          <h2>Gift code</h2>
          <button className="icon-button" type="button" onClick={onClose} style={{marginLeft:'auto',display:'flex',alignItems:'center',justifyContent:'center'}}><LottieIcon src="/icons/new/close-emoji.json" size={22} /></button>
        </div>
        <form onSubmit={redeem} style={{ margin: '8px 0 14px' }}>
          <div className="gift-input-row">
            <LottieIcon src="/icons/new/gift-code.json" size={22} />
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter gift code" maxLength={10} required className="gift-input-wide" />
            <button type="button" className="gift-paste-btn" onClick={() => { navigator.clipboard.readText().then(t => setCode(t.toUpperCase())).catch(() => toast.error('Paste failed')); }}>
              <LottieIcon src="/icons/new/download-emoji.json" size={16} /> Paste
            </button>
            <button className="modal-save gift-redeem-btn" type="submit" disabled={busy || !code.trim()}>
              {busy ? '…' : <><LottieIcon src="/icons/new/verified-check.json" size={16} /> Redeem</>}
            </button>
          </div>
        </form>

        {result && (
          <div className="gift-result-card">
            <LottieIcon src="/icons/new/verified-badge.json" size={24} />
            <div>
              <strong>₹{result.amount} credited!</strong>
              <p className="muted">Code: {result.code}</p>
            </div>
          </div>
        )}

        <h4 style={{ display:'flex', alignItems:'center', gap: 6, margin:'14px 0 6px' }}>
          <LottieIcon src="/icons/new/history-emoji.json" size={18} /> Redemption history
        </h4>
        {history.length === 0
          ? <p className="muted empty-state">No redemptions yet</p>
          : <div className="gift-history-list">{
            history.map((h, i) => (
              <div key={i} className="gift-history-row">
                <LottieIcon src="/icons/new/gift-code.json" size={18} />
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
          <LottieIcon src="/icons/new/gift-code.json" size={22} />
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
          <div className="dialog-title-row"><LottieIcon src="/icons/new/edit-title-emoji.json" size={24} /><h2>Edit profile</h2></div>
          <label>Display name<input value={name} onChange={e => setName(e.target.value)} placeholder="Account holder" /></label>
          <label className="file-upload-label">
            <LottieIcon src="/icons/new/edit-profile.json" size={22} /> Profile image
            <input type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
          </label>
          {photoData && <img src={photoData} alt="Preview" className="photo-preview" />}
          <div className="modal-btn-row">
            <button type="button" onClick={close}><LottieIcon src="/icons/new/close-emoji.json" size={18} /> Cancel</button>
            <button className="modal-save has-lottie" type="submit"><LottieIcon src="/icons/new/save-emoji.json" size={18} /> Save changes</button>
          </div>
        </form>
      )}
      {type === 'password' && (
        <form className="action-modal liquid-dialog" onSubmit={savePassword}>
          <div className="dialog-title-row"><LottieIcon src="/icons/new/lock-emoji.json" size={24} /><h2>Change password</h2></div>
          <label><LottieIcon src="/icons/new/key-emoji.json" size={18} /> Old password<input value={oldPassword} onChange={e => setOldPassword(e.target.value)} type="password" placeholder="Old password" /></label>
          <label><LottieIcon src="/icons/new/new-password-emoji.json" size={18} /> New password<input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" minLength={6} placeholder="New password (min 6)" required /></label>
          <div className="modal-btn-row">
            <button type="button" onClick={close}><LottieIcon src="/icons/new/close-emoji.json" size={18} /> Cancel</button>
            <button className="modal-save has-lottie" type="submit"><LottieIcon src="/icons/new/save-emoji.json" size={18} /> Change</button>
          </div>
        </form>
      )}
      {type === 'api' && (
        <section className="action-modal liquid-dialog">
          <div className="dialog-title-row"><LottieIcon src="/icons/new/key-lottie.json" size={24} /><h2>Private API</h2></div>
          {apiState.apiKey ? <p className="api-key-box">{apiState.apiKey}</p> : <p>Key active. Last 4: <strong>{apiState.last4}</strong></p>}
          <p>This key enables Bot login. Keep it private.</p>
          <div className="modal-btn-row">
            <button type="button" onClick={close}><LottieIcon src="/icons/new/close-emoji.json" size={18} /> Close</button>
            <button className="modal-save has-lottie" type="button" onClick={resetApi}><LottieIcon src="/icons/new/refresh-emoji.json" size={18} /> Reset key</button>
          </div>
        </section>
      )}
      {type === 'logout' && (
        <section className="action-modal liquid-dialog">
          <div className="dialog-title-row"><LottieIcon src="/icons/new/logout-flash.json" size={24} /><h2>Logout?</h2></div>
          <p>Your local session will be removed from this browser.</p>
          <div className="modal-btn-row">
            <button type="button" onClick={close}><LottieIcon src="/icons/new/close-emoji.json" size={18} /> Cancel</button>
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
                  <MatIcon name={tx.type === 'deposit_approved' ? 'add_circle' : 'shopping_cart'} size={15} style={{ filter: 'invert(0.6)' }} />
                  <div className="tx-main">
                    <strong>{tx.note || tx.type}</strong>
                    <span>{fmtDate(tx.createdAt)}</span>
                  </div>
                  <b style={{ color: tx.type === 'purchase' ? '#f87171' : '#4ade80', fontSize: '0.85rem' }}>
                    {tx.type === 'purchase' ? '-' : '+'}<MoneyDisplay value={tx.amount} />
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    getAdminPricingRules().then(r => setRules(r)).catch(() => {});
  }, [product?.pid]);

  if (!product) return null;

  const ruleKey = (pid, duration) => `${pid}_${(duration || 'default').trim().replace(/[^a-z0-9]+/gi, '_')}`;

  const getRule = dur => {
    const k = ruleKey(product.pid, dur);
    return rules[k] || { price: '', percent: '' };
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
        if (r.price !== '' || r.percent !== '') {
          await adminSaveProductRule({ pid: String(product.pid), duration: dur, price: r.price, percent: r.percent });
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
        <p className="muted dialog-sub">PID {product.pid} · Set a fixed price or % adjustment per duration.</p>
        <div className="pricing-edit-list">
          {product.pricing.map(item => {
            const dur = item.duration || item.label;
            const rule = getRule(dur);
            return (
              <div className="pricing-edit-row" key={dur}>
                <div className="pricing-edit-label">
                  <strong>{dur}</strong>
                  <span className="muted">API: <MoneyDisplay value={item.price} /></span>
                </div>
                <input
                  className="pricing-edit-input"
                  type="number"
                  placeholder="Custom amount"
                  value={rule.price}
                  onChange={e => setRule(dur, 'price', e.target.value)}
                  min={0}
                />
                <input
                  className="pricing-edit-input short"
                  type="number"
                  placeholder="% ±"
                  value={rule.percent}
                  onChange={e => setRule(dur, 'percent', e.target.value)}
                />
              </div>
            );
          })}
        </div>
        <div className="modal-btn-row">
          <button type="button" onClick={onClose} disabled={saving}><LottieIcon src="/icons/new/close-emoji.json" size={18} /> Cancel</button>
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
  const [search, setSearch] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [fundForm, setFundForm] = useState({ uid: '', amount: '', mode: 'add' });
  const [resellerForm, setResellerForm] = useState({ username: '', password: '', fund: '' });
  const [upiId, setUpiId] = useState('');
  const [minDeposit, setMinDeposit] = useState('50');
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
    { id: 'issues', label: 'Issues', icon: 'report' },
    { id: 'gift-codes', label: 'Gift Codes', icon: 'card_giftcard', lottie: '/icons/new/gift-code.json' },
    { id: 'key-history', label: 'License History', icon: 'history' },
    { id: 'add-keys', label: 'License Keys', icon: 'vpn_key' },
    { id: 'payments', label: 'Payments', icon: 'payment' },
    { id: 'reports', label: 'Reports', icon: 'assessment' },
    { id: 'settings', label: 'UPI Settings', icon: 'settings' },
  ];

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const [overview, productList, alerts, status, gcList] = await Promise.all([
        getAdminOverview(),
        fetchGameProducts().catch(() => []),
        getAdminAlerts().catch(() => []),
        getSiteStatus().catch(() => ({ status: 'operational', message: '' })),
      ]);
      setData(overview);
      setProducts(productList);
      setUpiId(overview.upiId || '');
      setMinDeposit(String(overview.minDeposit || 50));
      setManualKeys(overview.manualKeys || []);
      setAdminAlerts(alerts);
      setSiteStatus(status.status || 'operational');
      setSiteStatusMsg(status.message || '');
      setGiftCodes(gcList);
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
              <div><h3>Reseller API Status</h3><p className="muted">Check live API balance and connectivity</p></div>
            </div>
            <button className="modal-save" onClick={checkApiStatus} disabled={apiChecking}>
              {apiChecking ? 'Checking…' : <><MatIcon name="refresh" size={16} /> Check now</>}
            </button>
          </div>
          {apiStatus && (
            <div className="api-status-result">
              {apiStatus.error
                ? <p className="muted" style={{ color: '#f87171' }}>❌ {apiStatus.message}</p>
                : <pre className="api-status-pre">{JSON.stringify(apiStatus, null, 2)}</pre>
              }
            </div>
          )}
          {!apiStatus && !apiChecking && <p className="muted empty-state">Press "Check now" to query the reseller API.</p>}
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
          <LottieIcon src="/icons/new/search-emoji.json" size={18} />
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
        <div className="search-box admin-search">
          <LottieIcon src="/icons/new/search-emoji.json" size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products" />
        </div>
        <AdminList items={filteredProducts} empty="No API products loaded" render={product => (
          <AdminRow
            title={product.name}
            meta={`PID ${product.pid} · ${product.game} · ${product.platform || 'Platform'}`}
            status={`${product.pricing?.length || 0} durations`}
          >
            <button onClick={() => setPricingProduct(product)}>
              <MatIcon name="edit" size={13} /> Edit pricing
            </button>
          </AdminRow>
        )} />
      </div>
    ),

    'gift-codes': (
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="heading-title-row">
            <LottieIcon src="/icons/new/gift-code.json" size={24} />
            <div><h3>Gift codes</h3><p className="muted">Create and manage gift codes for users</p></div>
          </div>
        </div>
        <form className="admin-form compact" onSubmit={e => { e.preventDefault(); safeAction(async () => {
          const res = await adminCreateGiftCode(gcAmount, gcMaxRedeems);
          setGcAmount(''); setGcMaxRedeems('1');
          toast.success(`Gift code ${res.code} created for ₹${res.amount}`, { icon: <LottieIcon src="/icons/new/gift-code.json" size={20} /> });
        }, 'Gift code created'); }}>
          <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
            <LottieIcon src="/icons/new/rupee-emoji.json" size={18} />
            <input value={gcAmount} onChange={e => setGcAmount(e.target.value)} placeholder="Amount" inputMode="numeric" required style={{flex:1}} />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <MatIcon name="people" size={18} />
            <input value={gcMaxRedeems} onChange={e => setGcMaxRedeems(e.target.value)} placeholder="Max users" inputMode="numeric" style={{width:60}} />
          </div>
          <button className="modal-save" type="submit"><LottieIcon src="/icons/new/gift-code.json" size={16} /> Create</button>
        </form>
        <AdminList items={giftCodes} empty="No gift codes created yet" render={gc => (
          <AdminRow
            title={<span style={{display:'flex',alignItems:'center',gap:6}}><LottieIcon src="/icons/new/gift-code.json" size={16} /> {gc.code}</span>}
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
        <p className="muted" style={{ marginBottom: 8 }}>All issued keys to users</p>
        <AdminList items={keys} empty="No license keys sold yet" render={key => (
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

    'add-keys': (
      <div className="admin-card">
        <h3>Add Manual License Keys</h3>
        <p className="muted" style={{ marginBottom: 8 }}>These are fallback keys delivered if the reseller API fails.</p>
        <form className="admin-form" onSubmit={e => {
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
            title={payment.user || payment.uid || 'User'}
            meta={<><MoneyDisplay value={payment.amount || 0} /> · {payment.method || 'UPI'} · From: {payment.senderUpi || '—'} · {fmtDate(payment.createdAt)}</>}
            status={payment.status || 'pending'}
          >
            {payment.status === 'pending' && (
              <>
                <button onClick={() => safeAction(() => adminUpdatePaymentRequest(payment.id, 'approved'), 'Payment approved — balance credited')}>
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
            <LottieIcon src="/icons/new/shield-verify.json" size={16} /> Status
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
          <button className="modal-save" type="submit"><LottieIcon src="/icons/new/verified-check.json" size={16} /> Update status</button>
        </form>
      </div>
      <div className="admin-card">
        <h3>UPI payment settings</h3>
        <form className="admin-form" onSubmit={e => { e.preventDefault(); safeAction(() => adminSaveUpi(upiId, minDeposit), 'UPI settings saved'); }}>
          <label>
            UPI ID
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MatIcon name="payment" size={18} />
              <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@upi" style={{ flex: 1 }} />
            </div>
          </label>
          <label>
            <LottieIcon src="/icons/new/rupee-emoji.json" size={14} /> Minimum deposit
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MatIcon name="account_balance_wallet" size={18} />
              <input value={minDeposit} onChange={e => setMinDeposit(e.target.value)} placeholder="50" inputMode="numeric" style={{ flex: 1 }} />
            </div>
          </label>
          <button className="modal-save" type="submit"><MatIcon name="check" size={15} /> Save settings</button>
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
                 id === 'gift-codes' ? <LottieIcon src="/icons/new/gift-code.json" size={20} /> :
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
  const [step, setStep] = useState('amount'); // amount | qr | confirm | pending
  const [amount, setAmount] = useState('');
  const [senderUpi, setSenderUpi] = useState('');
  const [paySettings, setPaySettings] = useState({ upiId: '', minDeposit: 50 });
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [profile, setProfile] = useState(session);

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
    const val = Number(amount);
    if (!val || val < paySettings.minDeposit) {
      toast.error(`Minimum deposit is ${money(paySettings.minDeposit)}`);
      return;
    }
    if (!paySettings.upiId) {
      toast.error('Payment not configured yet. Contact admin.');
      return;
    }
    setStep('qr');
  };

  const submitDeposit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const id = await createPaymentRequest(session.uid, amount, senderUpi, profile.name || profile.phone);
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
                <LottieIcon src="/icons/new/back-arrow-emoji.json" size={28} />
              </button>
              <h2>Add funds</h2>
            </div>
            <div className="deposit-page-card">
              <p className="muted deposit-label"><LottieIcon src="/icons/new/choose-amount-emoji.json" size={20} /> Choose amount</p>
              <div className="quick-amounts">
                {quickAmounts.map(a => (
                  <button key={a} type="button" className={`quick-chip${amount == a ? ' active' : ''}`} onClick={() => setAmount(String(a))}>
                    <MoneyDisplay value={a} />
                  </button>
                ))}
              </div>
              <p className="muted deposit-hint"><LottieIcon src="/icons/new/min-deposit-emoji.json" size={16} /> Min. deposit: <MoneyDisplay value={paySettings.minDeposit} /></p>
              <hr className="deposit-divider" />
              <form onSubmit={handleAmountNext}>
                <label htmlFor="dep-amount"><LottieIcon src="/icons/new/custom-amount-emoji.json" size={18} /> <LottieIcon src="/icons/new/rupee-emoji.json" size={14} /> Custom amount</label>
                <input id="dep-amount" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={'Min ' + money(paySettings.minDeposit)} required />
                <button className="deposit-proceed-btn" type="submit">
                  <LottieIcon src="/icons/new/proceed-emoji.json" size={20} /> Proceed to pay <MatIcon name="arrow_forward" size={17} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step: QR */}
        {step === 'qr' && (
          <div className="deposit-page">
            <div className="deposit-page-header">
              <button className="back-link emoji-back mb-[5px]" onClick={() => setStep('amount')}>
                <LottieIcon src="/icons/new/back-arrow-emoji.json" size={28} />
              </button>
              <h2>Scan &amp; Pay</h2>
            </div>
            <p className="deposit-label"><LottieIcon src="/icons/new/send-emoji.json" size={18} /> Send exactly <strong><MoneyDisplay value={amount} /></strong> to:</p>
            <p className="upi-id-display"><LottieIcon src="/icons/new/bank-emoji.json" size={20} /> {paySettings.upiId}</p>
            {qrUrl && (
              <div className="qr-wrap">
                <img className="qr-image" src={qrUrl} alt="UPI QR code" />
                <button type="button" className="qr-dl-btn" onClick={downloadQR}>
                  <LottieIcon src="/icons/new/download-emoji.json" size={16} /> Download QR
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
              I have paid <LottieIcon src="/icons/new/verified-check.json" size={26} />
            </button>
          </div>
        )}

        {/* Step: confirm */}
        {step === 'confirm' && (
          <div className="deposit-page">
            <div className="deposit-page-header">
              <button className="back-link emoji-back mb-[5px]" onClick={() => setStep('qr')}>
                <LottieIcon src="/icons/new/back-arrow-emoji.json" size={28} />
              </button>
              <h2>Confirm payment</h2>
            </div>
            <p className="deposit-label">Enter the UPI ID you paid from so admin can verify.</p>
            <form onSubmit={submitDeposit}>
              <label htmlFor="sender-upi">Your UPI ID</label>
              <input id="sender-upi" value={senderUpi} onChange={e => setSenderUpi(e.target.value)} placeholder="yourname@upi" required />
              <p className="muted qr-hint">Amount: <strong><MoneyDisplay value={amount} /></strong> → {paySettings.upiId}</p>
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
              <p className="muted">Your deposit of <strong><MoneyDisplay value={amount} /></strong> is pending admin approval.</p>
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
  const knownPath = path === '/' || path === '/admin' || path === '/add-fund';

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

createRoot(document.getElementById('root')).render(<App />);
