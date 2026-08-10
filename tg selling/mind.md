# Project Mind / Developer Handoff

## Project summary

This is a mobile-first React + Vite web app for a Telegram-style selling panel. It supports phone OTP login, Google login, private API-key login, a user dashboard, product buying UI, wallet/profile flows, and a new admin control panel at `/admin`.

Primary project path:

`C:\Users\admin\Documents\tg selling`

Dev server:

```bash
npm.cmd run dev
```

Local URL:

```text
http://localhost:5173/
http://localhost:5173/admin
```

## Current tech stack

- React
- Vite
- Firebase Auth + Firebase Realtime Database
- Sonner toast
- Vaul drawer
- Lucide React icons
- React Icons for Google icon
- CSS-only glass/liquid UI animations

Important source files:

- `src/main.jsx` — main UI, login, dashboard, admin page, dialogs, product cards.
- `src/services.js` — Firebase, OTP API, reseller API, product API, admin helpers.
- `src/styles.css` — original large UI stylesheet.
- `src/feature-fixes.css` — final override stylesheet for latest fixes, premium motion, admin UI, icon overrides.
- `vite.config.js` — Vite config and watcher ignores.

## Environment / config

`.env` contains Firebase and API config. Do not hard-code secrets in UI if avoidable.

Expected env keys:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
RESELLER_ENDPOINT
RESELLER_API_KEY (Replit Secret; server-side only)
RESELLER_MASTER_KEY (Replit Secret; server-side only)
PRODUCTS_SCRAPE_COOKIE
```

## Auth behavior

### Phone OTP login

India phone OTP uses this endpoint pattern:

- Send OTP: `https://rozgarapinew.teachx.in/get/sendotp?phone=...`
- Verify OTP: `https://rozgarapinew.teachx.in/get/otpverify?...`

Valid OTP response must include:

- `status === 200`
- `message === "OTP is Valid"`
- `user.userid`
- `user.token`

Wrong OTP must not log in.

After valid OTP:

- `ensurePhoneUser()` creates user in Firebase if missing.
- User UID is `external_${userid}` if API returns userid, otherwise `phone_${number}`.
- Existing Firebase role/balance should be preserved.

### Google login

Uses Firebase Auth popup and `ensureGoogleUser()`.

### Bot / API login

Profile API settings generate a private API key.

- Only hash is stored in Firebase.
- Plain API key is shown only at generation/reset time.
- Bot login checks the hashed API key under `apiKeys/{hash}` and loads linked user.

## User dashboard

Current user-side tabs:

- Dashboard
- Buy
- My Orders
- Wallet
- Profile

Dashboard shows:

- My balance
- Today sales
- Monthly sales
- My purchases
- Active
- Recent key sold
- Admin button only if `profile.role === "admin"`

The admin button opens:

```text
/admin
```

Do not show referral/coupons for now.

## Product buying UI

Products load from:

```text
/api/products
```

The server-side `/api/products` proxy reads the live scraper cookie from the `PRODUCTS_SCRAPE_COOKIE` secret and does not expose it to the browser.

Product UI rules:

- Load limited products first; load more button increments.
- Search and filters are present.
- Thumbnail image is video poster/thumbnail.
- Clicking thumbnail plays product video if available.
- Product brand icons are mapped in `productBrandIcons`.
- Product card and feature cards have premium glass/motion styling.
- Feature cards have connector lines and rotating border motion.
- Buy Now opens pricing cards with drop motion.
- Pricing selection opens confirm purchase dialog.
- Regular users see live API prices; resellers use fixed reseller rules and fall back to ₹20 below the live user price when no fixed reseller rule exists.

## Product brand icon mappings

Currently mapped in `src/main.jsx`:

- APK MC
- BR
- Dripclient
- Fluorite
- HG
- Hikari
- iOS Cloud CODM
- GBox Certificate
- KOS
- Migul
- Pato Team
- Prime Hook
- Rapid Core
- Reaper X
- Snake
- XYZ
- Silent

Assets are in:

```text
public/icons/brands/
```

Fallback product icon:

```text
public/icons/new/product-box.png
```

## Wallet / profile

Wallet:

- Shows available balance.
- Add funds button currently shows toast only; real gateway/manual payment flow is pending.
- Transaction history has search/date UI and refresh.

Profile:

