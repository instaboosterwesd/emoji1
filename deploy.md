# Deployment

## GitHub Repository

- **Repo**: [yikav542058956/tgselling](https://github.com/yikav542058956/tgselling)
- Code has been pushed to the `main` branch.

## Vercel Deploy (from GitHub)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the **yikav542058956/tgselling** repository
3. Set:
   - **Root Directory**: `tg selling`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
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
- `VITE_RESELLER_ENDPOINT`
- `VITE_RESELLER_API_KEY`
- `VITE_RESELLER_MASTER_KEY`
- `VITE_PRODUCTS_ENDPOINT`

(Values are in Replit secrets — copy them to Vercel)
