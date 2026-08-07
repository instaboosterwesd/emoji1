---
name: Catalog import replacement
description: User and reseller source imports replace the selected catalog completely.
---

Importing a User or Reseller source is a full snapshot replacement: products missing from the latest source must be removed from that catalog, while the other catalog remains untouched.

**Why:** The source page is the authoritative current product list; merging old products caused stale products and pricing to remain visible.

**How to apply:** Preserve the selected catalog's metadata and source-link mode, but write the complete newly parsed product array with `set`, not a partial merge.