- Shows name, email/phone, balance, status.
- Edit profile dialog changes name and optional small photo data.
- Change password stores salted SHA-256 hash in Firebase.
- API settings generate/reset private API key.
- Logout must ask confirmation.

## Admin panel

Admin page path:

```text
/admin
```

Access:

- User must be logged in.
- `session.role` must be `admin`.
- Non-admin sees locked page.

Admin UI:

- Mobile responsive.
- Glass dashboard.
- Top/side tab section.
- Tab section can be minimized/collapsed.
- Uses premium motion and shine styles.

Admin tabs currently implemented:

1. Dashboard
2. Announcements
3. Users
4. Resellers
5. Products
6. License Keys
7. Payments
8. Reports
9. UPI Settings

### Admin dashboard

Shows:

- Total revenue
- Active users
- Keys sold
- Pending deposit
- Quick actions
- Inventory status

### Announcements

Can create announcement records in:

```text
announcements/{ann_id}
```

### Manage users

Reads from:

```text
users/
```

Can:

- Search users
- Add/subtract balance
- Toggle reseller flag
- Ban/unban user
- Show created date if present

Fund changes also create transaction records:

```text
transactions/{tx_id}
```

### Manage resellers

Writes to:

```text
resellers/{username_id}
```

Password is salted and hashed before saving.

### Manage products

Reads live product API.

Admin pricing rules save to:

```text
adminProductPricing/{pid_duration}
```

Fields:

- `pid`
- `duration`
- `price` — fixed user-facing price
- `resellerPrice` — fixed reseller-facing price when configured
- `updatedAt`

The user-side Buy page applies fixed `price`/`resellerPrice` overrides when present. Otherwise the global product pricing formula applies to every live product and duration: user price is API price minus ₹20, and reseller price is API price plus ₹10. The formula is stored in `settings/productPricing`.

### License keys

Reads from:

```text
licenseKeys/
```

Shows:

- Product/name
- Username/user id
- Duration
- Key code
- Status

Delete action sets the key record to `null`.

### Payment requests

Reads from:

```text
paymentRequests/
```

Can approve/reject by updating `status`.

### Reports

Reads:

```text
transactions/
```

HWID reset/key reset section is scaffolded and currently empty.

Future expected collection:

```text
hwidResetRequests/
```

### UPI settings

UPI ID saves to:

```text
settings/payment/upiId
```

QR preview is generated from UPI ID using a public QR endpoint in UI.

## Firebase data model currently used

```text
users/{uid}
apiKeys/{apiKeyHash}
transactions/{txId}
announcements/{annId}
resellers/{resellerId}
adminProductPricing/{ruleId}
licenseKeys/{keyId}
paymentRequests/{requestId}
settings/payment/upiId
```

User fields commonly expected:

```text
uid
role: "user" | "admin"
name
email
phone
photoData
balance
totalPurchase
todaySales
monthlySales
myPurchases
active
status: "active" | "banned"
reseller: boolean
createdAt
updatedAt
apiKeyHash
apiKeyLast4
passwordSalt
passwordHash
```

## Security note

Admin UI is client-side. Firebase Realtime Database rules must enforce:

- Only authenticated/admin users can read/write admin collections.
- Users can only read/write their own profile-safe fields.
- Balance, role, status, license keys, transactions, payment approvals must not be writable by normal users.

Do not rely only on UI hiding.

## Performance notes

### Current known heavy assets

Large public files:

- `public/splash.mp4` ~4 MB
- `public/devx-logo.png` ~2.3 MB
- `public/dashboard-dark-bg.png` — dark mode background image (blue night scene)
- `public/dashboard-light-bg.webp` — light mode background image (warm golden night scene)
- Some old 3D PNG icons are large but mostly overridden by `/icons/new/*`.

Note: `dashboard-dark.mp4` and `dashboard-light.mp4` are still present in `public/` but are no longer used — the dashboard backdrop was switched from `<video>` to `<img>` to use these two static images instead.

If mobile feels slow, first compress:

- `devx-logo.png`
- `splash.mp4`
- `dashboard-dark-bg.png` (convert to webp)
- `dashboard-light-bg.webp`

### Material icons folder

The folder:

```text
material-design-icons-4.0.0
material-design-icons-4.0.0.zip
```

is not imported by the app and is not in `public`, so it does not download in browser.

However, because it is inside project root, Vite dev server file watching can become slow. `vite.config.js` now ignores:

```text
material-design-icons-4.0.0/**
material-design-icons-4.0.0.zip
flaticon-proxy/**
dist/**
node_modules/**
```

