---
name: Vercel nested app build
description: Deployment configuration for repositories whose Vite app lives inside a subdirectory.
---

When Vercel's project root is the repository root but the Vite app lives in a subdirectory, configure the root-level Vercel build and output paths explicitly rather than relying on the nested app's config.

**Why:** Vercel otherwise runs `vite build` from the repository root and Rolldown reports that it cannot resolve `index.html`, even though the app builds correctly from its own directory.

**How to apply:** Keep the root `vercel.json` build/install commands pointed at the nested app and set `outputDirectory` to that app's `dist` folder. Test those exact commands locally before pushing.