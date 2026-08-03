# Payment gateway setup

The wallet add-funds flow supports two payment methods:

- **UPI** — the existing QR/app-link flow. The user submits a UTR and the admin approves the request.
- **Cashfree Gateway** — Cashfree Production Checkout. A successful gateway payment creates a pending wallet-credit request for admin review.

## Admin settings

Open **Admin → Payment Settings**:

1. Turn **Gateway** on or off.
2. Turn **UPI** on or off.
3. Enter the Cashfree **Production App ID**.
4. Set the gateway extra charge. For example, wallet credit `₹50` and fee `₹5` makes the Cashfree checkout total `₹55`; only `₹50` is credited after approval.
5. Enter the UPI ID if UPI is enabled.
6. Save the settings.

If both methods are enabled, the user sees a payment-method dialog after choosing the amount. If only Gateway is enabled, Cashfree opens directly. If only UPI is enabled, the UPI screen opens directly.

## Cashfree Production secret

The Cashfree **Secret Key must not be entered in the admin panel**. The admin panel is client-side and Firebase values are readable by the browser; storing the secret there would expose the production account.

Add this as a Replit Secret:

```text
CASHFREE_SECRET_KEY
```

The Cashfree server routes use the secret only on the server:

- `POST /api/cashfree/create-order`
- `GET /api/cashfree/verify-order`

The Cashfree App ID may be stored through Admin → Payment Settings because it is not the private credential. The server still requires `CASHFREE_SECRET_KEY` before production orders can be created.

## Important production checks

- Cashfree Production credentials must be paired with `Cashfree({ mode: 'production' })`, which this flow uses.
- Configure Firebase Realtime Database rules so users can create only their own payment requests and only admins can approve/credit them.
- Test with a small real amount after adding the secret and confirming the Cashfree merchant account is activated for production.