---
name: Gateway fee and wallet credit
description: Payment-method fee behavior for wallet top-ups.
---

Gateway charges are percentage-based and added on top of the requested wallet credit; UPI has no extra charge. A user requesting ₹100 with a 2% gateway fee pays ₹102, while exactly ₹100 is credited to the wallet.

**Why:** Users must understand the amount paid without losing the intended wallet top-up amount to payment-processing charges.

**How to apply:** Keep the requested amount as the credit amount, calculate gateway charges separately, and show both the fee and total before checkout. Never apply the gateway fee to UPI deposits.