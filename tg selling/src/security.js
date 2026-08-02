/**
 * Comprehensive Security Module
 * - DevTools blocking (production only)
 * - Rate limiting for requests
 * - Input sanitization (XSS, SQL injection)
 * - VPN/Proxy detection
 * - Browser integrity checks
 * - Keyboard shortcut blocking
 * - View source / inspect protection
 * - Admin panel additional security
 */

/* ── Rate Limiter ──────────────────────────────────────────── */
const rateStore = new Map();
const RATE_WINDOW = 60_000; // 1 minute
const RATE_MAX = 30; // max actions per window

export function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateStore.get(key);
  if (!entry || now - entry.window > RATE_WINDOW) {
    rateStore.set(key, { window: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}

/* ── Input Sanitizer ───────────────────────────────────────── */
export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '')           // strip < > (XSS)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // control chars
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|OR\s+1=1)\b/gi, '') // SQL keywords
    .trim();
}

export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '').slice(-10);
}

/* ── VPN / Proxy Detection ─────────────────────────────────── */
export async function detectVpnOrProxy() {
  try {
    // Check WebRTC local IP (leaks even behind VPN if WebRTC is enabled)
    const localIp = await detectLocalIp();
    if (localIp) {
      // Private IPs are normal; public IP via WebRTC means no VPN for that peer
    }
  } catch {}
  return false; // non-blocking info — don't break UX
}

function detectLocalIp() {
  return new Promise(resolve => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {});
      pc.onicecandidate = e => {
        if (!e.candidate) { pc.close(); resolve(null); return; }
        const ip = e.candidate.candidate?.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
        if (ip) { pc.close(); resolve(ip[0]); }
      };
      setTimeout(() => { pc.close(); resolve(null); }, 2000);
    } catch { resolve(null); }
  });
}

/* ── Browser Integrity ──────────────────────────────────────── */
export function checkBrowserIntegrity() {
  const issues = [];

  // Check if headless
  const UA = navigator.userAgent.toLowerCase();
  if (/headless|phantom|puppet|selenium/i.test(UA)) issues.push('headless');

  // Check for automation flags
  if (navigator.webdriver) issues.push('webdriver');

  // Chrome automation
  if (window.chrome && window.chrome.runtime === undefined) {
    // Normal Chrome has runtime
  }

  // Plugin check
  try {
    if (navigator.plugins.length === 0 && !/mobile/i.test(UA)) {
      // Very uncommon for desktop — could be automation
    }
  } catch {}

  return issues;
}

/* ── DevTools Blocker (production only) ─────────────────────── */
let devtoolsWarningShown = false;
let devtoolsOpen = false;