If still slow, move the material folder outside the project root, for example:

```text
C:\Users\admin\Documents\tg selling-assets\material-design-icons-4.0.0
```

### Artificial loading delay

Older dashboard tab switches had a 420ms skeleton delay. This has been removed. Real loading remains for API/Firebase calls.

## Styling rules / design language

Keep the UI:

- Mobile-first
- Dark glass/liquid style
- Premium/luxury feel
- Cyan/purple highlights
- No harsh white icons
- No fake/dummy order data
- Prefer empty states when real data is absent
- Use user logo/brand instead of text name like DevX where possible

Important final overrides live in:

```text
src/feature-fixes.css
```

When fixing visual issues, prefer adding final overrides there instead of editing earlier conflicting CSS in `styles.css`, because `styles.css` has many historical overrides.

## Do not add right now

- Referral
- Coupons
- Fake order data
- Fake transaction data
- Loading animation beyond skeleton unless user provides/approves

## Session log — Replit setup & UI fixes (Jul 31 2026)

### Replit environment setup

- Project "tg selling" को Replit पर run करने के लिए `vite.config.js` update किया:
  - `server.host: true` — Replit proxy के लिए ज़रूरी
  - `server.allowedHosts: true` — iframe preview के लिए
  - `server.port: parseInt(process.env.PORT || '5173')` — workflow env var से port read करता है
- सभी `.env` variables और `PRODUCTS_SCRAPE_COOKIE` Replit secrets/env में set किए (Firebase, reseller API, और live products proxy)
- Python deps (`flask`, `flask-cors`, `curl_cffi`) Replit package manager से install किए
- दो workflows configure किए:
  - **TG Selling App** — `cd 'tg selling' && npx vite --host` (port 5173, webview)
  - **Flaticon Proxy** — `cd 'tg selling/flaticon-proxy' && python3 server.py` (port 8080, console)

### Icon system — dual icon problem & fix

**Problem**: CSS `::before` pseudo-elements (in `styles.css` और `feature-fixes.css`) custom PNG icons inject करते हैं। साथ ही JSX में `<MatIcon>` (material SVG `<img>`) भी था → हर button पर **दो icons** दिखते थे।

**Logic**: CSS `::before` के icons को रहने दो (ये "Material 3 new" icons हैं — `/icons/new/` folder से)। JSX के `<MatIcon>` हटाओ।

**Fixes applied**:
- Bottom nav (5 buttons): सभी `iconName` props हटाए navItems से। Render में `{icon && <MatIcon>}` conditional बनाया ताकि undefined पर error न आए।
- Deposit button (Dashboard + Wallet दोनों): `<MatIcon name="add_circle">` हटाया। CSS `::before` का `plus.png` / `add-fund-glass.svg` रहा।
- Profile action buttons (Edit, Change password, API settings, Logout): सभी `<MatIcon>` हटाए। CSS `::before` में पहले से `edit.png`, `shield.png`, `key-color.png`, `logout.png` थे।

### Dashboard stat cards — icon consistency fix

**Problem**: Stat cards 1 & 2 (Today sales, Monthly sales) में CSS `::before` icons थे। Stat cards 3 & 4 (My purchases, Active keys) में `<MatIcon>` img था → inconsistent look + extra space above icon।

**Fix**:
- Stat cards 1 & 2 से `iconName` prop already absent था (पहले remove हुआ था)।
- Stat cards 3 & 4 से `iconName="shopping_cart"` और `iconName="verified_user"` हटाए।
- `feature-fixes.css` में CSS `::before` add किए:
  - `.stats-grid .stat-card:nth-child(3):before` → `buy.png` (nav का Buy icon — user ने select करके indicate किया)
  - `.stats-grid .stat-card:nth-child(4):before` → `key.png`

### Feature card list icons

**Problem**: Product feature list items में `auto_awesome` और `flash_on` MatIcons alternate होते थे — generic, unrelated to product theme।

**Fix**: MatIcons को project के `/icons/new/` folder से replace किया:
- Even index → `premium.png`
- Odd index → `key-color.png`
- Inline `style` में `filter: brightness(0) invert(1) drop-shadow(...)` — purple glow effect।

### Buy Now button icon

- `<MatIcon name="shopping_bag">` को `<img src="/icons/new/buy.png">` से replace किया — same icon जो bottom nav के Buy button पर है।

