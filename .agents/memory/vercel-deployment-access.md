---
name: Vercel deployment access
description: Durable Vercel integration behavior for this workspace
---

Vercel's connected account may not be able to see a newly created private GitHub repository even when GitHub CLI can push it. In that case, the Vercel connector API can create an unlinked project and deploy an already-built static artifact through the file upload and deployment endpoints.

**Why:** The Vercel CLI token was not injected into the shell, and the Vercel-side GitHub import returned `repo_not_found`, while the connected Vercel API remained usable.

**How to apply:** Prefer a normal linked deployment when Vercel has repository access. If not, use the connector proxy, disable project build/install commands for a prebuilt static deployment, upload files with their SHA-1 digests, and verify the deployment's `READY` state. Check deployment protection separately because an otherwise ready Vercel URL may redirect unauthenticated requests to Vercel SSO.