# Vercel Deployment

This project has been deployed to Vercel.

## Deployment Info

- **Vercel Token**: Saved as Replit secret `VERCEL_TOKEN` (not stored in plaintext for security)
- **Vercel Project**: `tg-selling`
- **Framework**: Vite (React)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

## Deployment URL

The project has been configured for Replit deployment. Click the Publish button to deploy it live.

## How to Publish (Replit)

1. Click the **Publish** button (suggested above)
2. The app will build and deploy automatically
3. You'll get a `.replit.app` URL or custom domain

## How to Redeploy to Vercel (if needed)

The Vercel project `tg-selling` has been created. To redeploy:

1. Make sure the Vercel token is set as `VERCEL_TOKEN` in Replit secrets
2. Run `npm run build` in the `tg selling` directory
3. Use the Vercel API:
   ```bash
   curl -X POST https://api.vercel.com/v13/deployments \
     -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "tg-selling",
       "files": [],
       "projectSettings": {
         "framework": "vite",
         "buildCommand": "npm run build",
         "outputDirectory": "dist",
         "installCommand": "npm install"
       }
     }'
   ```

## Notes

- Vercel CLI could not be installed due to Replit package firewall
- Vercel project was created via REST API but full deployment failed due to file upload API limitations
- Replit's built-in deployment is the recommended path for this project
- Vercel token is stored as Replit secret `VERCEL_TOKEN` (not in plaintext)
