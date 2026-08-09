---
name: Device-bound API purchases
description: Provider purchase behavior for Bala products, API key validation, and fallback delivery.
---

Bala products are device-bound: API purchases require a buyer-provided Android ID, while non-Bala products must keep the existing request shape. Only a real provider key counts as API success; missing keys, provider errors, timeouts, or empty-fund responses go through the manual fallback, then refund and admin alert if no fallback exists. DM/Only Contact products bypass the API.

**Why:** The provider requires `android_id` only for Bala Mod, and treating an error JSON or success-without-key response as a license key would prevent fallback delivery.

**How to apply:** Detect Bala by product name, collect the ID before balance deduction, pass it only on non-DM Bala API buys, enforce a bounded provider request, validate common key fields, and preserve My Orders/copy behavior through the saved license record.