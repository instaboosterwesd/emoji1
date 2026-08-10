---
name: Provider duration boundary
description: Provider purchase APIs require canonical duration labels separate from storefront display prices and stock metadata
---

Provider purchase requests must receive a canonical duration label only; storefront prices, stock counts, and other display metadata belong in separate fields.

**Why:** Imported or scraped catalog text can combine values such as a duration and selling price, causing exact provider catalog lookups to fail and triggering an unnecessary refund.

**How to apply:** Normalize duration values at import, catalog-read, live-product mapping, and final request boundaries. Keep the storefront price as the amount deducted from the user.