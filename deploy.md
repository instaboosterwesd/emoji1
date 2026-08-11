# Deployment

## GitHub Repository

- **Repo**: [yikav542058956/tgselling](https://github.com/yikav542058956/tgselling)
- Code has been pushed to the `main` branch.

## Vercel Deploy (from GitHub)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the **yikav542058956/tgselling** repository
3. Set:
   - **Root Directory**: repository root (`.`)
   - **Framework**: Other
   - **Build Command**: `npm run build --prefix "tg selling"`
   - **Output Directory**: `tg selling/dist`
4. Click **Deploy**

## Vercel Project (already created via API)

- **Project Name**: `tg-selling`
- **Token**: Saved as Replit secret `VERCEL_TOKEN`

## Env Variables (needed in Vercel)

Add these in Vercel project settings → Environment Variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `RESELLER_ENDPOINT` (server-side only; never use a `VITE_` prefix)
- `RESELLER_API_KEY` (server-side only; never use a `VITE_` prefix)
- `RESELLER_MASTER_KEY` (server-side only; never use a `VITE_` prefix)
- `PRODUCTS_SCRAPE_COOKIE` (server-side secret for the live products proxy)

## Public customer API

The app exposes an authenticated API at:

`https://<your-domain>/api/public-api`

Customers use the private key generated in Profile → API settings with either
the `x-api-key` header or `Authorization: Bearer <key>`. The API supports:

- `GET ?action=products` — account catalog, storefront PID, provider purchase PID, durations, prices and stock
- `GET ?action=product&pid=133` — one product by PID
- `GET ?action=balance` — wallet balance
- `POST ?action=buy` — provider purchase, wallet deduction/refund, and Firebase order creation

API purchases are written to `licenseKeys` with `uid`, `source: "api"` and
`apiOrder: true`, so the returned key appears in the same user's My Orders and
can use the existing invoice download. Keep these server-side variables
configured for the API function:

- `FIREBASE_DATABASE_URL` (or the existing `VITE_FIREBASE_DATABASE_URL`)
- `RESELLER_ENDPOINT`
- `RESELLER_API_KEY`
- `RESELLER_MASTER_KEY`

(Values are in Replit secrets — copy them to Vercel)
