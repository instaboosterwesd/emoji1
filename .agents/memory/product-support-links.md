---
name: Product support links
description: Product feedback and file-update links use built-in defaults with Firebase admin overrides.
---

Product support links should remain usable from built-in defaults even if Firebase configuration is unavailable. Feedback uses one official channel, while File Update uses product-name/brand group mappings; Firebase records are the admin-managed override layer.

**Why:** The supplied Telegram links must work immediately, pasted source pages must not replace the official feedback channel, and new product variants should inherit the correct brand's file channel.

**How to apply:** Keep user-facing product/order actions driven by the merged channel list. The catalog source-links switch controls only pasted File Update URLs; when off, group defaults apply. Preserve a visible disabled File Update action when no URL is configured.