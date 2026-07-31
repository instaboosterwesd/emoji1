import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FcGoogle } from 'react-icons/fc';
import { Toaster, toast } from 'sonner';
import { Drawer } from 'vaul';
import countryData from 'country-telephone-data';
import {
  changeUserPassword,
  ensureGoogleUser,
  ensurePhoneUser,
  ensureUserApiKey,
  getUserProfile,
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
} from './services';
import './styles.css';
import './feature-fixes.css';

/* ── Constants ─────────────────────────────────────────────────── */
const logo = '/devx-logo.png';
const telegramLogo = '/telegram-logo.png';
const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`;
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
  { test: n => /ios cloud codm/i.test(n), icon: '/icons/brands/ios-cloud-codm.png' },
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
const Detail = ({ label, value }) => (
  <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>
);
const Stat = ({ label, value, iconName }) => (
  <div className="stat-card">
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
function Login({ onSuccess }) {
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
      <video className="backdrop" autoPlay muted loop playsInline><source src="/splash.mp4" type="video/mp4" /></video>
      <div className="veil" />
      <section className="login-card" onMouseMove={handleMove}>
        <div className="mouse-glow" />
        {step === 'phone' && (
          <>
            <img className="devx-logo" src={logo} alt="Brand logo" />
            <p className="eyebrow">WELCOME BACK</p>
            <h1>Sign in to continue</h1>
            <p className="intro">Enter your phone number to connect with your account.</p>
            <form onSubmit={sendOtp}>
              <label htmlFor="phone">Phone number</label>
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
              <button className="primary" type="submit">Send OTP <MatIcon name="arrow_forward" size={19} /></button>
            </form>
            <div className="divider"><span>or continue with</span></div>
            <div className="socials">
              <button className="social" type="button" onClick={googleLogin}><FcGoogle size={19} /><span>Google</span></button>
              <button className="social" type="button" onClick={() => setStep('api')}><img className="telegram-logo" src={telegramLogo} alt="" /><span>Bot</span></button>
            </div>
            <Terms />
          </>
        )}
        {step === 'otp' && (
          <>
            <button className="back-link" type="button" onClick={() => setStep('phone')}><MatIcon name="arrow_back" size={16} /> Change number</button>
            <img className="devx-logo small" src={logo} alt="Brand logo" />
            <p className="eyebrow">SECURE VERIFICATION</p>
            <h1>Enter your OTP</h1>
            <p className="intro">We sent a 4-digit code to +{country.dialCode} {phone}.</p>
            <form onSubmit={verifyOtp}>
              <label htmlFor="otp">Verification code</label>
              <input className="otp-input" id="otp" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} placeholder="0000" autoFocus required />
              <button className="primary" type="submit">Verify &amp; continue <MatIcon name="arrow_forward" size={19} /></button>
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
              <button className="primary" type="submit">Login with API <MatIcon name="vpn_key" size={18} /></button>
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
function Dashboard({ session, onSessionChange, onLogout }) {
  const [tab, setTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [dialog, setDialog] = useState(null);
  const [profile, setProfile] = useState(session);
  const [apiState, setApiState] = useState({ apiKey: '', last4: session.apiKeyLast4 || '' });
  const [purchase, setPurchase] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    if (!session?.uid) return;
    getUserProfile(session.uid).then(next => { setProfile(next); onSessionChange(next); }).catch(() => {});
  }, [session?.uid]);

  useEffect(() => { setPageLoading(false); }, [tab]);

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
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'buy', label: 'Buy' },
    { id: 'orders', label: 'My Orders' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'profile', label: 'Profile' },
  ];

  const section =
    tab === 'orders' ? <OrdersView session={session} /> :
    tab === 'buy' ? <ProductsView session={session} onBuy={setPurchase} /> :
    tab === 'wallet' ? <WalletView session={session} profile={profile} refreshProfile={refreshProfile} /> :
    tab === 'profile' ? <ProfileView profile={profile} openDialog={setDialog} openApi={openApi} /> :
    <DashboardHome profile={profile} role={profile.role} setTab={setTab} />;

  return (
    <main className={`dashboard-page ${theme}`}>
      <video key={theme} className="dashboard-backdrop" autoPlay muted loop playsInline aria-hidden="true">
        <source src={theme === 'dark' ? '/dashboard-dark.mp4' : '/dashboard-light.mp4'} type="video/mp4" />
      </video>
      <div className="dashboard-veil" />
      {tab === 'dashboard' && (
        <header className="dash-header">
          <img src={logo} alt="Brand logo" />
          <div>
            <span className="dash-kicker">WELCOME BACK</span>
            <h2>Your dashboard</h2>
          </div>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </header>
      )}
      <div key={`${tab}-${pageLoading}`} className={`dash-content tab-motion${tab === 'dashboard' ? '' : ' no-header'}`}>
        {pageLoading ? <PageSkeleton tab={tab} /> : section}
      </div>
      <nav className="bottom-nav">
        {navItems.map(({ id, label, icon }) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {icon && <MatIcon name={icon} size={20} />}
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <ProfileDialog type={dialog} profile={profile} apiState={apiState} close={() => setDialog(null)} onLogout={onLogout} onProfile={next => { setProfile(next); onSessionChange(next); }} onApiState={setApiState} />
      <PurchaseDialog purchase={purchase} session={session} close={() => setPurchase(null)} onPurchased={refreshProfile} />
      <Toaster position="top-center" offset={18} theme={theme} toastOptions={toastOptions} />
    </main>
  );
}

/* ── DashboardHome ──────────────────────────────────────────────── */
function DashboardHome({ profile, role, setTab }) {
  return (
    <>
      <SectionTitle title="Dashboard" subtitle="Here's what is happening today" />
      <div className="balance-card">
        <span>My balance</span>
        <strong>{money(profile.balance)}</strong>
        <button className="add-funds" onClick={() => setTab('wallet')}>
          <MatIcon name="add_circle" size={17} /> Deposit
        </button>
      </div>
      <div className="stats-grid">
        <Stat label="Today sales" value={money(profile.todaySales)} />
        <Stat label="Monthly sales" value={money(profile.monthlySales)} />
        <Stat label="My purchases" value={money(profile.myPurchases)} iconName="shopping_cart" />
        <Stat label="Active keys" value={profile.active || 0} iconName="verified_user" />
      </div>
      {role === 'admin' && (
        <button className="admin-wide glass-card" onClick={() => window.location.assign('/admin')}>
          <MatIcon name="admin_panel_settings" size={18} /> Open admin dashboard
        </button>
      )}
      <div className="glass-card">
        <div className="card-heading recent-heading">
          <div className="heading-title-row">
            <span className="recent-line-icon"><MatIcon name="vpn_key" size={19} /></span>
            <div><h3>Recent key sold</h3><p className="muted">Your latest key activity</p></div>
          </div>
        </div>
        <p className="muted empty-state">No recent keys yet</p>
      </div>
    </>
  );
}

/* ── WalletView — full deposit flow ─────────────────────────────── */
function WalletView({ session, profile, refreshProfile }) {
  const [depositStep, setDepositStep] = useState('idle'); // idle | amount | qr | confirm | pending
  const [amount, setAmount] = useState('');
  const [senderUpi, setSenderUpi] = useState('');
  const [paySettings, setPaySettings] = useState({ upiId: '', minDeposit: 50 });
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState(null);

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

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

  const qrUrl = paySettings.upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${paySettings.upiId}&am=${amount}&cu=INR`)}`
    : '';

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
    setDepositStep('qr');
  };

  const submitDeposit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const id = await createPaymentRequest(session.uid, amount, senderUpi, profile.name || profile.phone);
      setPendingId(id);
      setDepositStep('pending');
      await loadData();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

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
      <SectionTitle title="Wallet" subtitle="Manage your funds" />
      <div className="balance-card">
        <span>Available balance</span>
        <strong>{money(profile.balance)}</strong>
        <button className="add-funds" onClick={() => setDepositStep('amount')}>
          <MatIcon name="add_circle" size={17} /> Add funds
        </button>
      </div>

      {/* ── Deposit flow overlay ── */}
      {depositStep !== 'idle' && (
        <div className="action-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) { setDepositStep('idle'); setAmount(''); setSenderUpi(''); } }}>
          <section className="action-modal liquid-dialog deposit-dialog">

            {/* Step: amount */}
            {depositStep === 'amount' && (
              <>
                <div className="dialog-title-row">
                  <MatIcon name="account_balance_wallet" size={22} />
                  <h2>Add funds</h2>
                </div>
                <p className="muted dialog-sub">Min. deposit: {money(paySettings.minDeposit)}</p>
                <div className="quick-amounts">
                  {quickAmounts.map(a => (
                    <button key={a} type="button" className={`quick-chip${amount == a ? ' active' : ''}`} onClick={() => setAmount(String(a))}>
                      {money(a)}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleAmountNext}>
                  <label htmlFor="dep-amount">Custom amount (₹)</label>
                  <input id="dep-amount" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={`Min ${money(paySettings.minDeposit)}`} required />
                  <div className="modal-btn-row">
                    <button type="button" onClick={() => setDepositStep('idle')}>Cancel</button>
                    <button className="modal-save" type="submit">Proceed to pay <MatIcon name="arrow_forward" size={17} /></button>
                  </div>
                </form>
              </>
            )}

            {/* Step: QR code */}
            {depositStep === 'qr' && (
              <>
                <div className="dialog-title-row">
                  <MatIcon name="qr_code" size={22} />
                  <h2>Scan &amp; Pay</h2>
                </div>
                <p className="muted dialog-sub">Send exactly <strong>{money(amount)}</strong> to:</p>
                <p className="upi-id-display"><MatIcon name="payment" size={16} /> {paySettings.upiId}</p>
                {qrUrl && <img className="qr-image" src={qrUrl} alt="UPI QR code" />}
                <p className="muted qr-hint">Scan with any UPI app (PhonePe, GPay, Paytm…)</p>
                <div className="modal-btn-row">
                  <button type="button" onClick={() => setDepositStep('amount')}>
                    <MatIcon name="arrow_back" size={16} /> Back
                  </button>
                  <button className="modal-save" type="button" onClick={() => setDepositStep('confirm')}>
                    I have paid <MatIcon name="check_circle" size={17} />
                  </button>
                </div>
              </>
            )}

            {/* Step: confirm UPI */}
            {depositStep === 'confirm' && (
              <>
                <div className="dialog-title-row">
                  <MatIcon name="payment" size={22} />
                  <h2>Confirm payment</h2>
                </div>
                <p className="muted dialog-sub">Enter the UPI ID you paid from so admin can verify.</p>
                <form onSubmit={submitDeposit}>
                  <label htmlFor="sender-upi">Your UPI ID</label>
                  <input id="sender-upi" value={senderUpi} onChange={e => setSenderUpi(e.target.value)} placeholder="yourname@upi" required />
                  <p className="muted qr-hint">Amount: <strong>{money(amount)}</strong> → {paySettings.upiId}</p>
                  <div className="modal-btn-row">
                    <button type="button" disabled={busy} onClick={() => setDepositStep('qr')}>
                      <MatIcon name="arrow_back" size={16} /> Back
                    </button>
                    <button className="modal-save" type="submit" disabled={busy}>
                      {busy ? 'Submitting…' : <><MatIcon name="check" size={17} /> Submit</>}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Step: pending */}
            {depositStep === 'pending' && (
              <>
                <div className="dialog-title-row">
                  <MatIcon name="schedule" size={22} style={{ filter: 'invert(80%) sepia(1) saturate(2) hue-rotate(30deg)' }} />
                  <h2>Request submitted</h2>
                </div>
                <p className="muted dialog-sub">Your deposit of <strong>{money(amount)}</strong> is pending admin approval.</p>
                <p className="muted">Request ID: <strong style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{pendingId}</strong></p>
                <div className="modal-btn-row" style={{ justifyContent: 'center' }}>
                  <button className="modal-save" type="button" onClick={() => { setDepositStep('idle'); setAmount(''); setSenderUpi(''); }}>
                    <MatIcon name="close" size={17} /> Close
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* ── Transaction history ── */}
      <div className="glass-card">
        <div className="card-heading history-heading">
          <div className="heading-title-row">
            <MatIcon name="history" size={20} />
            <div><h3>Transaction history</h3><p className="muted">All deposits and purchases</p></div>
          </div>
          <button className="icon-button" onClick={loadData} aria-label="Refresh">
            <MatIcon name="refresh" size={17} />
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
                    <span className="tx-icon"><MatIcon name={txIcon(tx.type)} size={18} style={{ filter: 'invert(0.8)' }} /></span>
                    <div className="tx-main">
                      <strong>{tx.note || tx.type || 'Transaction'}</strong>
                      <span>{fmtDate(tx.createdAt)}</span>
                    </div>
                    <b className="tx-amount" style={{ color: txColor(tx.type) }}>
                      {(tx.type === 'deposit_approved' || tx.type === 'admin_add') ? '+' : '-'}{money(tx.amount)}
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
          <MatIcon name="vpn_key" size={28} style={{ marginBottom: 8, filter: 'invert(0.7)' }} />
          <Detail label="Product" value={selected.productName || selected.product || '—'} />
          <Detail label="Duration" value={selected.duration || '—'} />
          <Detail label="Amount paid" value={money(selected.price)} />
          <Detail label="Purchase date" value={fmtDate(selected.purchasedAt || selected.createdAt)} />
          <Detail label="Status" value={selected.status || 'active'} />
          <Detail label="Source" value={selected.source || 'api'} />
          <div className="key-reveal-box">
            <label>License key</label>
            <code>{selected.key || selected.keyCode || '—'}</code>
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
      <SectionTitle title="My Orders" subtitle="Track your purchased license keys" />
      <div className="filter-row">
        <div className="search-box">
          <MatIcon name="search" size={16} style={{ filter: 'invert(0.5)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search orders" />
        </div>
        <button className="icon-button" onClick={load} aria-label="Refresh orders"><MatIcon name="refresh" size={17} /></button>
      </div>
      <div className="glass-card">
        {loading
          ? <p className="muted empty-state">Loading…</p>
          : filtered.length === 0
            ? <p className="muted empty-state">No orders yet. Buy a product to get started.</p>
            : filtered.map(k => (
              <button className="order-button" key={k.id} onClick={() => setSelected(k)}>
                <div className="order-row">
                  <div className="order-icon"><MatIcon name="vpn_key" size={18} style={{ filter: 'invert(0.7)' }} /></div>
                  <div className="order-main">
                    <strong>{k.productName || k.product || 'License key'}</strong>
                    <span>{k.duration || '—'} · {money(k.price)}</span>
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
  const [visibleCount, setVisibleCount] = useState(5);

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
      <SectionTitle title="Buy Products" subtitle="Live products with pricing" />
      <div className="filter-row product-filter">
        <div className="search-box">
          <MatIcon name="search" size={16} style={{ filter: 'invert(0.5)' }} />
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
                    {product.videos[0] && <span className="play-badge">▶</span>}
                  </button>
                )}
              </div>
              <div className={`product-head${product.features.length > 3 ? ' has-toggle' : ''}${expandedFeatures[product.pid] ? ' expanded' : ''}`}>
                <div className="product-icon"><img src={productIconFor(product.name)} alt="" /></div>
                <div><h3>{product.name}</h3><p className="muted">{product.game} · {product.platform || 'Platform'} · ID {product.pid}</p></div>
                {product.features.length > 3 && <button className="feature-toggle" type="button" onClick={() => setExpandedFeatures(s => ({ ...s, [product.pid]: !s[product.pid] }))} aria-label="Toggle features"><MatIcon name="expand_more" size={17} /></button>}
              </div>
              {product.features.length > 0 && (
                <div className="feature-list">
                  {shownFeatures.map((f, i) => <div key={`${product.pid}-${f}`}><span>{i % 2 ? <MatIcon name="auto_awesome" size={12} /> : <MatIcon name="flash_on" size={12} />}</span>{f}</div>)}
                </div>
              )}
              <button className="primary buy-product" type="button" disabled={!available} onClick={() => setPricingOpen(s => ({ ...s, [product.pid]: !s[product.pid] }))}>
                <MatIcon name="shopping_bag" size={17} /> Buy Now <MatIcon name="arrow_forward" size={17} />
              </button>
              {available && pricingOpen[product.pid] && (
                <div className="duration-grid pricing-drop">
                  {product.pricing.slice(0, 8).map(item => (
                    <button
                      className={duration?.label === item.label ? 'active' : ''}
                      key={`${product.pid}-${item.label}`}
                      onClick={() => { setPricingOpen(s => ({ ...s, [product.pid]: false })); onBuy({ product, duration: item }); }}
                    >
                      <span>{item.label}</span>
                      <b>{money(item.price)}</b>
                      {item.originalPrice && item.originalPrice !== item.price && <s className="original-price">{money(item.originalPrice)}</s>}
                    </button>
                  ))}
                </div>
              )}
              {!available && <p className="muted empty-state product-empty">Pricing unavailable</p>}
            </article>
          );
        })}
        {!loading && !error && visibleCount < filtered.length && (
          <button className="load-more glass-card" type="button" onClick={() => setVisibleCount(c => c + 5)}>Load more products</button>
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
            <h2>Confirm purchase</h2>
            <div className="purchase-summary">
              <div className="purchase-title">
                <span>Selected product</span>
                <strong>{product.name}</strong>
                <small>PID {product.pid}</small>
              </div>
              <img src={productIconFor(product.name)} alt="" />
            </div>
            <div className="purchase-meta-grid">
              <div><span>Game</span><strong>{product.game || 'Product'}</strong></div>
              <div><span>Duration</span><strong>{duration.duration || duration.label}</strong></div>
              <div><span>Price</span><strong>{money(duration.price)}</strong></div>
              <div><span>Platform</span><strong>{product.platform || 'Access key'}</strong></div>
            </div>
            <p className="purchase-note">Balance will be deducted. A key will be delivered instantly.</p>
            <div className="modal-btn-row">
              <button type="button" onClick={close} disabled={busy}>Cancel</button>
              <button className="modal-save" type="button" onClick={confirm} disabled={busy}>
                {busy ? 'Buying…' : <><MatIcon name="shopping_cart" size={17} /> Confirm buy</>}
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
  return (
    <>
      <SectionTitle title="Profile" subtitle="Manage your account" />
      <div className="glass-card profile-card">
        <img src={profile.photoData || logo} alt="Profile" />
        <div>
          <h3>{profile.name || 'Account holder'}</h3>
          <p className="muted">{profile.email || profile.phone || 'Verified account'}</p>
          <p className="muted">Balance {money(profile.balance)} · {profile.status || 'active'}</p>
        </div>
      </div>
      <div className="glass-card profile-actions">
        <button onClick={() => openDialog('edit')}><MatIcon name="edit" size={18} /> Edit profile</button>
        <button onClick={() => openDialog('password')}><MatIcon name="lock" size={18} /> Change password</button>
        <button onClick={openApi}><MatIcon name="vpn_key" size={18} /> API settings</button>
        <button className="danger" onClick={() => openDialog('logout')}><MatIcon name="logout" size={18} /> Logout</button>
      </div>
    </>
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
          <div className="dialog-title-row"><MatIcon name="edit" size={20} /><h2>Edit profile</h2></div>
          <label>Display name<input value={name} onChange={e => setName(e.target.value)} placeholder="Account holder" /></label>
          <label className="file-upload-label">
            <MatIcon name="photo_camera" size={18} /> Profile image
            <input type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
          </label>
          {photoData && <img src={photoData} alt="Preview" className="photo-preview" />}
          <div className="modal-btn-row">
            <button type="button" onClick={close}>Cancel</button>
            <button className="modal-save" type="submit">Save changes</button>
          </div>
        </form>
      )}
      {type === 'password' && (
        <form className="action-modal liquid-dialog" onSubmit={savePassword}>
          <div className="dialog-title-row"><MatIcon name="lock" size={20} /><h2>Change password</h2></div>
          <label>Old password<input value={oldPassword} onChange={e => setOldPassword(e.target.value)} type="password" placeholder="Old password" /></label>
          <label>New password<input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" minLength={6} placeholder="New password (min 6)" required /></label>
          <div className="modal-btn-row">
            <button type="button" onClick={close}>Cancel</button>
            <button className="modal-save" type="submit">Change</button>
          </div>
        </form>
      )}
      {type === 'api' && (
        <section className="action-modal liquid-dialog">
          <div className="dialog-title-row"><MatIcon name="vpn_key" size={20} /><h2>Private API</h2></div>
          {apiState.apiKey ? <p className="api-key-box">{apiState.apiKey}</p> : <p>Key active. Last 4: <strong>{apiState.last4}</strong></p>}
          <p>This key enables Bot login. Keep it private.</p>
          <div className="modal-btn-row">
            <button type="button" onClick={close}>Close</button>
            <button className="modal-save" type="button" onClick={resetApi}>Reset key</button>
          </div>
        </section>
      )}
      {type === 'logout' && (
        <section className="action-modal liquid-dialog">
          <div className="dialog-title-row"><MatIcon name="logout" size={20} /><h2>Logout?</h2></div>
          <p>Your local session will be removed from this browser.</p>
          <div className="modal-btn-row">
            <button type="button" onClick={close}>Cancel</button>
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
                    {tx.type === 'purchase' ? '-' : '+'}{money(tx.amount)}
                  </b>
                </div>
              ))}
            </div>
            <h4 style={{ margin: '12px 0 6px' }}>License Keys ({userKeys.length})</h4>
            <div className="history-scroll">
              {userKeys.length === 0 ? <p className="muted empty-state">No keys</p> : userKeys.slice(0, 20).map(k => (
                <div className="tx-row compact" key={k.id}>
                  <MatIcon name="vpn_key" size={15} style={{ filter: 'invert(0.6)' }} />
                  <div className="tx-main">
                    <strong>{k.productName || k.product}</strong>
                    <span>{k.duration} · {fmtDate(k.purchasedAt)}</span>
                  </div>
                  <b style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{money(k.price)}</b>
                </div>
              ))}
            </div>
          </>
        )}
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
                  <span className="muted">API: {money(item.price)}</span>
                </div>
                <input
                  className="pricing-edit-input"
                  type="number"
                  placeholder="Custom ₹"
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
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
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

  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'announcements', label: 'Announcements', icon: 'campaign' },
    { id: 'users', label: 'Users', icon: 'people' },
    { id: 'resellers', label: 'Resellers', icon: 'verified_user' },
    { id: 'products', label: 'Products', icon: 'shopping_bag' },
    { id: 'key-history', label: 'License History', icon: 'history' },
    { id: 'add-keys', label: 'License Keys', icon: 'vpn_key' },
    { id: 'payments', label: 'Payments', icon: 'payment' },
    { id: 'reports', label: 'Reports', icon: 'assessment' },
    { id: 'settings', label: 'UPI Settings', icon: 'settings' },
  ];

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const [overview, productList] = await Promise.all([
        getAdminOverview(),
        fetchGameProducts().catch(() => []),
      ]);
      setData(overview);
      setProducts(productList);
      setUpiId(overview.upiId || '');
      setMinDeposit(String(overview.minDeposit || 50));
      setManualKeys(overview.manualKeys || []);
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
          <AdminStat iconName="trending_up" label="Total revenue" value={money(data?.stats?.totalRevenue || 0)} accent="green" />
          <AdminStat iconName="people" label="Active users" value={data?.stats?.activeUsers || 0} accent="blue" />
          <AdminStat iconName="vpn_key" label="Keys sold" value={data?.stats?.keysSold || 0} accent="purple" />
          <AdminStat iconName="payment" label="Pending deposit" value={money(data?.stats?.pendingDeposit || 0)} accent="orange" />
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
            <p className="muted"><MatIcon name="vpn_key" size={14} /> {keys.length} license key records</p>
            <p className="muted"><MatIcon name="inventory" size={14} /> {manualKeys.filter(k => !k.used).length} unused manual keys</p>
            <p className="muted"><MatIcon name="schedule" size={14} /> {deposits.filter(d => d.status === 'pending').length} pending payment requests</p>
          </div>
        </div>
      </>
    ),

    announcements: (
      <div className="admin-card">
        <h3>New announcement</h3>
        <form className="admin-form" onSubmit={e => { e.preventDefault(); safeAction(async () => { await adminSaveAnnouncement(announcement); setAnnouncement(''); }, 'Announcement published'); }}>
          <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} placeholder="Write announcement for users" />
          <button className="modal-save"><MatIcon name="campaign" size={16} /> Publish</button>
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
          <MatIcon name="search" size={16} style={{ filter: 'invert(0.5)' }} />
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
            status={`${user.role || 'user'} · ${user.status || 'active'} · ${money(user.balance)}`}
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
          <AdminRow title={item.username || item.id} meta={`Fund ${money(item.fund || 0)} · Created ${fmtDate(item.createdAt || item.updatedAt)}`} status={item.status || 'active'}>
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
          <MatIcon name="search" size={16} style={{ filter: 'invert(0.5)' }} />
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

    payments: (
      <div className="admin-card">
        <h3>Payment requests</h3>
        <AdminList items={deposits} empty="No payment requests" render={payment => (
          <AdminRow
            title={payment.user || payment.uid || 'User'}
            meta={`${money(payment.amount || 0)} · ${payment.method || 'UPI'} · From: ${payment.senderUpi || '—'} · ${fmtDate(payment.createdAt)}`}
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
            meta={`${tx.uid || 'User'} · ${money(tx.amount || 0)} · ${fmtDate(tx.createdAt)}`}
            status={tx.note || tx.status || 'record'}
          />
        )} />
      </div>
    ),

    settings: (
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
            Minimum deposit (₹)
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
      </div>
    ),
  }[tab];

  return (
    <main className="dashboard-page admin-page">
      <video className="dashboard-backdrop" autoPlay muted loop playsInline aria-hidden="true"><source src="/dashboard-dark.mp4" type="video/mp4" /></video>
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
                <MatIcon name={icon} size={18} />
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
      <Toaster position="top-center" offset={18} theme="dark" toastOptions={toastOptions} />
      {historyUser && <UserHistoryDialog user={historyUser} onClose={() => setHistoryUser(null)} />}
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

/* ── App root ───────────────────────────────────────────────────── */
function App() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_session') || 'null'); } catch { return null; }
  });
  const path = window.location.pathname;
  const knownPath = path === '/' || path === '/admin';

  useEffect(() => {
    const upd = () => setOnline(navigator.onLine);
    window.addEventListener('online', upd);
    window.addEventListener('offline', upd);
    return () => { window.removeEventListener('online', upd); window.removeEventListener('offline', upd); };
  }, []);

  const updateSession = next => { localStorage.setItem('app_session', JSON.stringify(next)); setSession(next); };
  const logout = () => { localStorage.removeItem('app_session'); setSession(null); };

  if (!online) return <ErrorTv mode="offline" />;
  if (!knownPath) return <ErrorTv mode="404" />;
  if (path === '/admin') return <AdminPage session={session} onSessionChange={updateSession} />;
  return session
    ? <Dashboard session={session} onSessionChange={updateSession} onLogout={logout} />
    : <><Login onSuccess={updateSession} /><Toaster position="top-center" offset={18} theme="dark" toastOptions={toastOptions} /></>;
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
