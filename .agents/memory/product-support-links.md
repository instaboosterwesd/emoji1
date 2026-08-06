---
name: Product support links
description: Product feedback and file-update links use built-in defaults with Firebase admin overrides.
---

Product support links should remain usable from built-in defaults even if Firebase configuration is unavailable; Firebase records are the admin-managed override layer for editing, adding, or hiding links.

**Why:** The supplied Telegram links must work immediately, while admins still need to manage links without requiring a frontend release.

**How to apply:** Keep user-facing product/order actions driven by the merged channel list, and preserve a visible disabled File Update action when no update URL has been configured.