### Icon system — summary logic

```
/icons/new/       → app का primary icon set (PNG, premium look)
/icons/material/  → MatIcon SVG source (legacy, avoid in new buttons)
CSS ::before      → buttons पर icon inject करता है (profile-actions, bottom-nav, stat-cards, add-funds)
JSX img tag       → direct inline icons के लिए (feature list, buy button, dialog titles)
```

**Rule**: जब CSS `::before` already icon दे रहा हो, JSX में `<MatIcon>` मत रखो — double हो जाएगा।

---

## Lottie animation on buttons / UI elements

### How to use a Telegram premium emoji as a live animated icon in React

**Packages needed:**

```bash
# already installed in tg selling/
lottie-web
```

**Step 1 — Get the Lottie JSON**

Download the emoji pack using EmojiSaver script:

```bash
cd /home/runner/workspace/EmojiSaver
python download_pack.py <pack_name>
```

Or if you have a `.tgs` file (Telegram sticker), convert it:

```python
import gzip, json
json_data = gzip.decompress(open("sticker.tgs","rb").read())
open("sticker.json","wb").write(json_data)
```

Or the user can share the `.json` file directly (EmojiSaver outputs it too).

**Step 2 — Put JSON in public folder**

```bash
cp sticker.json "tg selling/public/icons/new/my-emoji.json"
```

**Step 3 — Use the `LottieIcon` component (already in `src/main.jsx`)**

```jsx
<LottieIcon src="/icons/new/my-emoji.json" size={26} />
```

Props:
- `src` — path to the Lottie JSON in `/public/`
- `size` — width & height in px (default 24)
- `loop` — true = loop forever (default), false = play once

**Component code (already exists in `src/main.jsx` above `WalletView`):**

```jsx
function LottieIcon({ src, size = 24, loop = true, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: 'svg',
      loop,
      autoplay: true,
      path: src,
    });
    return () => anim.destroy();
  }, [src, loop]);
  return (
    <span
      ref={ref}
      className={className}
      style={{ display: 'inline-block', width: size, height: size, verticalAlign: 'middle' }}
    />
  );
}
```

**Currently used on:**

| Location | How added | JSON |
|---|---|---|
| "I have paid" button in Scan & Pay dialog | `<LottieIcon>` inline in JSX | `/icons/new/verified-check.json` |
| "My purchases" stat card (Dashboard) | `lottieIcon` prop on `<Stat>` | `/icons/new/shopping-cart.json` |
| "Buy" bottom nav button | `lottieIcon` in `navItems` array | `/icons/new/shopping-cart.json` |
| "Dashboard" bottom nav button | `lottieIcon` in `navItems` array | `/icons/new/shop-store.json` |
| "My Orders" bottom nav button | `lottieIcon` in `navItems` array | `/icons/new/my-orders.json` |
| "Wallet" bottom nav button | `lottieIcon` in `navItems` array | `/icons/new/wallet-lottie.json` |
| "Profile" bottom nav button | `lottieIcon` in `navItems` array | `/icons/new/profile-lottie.json` |
| Duration label in pricing cards | `<LottieIcon>` inline in JSX | `/icons/new/timer.json` |
| "Today sales" stat card (Dashboard) | `lottieIcon` prop on `<Stat>` | `/icons/new/today-sales.json` (emoji1 — rising red graph chart) |
| "Monthly sales" stat card (Dashboard) | `lottieIcon` prop on `<Stat>` | `/icons/new/monthly-sales.json` (emoji1 — green money bag with $ and bow) |
| "Active keys" stat card (Dashboard) | `lottieIcon` prop on `<Stat>` | `/icons/new/active-keys.json` (emoji1 — rainbow crystal gem) |
| Admin button on Dashboard | `<LottieIcon>` inline in JSX | `/icons/new/crown.json` (emoji1 — orange/gold crown) |
| Username h3 in Profile card | `<LottieIcon>` inline after name text | `/icons/new/verified-badge.json` (user-uploaded — red verified checkmark badge, 22px) |

**Important:** `lottie-web` import is at top of `src/main.jsx`:

```js
import lottie from 'lottie-web';
```

---

### Quick reference — where to add Lottie icons in this project

#### Bottom nav button

1. Copy JSON to `tg selling/public/icons/new/my-icon.json`
2. In `navItems` array (`src/main.jsx`), add `lottieIcon: '/icons/new/my-icon.json'` to the nav item:
   ```js
   { id: 'buy', label: 'Buy', lottieIcon: '/icons/new/my-icon.json' },
   ```