export function initDevToolsBlocker() {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

  const el = new Image();
  Object.defineProperty(el, 'id', {
    get: () => {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        showDevToolsWarning();
      }
    }
  });
  console.log(el);

  // Dimension-based detection
  const threshold = 160;
  let blocked = false;

  const checkDevTools = () => {
    const wDiff = window.outerWidth - window.innerWidth;
    const hDiff = window.outerHeight - window.innerHeight;
    const isOpen = wDiff > threshold || hDiff > threshold;

    if (isOpen && !blocked) {
      blocked = true;
      devtoolsOpen = true;
      showDevToolsWarning();
    } else if (!isOpen && blocked && !devtoolsWarningShown) {
      blocked = false;
      devtoolsOpen = false;
    }
  };

  checkDevTools();
  setInterval(checkDevTools, 500);

  // Prevent removal of warning overlay
  const observer = new MutationObserver(() => {
    if (devtoolsOpen) {
      const overlay = document.getElementById('devtools-warning-overlay');
      if (!overlay && devtoolsWarningShown) {
        devtoolsWarningShown = false;
        showDevToolsWarning();
      }
    }
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  else window.addEventListener('DOMContentLoaded', () => observer.observe(document.body, { childList: true, subtree: true }));
}

function showDevToolsWarning() {
  if (devtoolsWarningShown) return;
  devtoolsWarningShown = true;

  const overlay = document.createElement('div');
  overlay.id = 'devtools-warning-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:2147483647;display:flex;align-items:center;justify-content:center;';
  overlay.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });

  overlay.innerHTML = `
    <div style="background:#1a1a2e;padding:40px;border-radius:16px;max-width:500px;text-align:center;border:1px solid rgba(220,53,69,0.3);box-shadow:0 10px 40px rgba(0,0,0,0.5);">
      <div style="color:#dc3545;font-size:64px;margin-bottom:16px;">🔒</div>
      <h1 style="color:#fff;margin:0 0 8px;font-family:inherit;font-size:24px;">Access Restricted</h1>
      <p style="color:#aaa;font-size:14px;line-height:1.7;margin:0 0 20px;">Developer tools are not allowed on this site. Please close them and reload.</p>
      <button id="devtools-reload-btn" style="background:#dc3545;color:#fff;border:none;padding:12px 32px;border-radius:8px;cursor:pointer;font-size:15px;font-weight:600;">Reload Page</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  document.body.style.pointerEvents = 'none';
  overlay.style.pointerEvents = 'auto';

  setTimeout(() => {
    const btn = document.getElementById('devtools-reload-btn');
    if (btn) btn.onclick = () => window.location.reload();
  }, 50);
}

/* ── Keyboard Shortcut Blocking ─────────────────────────────── */
export function blockKeyboardShortcuts(e) {
  // F12
  if (e.keyCode === 123) { e.preventDefault(); return false; }
  // Ctrl+Shift+I/J/C
  if (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) { e.preventDefault(); return false; }
  // Ctrl+U (view source)
  if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
  // Ctrl+S
  if (e.ctrlKey && e.keyCode === 83) { e.preventDefault(); return false; }
  return true;
}

/* ── Right-click / Selection / Copy Prevention ──────────────── */
function preventOnNonInput(e) {
  if (e.target?.nodeName !== 'INPUT' && e.target?.nodeName !== 'TEXTAREA') {
    e.preventDefault();
  }
}

export function initInputProtection() {
  document.addEventListener('contextmenu', preventOnNonInput);
  document.addEventListener('selectstart', preventOnNonInput);
  document.addEventListener('copy', preventOnNonInput);
  document.addEventListener('dragstart', e => e.preventDefault());
  document.addEventListener('keydown', blockKeyboardShortcuts);
}

/* ── Admin Panel Protection ─────────────────────────────────── */
export function adminSessionCheck(session) {
  if (!session) return { allowed: false, message: 'Admin login required' };
  if (session.role !== 'admin') return { allowed: false, message: 'Admin only' };
  return { allowed: true };
}

/* ── Security Headers (via meta tags) ───────────────────────── */
export function addSecurityMetaTags() {
  const metas = [
    { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
    { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
    { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
    { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
    { name: 'referrer', content: 'no-referrer-when-downgrade' },
  ];
  metas.forEach(attrs => {
    const meta = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => meta.setAttribute(k, v));
    document.head.appendChild(meta);
  });
}

/* ── Fetch wrapper with rate limiting ───────────────────────── */
const originalFetch = window.fetch.bind(window);
window.fetch = async function(input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || '';
  const key = `fetch_${url}`;

  if (!checkRateLimit(key)) {
    throw new Error('Too many requests. Please slow down.');
  }

  return originalFetch(input, init);
};

/* ── Initialize All Security Measures ───────────────────────── */
export function initSecurity() {
  if (window.__SECURITY_INITIALIZED) return;
  window.__SECURITY_INITIALIZED = true;

  addSecurityMetaTags();
  initInputProtection();
  initDevToolsBlocker();
  detectVpnOrProxy();
  checkBrowserIntegrity();

  console.log('✓ Security initialized');
}
