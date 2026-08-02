const CACHE = 'tg-static-v3';
const ASSETS = [
  /* ── Lottie JSONs ─────────────────────── */
  '/icons/new/active-keys.json','/icons/new/add-funds-plus.json','/icons/new/api-settings.json',
  '/icons/new/arrows-up-green.json','/icons/new/back-arrow-emoji.json','/icons/new/balance-emoji.json',
  '/icons/new/bank-emoji.json','/icons/new/bell.json','/icons/new/buy-now-btn.json',
  '/icons/new/calendar.json','/icons/new/change-password.json','/icons/new/choose-amount-emoji.json',
  '/icons/new/close-emoji.json','/icons/new/confirm-buy-emoji.json','/icons/new/confirm-purchase-emoji.json',
  '/icons/new/crown.json','/icons/new/custom-amount-emoji.json',
  '/icons/new/digit-0.json','/icons/new/digit-1.json','/icons/new/digit-2.json','/icons/new/digit-3.json',
  '/icons/new/digit-4.json','/icons/new/digit-5.json','/icons/new/digit-6.json','/icons/new/digit-7.json',
  '/icons/new/digit-8.json','/icons/new/digit-9.json','/icons/new/download-emoji.json',
  '/icons/new/edit-profile.json','/icons/new/edit-title-emoji.json',
  '/icons/new/feat-crystal-skull.json','/icons/new/feat-doge.json','/icons/new/feat-fire.json',
  '/icons/new/feat-gift-boxes.json','/icons/new/feat-lightning.json','/icons/new/feat-lightsaber.json',
  '/icons/new/feat-reaper.json','/icons/new/feat-rolex.json','/icons/new/feat-rose-fist.json',
  '/icons/new/feat-verified-badge.json',
  '/icons/new/gift-code.json','/icons/new/google-lottie.json',
  '/icons/new/history-emoji.json','/icons/new/history-title-emoji.json',
  '/icons/new/issue-resolved.json',
  '/icons/new/key-emoji.json','/icons/new/key-lottie.json',
  '/icons/new/lock-emoji.json','/icons/new/logout-flash.json',
  '/icons/new/magnet-emoji.json','/icons/new/min-deposit-emoji.json','/icons/new/money-bag.json',
  '/icons/new/monthly-sales.json','/icons/new/my-orders.json','/icons/new/my-purchases.json',
  '/icons/new/new-password-emoji.json',
  '/icons/new/otp-clipboard.json',
  '/icons/new/phone-arrow.json','/icons/new/phone-rocket.json','/icons/new/phone-spidey.json',
  '/icons/new/pig-emoji.json','/icons/new/platform-emoji.json','/icons/new/play-btn.json',
  '/icons/new/play-emoji.json','/icons/new/proceed-emoji.json','/icons/new/profile-lottie.json',
  '/icons/new/qr-hint-emoji.json','/icons/new/qr-scan.json',
  '/icons/new/refresh-emoji.json','/icons/new/rupee-coin-cart.json','/icons/new/rupee-emoji.json',
  '/icons/new/save-emoji.json','/icons/new/search-emoji.json','/icons/new/send-emoji.json',
  '/icons/new/send-flash.json','/icons/new/shield-verify.json','/icons/new/shopping-cart.json',
  '/icons/new/shop-store.json','/icons/new/signin-flame.json','/icons/new/source-rocket.json',
  '/icons/new/status-mail.json',
  '/icons/new/telegram-lottie.json','/icons/new/timer.json','/icons/new/today-emoji.json',
  '/icons/new/today-sales.json','/icons/new/topup-emoji.json','/icons/new/track-emoji.json',
  '/icons/new/verified-badge.json','/icons/new/verified-check.json',
  '/icons/new/wallet-lottie.json','/icons/new/welcome-emoji.json','/icons/new/welcome-yoda.json',

  /* ── Material SVGs ────────────────────── */
  '/icons/material/account_balance_wallet.svg','/icons/material/account_circle.svg',
  '/icons/material/add_circle.svg','/icons/material/add.svg','/icons/material/admin_panel_settings.svg',
  '/icons/material/api.svg','/icons/material/arrow_back.svg','/icons/material/arrow_forward.svg',
  '/icons/material/assessment.svg','/icons/material/assignment.svg','/icons/material/auto_awesome.svg',
  '/icons/material/block.svg','/icons/material/campaign.svg','/icons/material/check_circle.svg',
  '/icons/material/check.svg','/icons/material/close.svg','/icons/material/content_copy.svg',
  '/icons/material/credit_card.svg','/icons/material/dashboard.svg','/icons/material/delete.svg',
  '/icons/material/description.svg','/icons/material/dollar_sign.svg','/icons/material/edit.svg',
  '/icons/material/error.svg','/icons/material/expand_less.svg','/icons/material/expand_more.svg',
  '/icons/material/file_upload.svg','/icons/material/filter_list.svg','/icons/material/flash_on.svg',
  '/icons/material/history.svg','/icons/material/info.svg','/icons/material/inventory.svg',
  '/icons/material/key.svg','/icons/material/lock.svg','/icons/material/logout.svg',
  '/icons/material/menu.svg','/icons/material/payment.svg','/icons/material/people.svg',
  '/icons/material/person.svg','/icons/material/photo_camera.svg','/icons/material/qr_code.svg',
  '/icons/material/receipt_long.svg','/icons/material/refresh.svg','/icons/material/schedule.svg',
  '/icons/material/search.svg','/icons/material/settings.svg','/icons/material/shield.svg',
  '/icons/material/shopping_bag.svg','/icons/material/shopping_cart.svg','/icons/material/show_chart.svg',
  '/icons/material/star.svg','/icons/material/trending_up.svg','/icons/material/verified_user.svg',
  '/icons/material/visibility_off.svg','/icons/material/visibility.svg','/icons/material/vpn_key.svg',
  '/icons/material/warning.svg',

  /* ── Brand icons ──────────────────────── */
  '/icons/brands/apk-mc.png','/icons/brands/br.png','/icons/brands/dripclient.png',
  '/icons/brands/fluorite-ios-ff.png','/icons/brands/gbox-certificate.png','/icons/brands/hg.png',
  '/icons/brands/hikari.png','/icons/brands/ios-cloud-codm.png','/icons/brands/kos.png',
  '/icons/brands/migul.png','/icons/brands/pato-team.png','/icons/brands/prime-hook.png',
  '/icons/brands/rapid-core.png','/icons/brands/reaper-x.png','/icons/brands/silent.png',
  '/icons/brands/snake.png','/icons/brands/xyz.png',

  /* ── Static page images ───────────────── */
  '/icons/new/add-fund-glass.svg','/icons/new/add-plus.png','/icons/new/api-code.png',
  '/icons/new/buy.png','/icons/new/product-box.png','/icons/new/profile.png',
  '/icons/new/recent-order-blue.png','/icons/new/recent-order.png','/icons/new/recent-order-telegram.png',
  '/icons/new/recent.png','/icons/new/recent-tracking.png','/icons/new/reset-key-icon.png',
  '/icons/new/save-money.png','/icons/new/shield.png','/icons/new/transaction-history.png',
  '/icons/new/transaction-receipt.png','/icons/new/verified-check.png','/icons/new/wallet.png',

  /* ── Nav icons ─────────────────────────── */
  '/icons/home.png','/icons/orders.png','/icons/profile.png','/icons/wallet.png',

  /* ── 3D icons ──────────────────────────── */
  '/icons/active-3d.webp','/icons/api-3d.webp','/icons/deposit-3d.webp','/icons/edit-3d.webp',
  '/icons/logout-3d.webp','/icons/purchase-3d.webp',

  /* ── Logos & backgrounds ──────────────── */
  '/devx-logo.webp','/devx-logo.png','/telegram-logo.png',
  '/dashboard-dark-bg.webp','/dashboard-light-bg.webp',
  '/splash.webm','/splash-poster.jpg',
];

/* ── Install: populate cache ──────────────────── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Batch-add; individual failures don't block the rest
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(() => {/* skip single failure */})
        )
      );
    })
  );
  self.skipWaiting();
});

/* ── Activate: purge old caches ──────────────── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch: cache-first for assets, network-first for API ──── */
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin GETs
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  // Static assets (icons, JSON, images, fonts) → cache-first
  if (/\.(json|svg|png|webp|jpg|jpeg|webm|mp4|woff2?)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Everything else (HTML, JS, API) → network-first, fallback to cache
  e.respondWith(
    fetch(request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => {
        // Only cache same-origin successful responses
        if (clone.ok && !url.pathname.startsWith('/api/')) {
          c.put(request, clone);
        }
      });
      return res;
    }).catch(() => caches.match(request))
  );
});