3. The nav render already handles it — it shows `<LottieIcon>` and adds class `has-lottie` to the button.
4. `feature-fixes.css` already has rules that hide the CSS `::before` PNG and un-hide the SVG for `.has-lottie` buttons — **no CSS change needed**.

#### Dashboard stat card (stats-grid)

1. Copy JSON to `tg selling/public/icons/new/my-icon.json`
2. Pass `lottieIcon` prop to the `<Stat>` component:
   ```jsx
   <Stat label="My purchases" value={...} lottieIcon="/icons/new/my-icon.json" />
   ```
3. Make sure the matching CSS `::before` rule for that stat card is removed from `feature-fixes.css` (search for `stat-card:nth-child(N):before`).

#### Any other button / inline location

Just drop `<LottieIcon>` directly:
```jsx
<LottieIcon src="/icons/new/my-icon.json" size={26} />
```

#### ⚠ CSS gotcha — SVGs hidden in bottom-nav

`styles.css` has `.bottom-nav button svg { display: none }`.
This kills Lottie (which renders an SVG). Always counter it with:
```css
.bottom-nav button.has-lottie svg { display: block !important; }
```
This rule already exists in `feature-fixes.css` — do not remove it.

#### ⚠ CSS gotcha — stat card ::before specificity

If a stat card has a specific `::before` override in `feature-fixes.css` (e.g. `.stats-grid .stat-card:nth-child(4):before`), that rule is **more specific** than `.stat-card.has-lottie:before { display: none }`, so the CSS icon keeps showing alongside the Lottie icon.

Fix: add a more specific suppression rule after the existing one:
```css
.stats-grid .stat-card.has-lottie:nth-child(4):before {
  display: none !important;
}
```
This pattern already exists in `feature-fixes.css` for the 4th stat card (Active keys).

---

## emoji1 folder — uploaded emoji pack

### Location

```text
/home/runner/workspace/emoji1/
```

### Structure

128 emojis. Each emoji is in its own folder named by Telegram file ID:

```text
emoji1/
  <file_id>/
    <file_id>.json    ← Lottie JSON (animated, use with lottie-web) ✅ use this
    <file_id>.lottie  ← ZIP archive format (not plain JSON, skip)
    <file_id>.png     ← rendered PNG 512×512 (static preview)
    <file_id>.tgs     ← raw gzipped TGS file
```

Use `.json` (not `.lottie`) with `LottieIcon` in React.

### How to use an emoji from emoji1

```bash
# Copy the JSON to tg selling public folder with a readable name:
cp "/home/runner/workspace/emoji1/<file_id>/<file_id>.json" "tg selling/public/icons/new/my-name.json"
```

Then in React:
```jsx
<LottieIcon src="/icons/new/my-name.json" size={26} />
```

### Already added from emoji1 (Aug 2026)

| File saved as | emoji1 folder ID | What it looks like | Used where |
|---|---|---|---|
| `today-sales.json` | `CAACAgUAAxUAAWps78tZIbBxH9AeMakQlT-17vhGAALBGAAC0OSoVt5MSz7-hRzRPQQ` | Red upward-trending line chart on blue grid | Today sales stat card |
| `monthly-sales.json` | `CAACAgUAAxUAAWps78tw-tTNGv-_AWkBB4se3kxHAAI8FAACrs2IVjujX9BK8deYPQQ` | Green money bag with $ sign and gold bow | Monthly sales stat card |
| `active-keys.json` | `CAACAgUAAxUAAWps78v1wVhSNC8jxf3atRiQ3Ff5AAKLHAACVsSJVhdpTjjfxkO5PQQ` | Rainbow/iridescent crystal gem, glowing | Active keys stat card |
| `crown.json` | `CAACAgUAAxUAAWps78sKzdgs8SQQIIBR1dWe4lBOAAJbFQACuBCIVvFbNQUTzOI9PQQ` | Orange & gold royal crown with gems | Admin button on Dashboard |

### Other good emojis in emoji1 (not yet used — available for future)

