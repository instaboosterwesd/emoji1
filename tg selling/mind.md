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
VITE_RESELLER_ENDPOINT
VITE_RESELLER_API_KEY
VITE_RESELLER_MASTER_KEY
VITE_PRODUCTS_ENDPOINT
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
https://game-cheats-api.vercel.app/products
```

or `VITE_PRODUCTS_ENDPOINT`.

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
- `price`
- `percent`
- `updatedAt`

Future work: user-side Buy page should apply these pricing overrides before displaying prices.

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
- `public/dashboard-dark.mp4` ~3.2 MB
- `public/devx-logo.png` ~2.3 MB
- `public/dashboard-light.mp4` ~1.3 MB
- Some old 3D PNG icons are large but mostly overridden by `/icons/new/*`.

If mobile feels slow, first compress:

- `devx-logo.png`
- `splash.mp4`
- `dashboard-dark.mp4`
- `dashboard-light.mp4`

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

