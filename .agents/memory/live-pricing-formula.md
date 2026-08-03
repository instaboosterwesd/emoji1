---
name: Live pricing formula
description: The agreed default pricing relationship between live API prices and storefront user/reseller prices
---

The default formula is user price = live API price − ₹20 and reseller price = live API price + ₹10, applied to every live product and duration.

**Why:** This was explicitly selected so a ₹50 API price displays as ₹30 for users and ₹60 for resellers, while keeping the source catalog live.

**How to apply:** Keep the formula as the fallback for blank per-row overrides. Admin manual row prices may override the formula for individual products or durations.