| emoji1 folder ID | What it looks like | Good for |
|---|---|---|
| `CAACAgUAAxUAAWps78sHwyf1CdGT8j96Xi7Ndaa4AALoFQAC33GJViJPwOGFDir3PQQ` | Doge coin with sunglasses holding cash | Wallet / balance / rich vibes |
| `CAACAgUAAxUAAWps78slwthx5Sg7ntROiXzOWhG4AAK9HAACmgSQVhMz3ywHfPPkPQQ` | Blue creature lying on a pile of cash with gold chain & crown | Wallet balance / "rich" state |
| `CAACAgUAAxUAAWps78t0BYDaS2IFvflh2GVRgv33AAIFFgACEkuhVsc4-xQdqHpgPQQ` | Orange megaphone | Admin Announcements section |
| `CAACAgUAAxUAAWps78usHAUjqJ9RDyB6x62pRsHpAAIrFQAC21qQViYyM13ro3RMPQQ` | Gold lion head with crown | Admin dashboard header / premium branding |
| `CAACAgUAAxUAAWps78uUWrx_RKZTt1WF22jHe-XGAAK-GQACHZKIVg1Azizin4JTPQQ` | Blue/purple glowing lightsaber | Active keys / power / hacker theme |
| `CAACAgUAAxUAAWps78te2SROuU5AtHFI_p6KAYN5AAJ-EgACZmeJVvL3LnfrEmBEPQQ` | Classic red/orange fire flame | Hot products / trending |
| `CAACAgUAAxUAAWps78sWgTJ8UgyHVZu2pQVIyuAvAAIaGwAC5ReIVvMwDuf-ZTTVPQQ` | Two red lightning bolts | Active / power / speed |
| `CAACAgUAAxUAAWps78tP--ww3SqWk9cH4DAHUMo_AAI5FwAClmRQVQHVaRhmDOk8PQQ` | Blue verified checkmark badge (Twitter-style) | Verified users / status |
| `CAACAgUAAxUAAWps78tT6k75oa77vdA3rutowPV4AALzEQACnY2pVtBUEInJk-i8PQQ` | Telegram app icon (octagon, paper plane, cyan glow) | Bot login / Telegram-related UI |
| `CAACAgUAAxUAAWps78s9jLRM9UqBv1L943xC9d6rAAJ0GwACWJuYVkGMxDYuuJK0PQQ` | 3D silver/white Telegram paper plane | Telegram branding |
| `CAACAgUAAxUAAWps78uuOWIfz5Y-Xn0x8-R_-WVlAAJgFwACI5KRVi5j96-CIx97PQQ` | Purple grim reaper with scythe (cute style) | Hacker/dark theme elements |
| `CAACAgUAAxUAAWps78uZVc3VaKyakqaDy32vikGiAAI9IQACGXSIVpzcvrlxNs7EPQQ` | Purple crystal ball with skull inside | Hacker/mystery theme |
| `CAACAgUAAxUAAWps78v4t2JASCFo5xccj25CO5NnAAJOHgACI2qIViPUZVmqc-JMPQQ` | Red rose held in a golden fist | Premium / VIP gift |
| `CAACAgUAAxUAAWps78tMdoPyDWdyJS1fnOsMzrgPAAJJIgAC8haIVnSjd3p9pLTJPQQ` | Gold Rolex-style wristwatch (green dial, crown logo) | Time-based stats / premium |
| `CAACAgUAAxUAAWps78ufg6TH1MgxkfgwnkmmAAGdjgACEhcAAjvPoVb6XufmA9KoRj0E` | Two colorful gift boxes (orange+green, red+purple) | Rewards / gifts / offers |

---

## Common next tasks

1. Apply admin pricing rules to Buy page displayed prices.
2. Save real order/license key after reseller purchase.
3. Show user My Orders from Firebase.
4. Build manual deposit flow:
   - User enters amount.
   - UPI QR shown.
   - Payment request saved.
   - Admin approves/rejects.
   - Balance updates on approve.
5. Add HWID reset request flow from user order action.
6. Add Firebase security rules.
7. Compress video/logo assets for faster mobile load.

---

## EmojiSaver — Telegram premium emoji downloader

### Location

```text
/home/runner/workspace/EmojiSaver/
```

### Purpose

Download Telegram premium emoji packs (TGS animated stickers) as **512×512 PNG files** for use on the website. No full bot infrastructure needed — uses a standalone script.

### Script

```text
EmojiSaver/download_pack.py
```

### How to run

```bash
cd /home/runner/workspace/EmojiSaver
python download_pack.py <pack_name_or_t.me_link>
```

Examples:

