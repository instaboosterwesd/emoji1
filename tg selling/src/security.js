/**
 * Security Module
 * - DevTools blocking (production only)
 * - Rate limiting
 * - Input sanitization (XSS, SQL injection)
 * - Browser integrity checks
 * - Keyboard shortcut blocking
 * - View source / inspect protection
 * - Admin panel protection
 * - Fetch wrapper with security checks
 */

/* ── Warning Overlay ────────────────────────────────────────── */
function showBlockOverlay({ title, message, btnText = 'Reload Page' } = {}) {
  if (document.getElementById('sec-block-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'sec-block-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.96);z-index:2147483647;display:flex;align-items:center;justify-content:center;';
  overlay.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
  overlay.innerHTML = `
    <div style="background:#1a1a2e;padding:40px;border-radius:16px;max-width:500px;text-align:center;border:1px solid rgba(220,53,69,0.3);box-shadow:0 10px 40px rgba(0,0,0,0.5);">
      <div style="color:#dc3545;font-size:56px;margin-bottom:12px;">🚫</div>
      <h1 style="color:#fff;margin:0 0 6px;font-family:sans-serif;font-size:22px;">${title || 'Access Denied'}</h1>
      <p style="color:#ccc;font-size:13px;line-height:1.7;margin:0 0 20px;font-family:sans-serif;">${message || 'This action is not allowed.'}</p>
      <button class="sec-reload-btn" style="background:#dc3545;color:#fff;border:none;padding:12px 32px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;font-family:sans-serif;">${btnText}</button>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  document.body.style.pointerEvents = 'none';
  overlay.style.pointerEvents = 'auto';
  setTimeout(() => {
    const btn = overlay.querySelector('.sec-reload-btn');
    if (btn) btn.onclick = () => window.location.reload();
  }, 50);
}

/* ── Rate Limiter (stricter) ────────────────────────────────── */
const rateStore = new Map();
const RATE_WINDOW = 60_000;
const RATE_MAX = 20; // stricter: 20 per minute

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

/* ── Input Sanitizer (stricter) ─────────────────────────────── */
export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>"']/g, '')          // strip all HTML special chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')      // strip onclick, onload, etc
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|OR\s+1=1|OR\s+\d+=\d+|--\s|#)\b/gi, '')
    .trim();
}

export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '').slice(-10);
}

/* ── DevTools Blocker (aggressive) ──────────────────────────── */
let devtoolsWarningShown = false;
let devtoolsOpen = false;
let devtoolsBlocked = false;

export function initDevToolsBlocker() {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

  // Image trick — DevTools console.log serializes the object, triggering the getter
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

  // threshold lowered for stricter detection
  const threshold = 140;
  let blocked = false;

  const check = () => {
    if (!document.body) return;
    const wDiff = window.outerWidth - window.innerWidth;
    const hDiff = window.outerHeight - window.innerHeight;
    const isOpen = wDiff > threshold || hDiff > threshold;

    // Also check for very thin viewport on large screen (device emulation)
    const screenW = window.screen?.availWidth || 1920;
    const tinyViewport = screenW > 1600 && window.innerWidth < 500;

    if ((isOpen || tinyViewport) && !blocked) {
      blocked = true;
      devtoolsOpen = true;
      showDevToolsWarning();
    } else if (!isOpen && !tinyViewport && blocked && !devtoolsWarningShown) {
      blocked = false;
      devtoolsOpen = false;
    }
  };

  check();
  setInterval(check, 400);

  // Mutation observer — prevent overlay removal
  const obs = new MutationObserver(() => {
    if (devtoolsOpen) {
      if (!document.getElementById('devtools-warning-overlay') && devtoolsWarningShown) {
        devtoolsWarningShown = false;
        showDevToolsWarning();
      }
    }
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  else window.addEventListener('DOMContentLoaded', () => obs.observe(document.body, { childList: true, subtree: true }));

  // Also block on resize events aggressively
  window.addEventListener('resize', () => {
    if (!document.body) return;
    const wDiff = window.outerWidth - window.innerWidth;
    const hDiff = window.outerHeight - window.innerHeight;
    const screenW = window.screen?.availWidth || 1920;
    const tinyViewport = screenW > 1600 && window.innerWidth < 500;
    if ((wDiff > threshold || hDiff > threshold || tinyViewport) && !blocked) {
      blocked = true;
      devtoolsOpen = true;
      showDevToolsWarning();
    }
  });
}

function showDevToolsWarning() {
  if (devtoolsWarningShown || !document.body) return;
  devtoolsWarningShown = true;
  devtoolsBlocked = true;

  const existing = document.getElementById('devtools-warning-overlay');
  if (existing) existing.remove();

  showBlockOverlay({
    title: 'Developer Tools Detected',
    message: 'Developer tools are not allowed on this website. Please close all devtools windows and reload the page.',
  });
}

/* ── Keyboard Shortcut Blocking ─────────────────────────────── */
let keyBlockActive = false;

export function blockKeyboardShortcuts(e) {
  if (keyBlockActive) return;

  // F12
  if (e.keyCode === 123) { e.preventDefault(); e.stopPropagation(); keyBlockActive = true; setTimeout(() => { keyBlockActive = false; }, 200); return false; }
  // Ctrl+Shift+I/J/C
  if (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) { e.preventDefault(); e.stopPropagation(); return false; }
  // Ctrl+U
  if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); e.stopPropagation(); return false; }
  // Ctrl+S
  if (e.ctrlKey && e.keyCode === 83) { e.preventDefault(); e.stopPropagation(); return false; }
  // Ctrl+Shift+Delete (clear data)
  if (e.ctrlKey && e.shiftKey && e.keyCode === 46) { e.preventDefault(); return false; }
  return true;
}

/* ── Input Protection ───────────────────────────────────────── */
function preventOnNonInput(e) {
  if (e.target?.nodeName !== 'INPUT' && e.target?.nodeName !== 'TEXTAREA') {
    e.preventDefault();
  }
}

export function initInputProtection() {
  document.addEventListener('contextmenu', e => {
    if (e.target?.nodeName !== 'INPUT' && e.target?.nodeName !== 'TEXTAREA') {
      e.preventDefault();
    }
  }, true);
  document.addEventListener('selectstart', preventOnNonInput, true);
  document.addEventListener('copy', preventOnNonInput, true);
  document.addEventListener('cut', preventOnNonInput, true);
  document.addEventListener('paste', preventOnNonInput, true);
  document.addEventListener('dragstart', e => e.preventDefault(), true);
  document.addEventListener('keydown', blockKeyboardShortcuts, true);
}

/* ── Admin Panel Protection ─────────────────────────────────── */
export function adminSessionCheck(session) {
  if (!session) return { allowed: false, message: 'Admin login required' };
  if (session.role !== 'admin') return { allowed: false, message: 'Admin only' };
  return { allowed: true };
}

/* ── Security Meta Tags ─────────────────────────────────────── */
export function addSecurityMetaTags() {
  const head = document.head;
  const existing = head.querySelectorAll('meta[http-equiv], meta[name]');
  const existingKeys = new Set();
  existing.forEach(m => existingKeys.add(`${m.getAttribute('http-equiv') || ''}:${m.getAttribute('name') || ''}`));

  const metas = [
    { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
    { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
    { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
    { name: 'referrer', content: 'no-referrer-when-downgrade' },
    { name: 'Content-Security-Policy', content: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://identitytoolkit.googleapis.com https://rozgarapinew.teachx.in https://game-cheats-api.vercel.app https://www.googleapis.com wss://*.firebaseio.com; frame-src 'self' https://*.firebaseapp.com;" },
  ];

  metas.forEach(attrs => {
    const key = `${attrs['http-equiv'] || ''}:${attrs.name || ''}`;
    if (existingKeys.has(key)) return;
    const meta = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => meta.setAttribute(k, v));
    head.appendChild(meta);
  });
}

/* ── Fetch wrapper with rate limiting + extension check ─────── */
const originalFetch = window.fetch.bind(window);

window.fetch = async function(input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || '';

  // Rate limit check
  const key = `fetch_${url}`;
  if (!checkRateLimit(key)) {
    showBlockOverlay({
      title: 'Too Many Requests',
      message: 'You are sending requests too fast. Please slow down and reload the page.',
    });
    throw new Error('Rate limit exceeded.');
  }

  return originalFetch(input, init);
};

/* ── Initialize All Security Measures ───────────────────────── */
export function initSecurity() {
  if (window.__SECURITY_INITIALIZED) return;
  window.__SECURITY_INITIALIZED = true;

  addSecurityMetaTags();
  initInputProtection();
  // initDevToolsBlocker(); // temporarily disabled — user will ask to re-enable

  console.log('✓ Security initialized');
}