```bash
python download_pack.py glasses_emojique_by_TgEmojis_bot
python download_pack.py https://t.me/addemoji/glasses_emojique_by_TgEmojis_bot
python download_pack.py https://t.me/addstickers/SomeStickerPack
```

### Auth

Bot token stored as Replit secret: `EMOJI_BOT_TOKEN`

Script reads it automatically — no .env file needed.

### Output structure (per-emoji subfolders)

हर emoji का अपना folder होता है:

```text
EmojiSaver/downloaded/<pack_name>/
    0001/
        sticker.tgs       ← raw TGS animated file (gzipped Lottie)
        sticker.png       ← rendered PNG 512×512 (first frame)
        lottie.json       ← decompressed Lottie JSON (for lottie-web in React)
        info.json         ← emoji metadata (emoji char, file_id, keywords, type)
    0002/
        ...
    0NNN/
        ...
EmojiSaver/downloaded/<pack_name>.zip   ← ZIP of full folder tree (same structure)
```

**Note:** Static WebP stickers → `sticker.png` + `sticker.webp`. Video (WebM) stickers → `sticker.webm` only (no TGS).

### Pack name from t.me URL

`https://t.me/addemoji/glasses_emojique_by_TgEmojis_bot` → pack name: **`glasses_emojique_by_TgEmojis_bot`**

### Script features

- **Resume support** — अगर download बीच में रुक जाए तो दोबारा run करने पर already-downloaded emoji folders skip होते हैं (`info.json` + sticker file exists check)
- **Retry logic** — network reset पर auto-retry (3 attempts with backoff)
- **ZIP** — हर pack का automatically ZIP बनता है same folder structure के साथ

### Conversion notes

- Animated emojis → **TGS** (gzip Lottie JSON) → PNG via `rlottie-python` + `lottie.json` extract
- Static stickers → **WebP** → PNG via Pillow + WebP saved
- Video stickers → **WebM** → saved as-is

### Installed Python packages

`requests`, `rlottie-python`, `Pillow`, `python-dotenv` — workspace venv में installed।

### Packs downloaded (23/23 complete ✅)

सभी packs यहाँ हैं: `EmojiSaver/downloaded/`

| # | Pack name | Emojis |
|---|---|---|
| 1 | `Iam_Hacker7_by_fStikBot` | 176 |
| 2 | `NewsEmoji` | 100 |
| 3 | `EwaLooter_by_fStikBot` | 182 |
| 4 | `NewPacksVickyTricks_by_fStikBot` | 84 |
| 5 | `ARPANPAPA` | 200 |
| 6 | `InterfaceElements` | 140 |
| 7 | `StellarRocketSkins` | 50 |
| 8 | `CupidCharmSkins` | 50 |
| 9 | `SnoopCigarSkins` | 50 |
| 10 | `sti_created_by_by_TgEmojis_bot` | 200 |
| 11 | `KripanshEmojis_by_fStikBot` | 200 |
| 12 | `CARDERS_by_TgEmojis_bot` | 163 |
| 13 | `tmeaddemojieee5e_by_fStikBot` | 200 |
| 14 | `var1ous_by_TgEmodziBot` | 156 |
| 15 | `FinanceEmoji` | 60 |
| 16 | `DSPSIR_by_TgEmojis_bot` | 199 |
| 17 | `WhiteXModz` | 197 |
| 18 | `Topics` | 112 |
| 19 | `TONEmoji` | 45 |
| 20 | `t_me_PAID_HACKS_UPDATE_by_fStikBot` | 131 |
| 21 | `EmojiMoskva` | 200 |
| 22 | `emoji_7685f_by_TgEmojis_bot` | 133 |
| 23 | `ANTI_LLONG12_by_TgEmojis_bot` | 77 |

**Total: ~3,115 emojis downloaded**

### किसी pack का emoji React में use करना

```bash
# किसी भी emoji की lottie.json copy करो tg selling/public/ में:
cp EmojiSaver/downloaded/FinanceEmoji/0001/lottie.json "tg selling/public/icons/new/finance-emoji.json"
```

फिर React में `LottieIcon` component से use करो (already in `src/main.jsx`):

```jsx
<LottieIcon src="/icons/new/finance-emoji.json" size={26} />
```

### नया pack download करना

```bash
cd /home/runner/workspace/EmojiSaver && python download_pack.py <pack_name>
```

Output: `EmojiSaver/downloaded/<pack_name>/` folder + `.zip`

