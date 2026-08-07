# Payment gateway setup

The wallet add-funds flow supports two payment methods:

- **UPI** — the existing QR/app-link flow. The user submits a UTR and the admin approves the request.
- **Cashfree Gateway** — Cashfree Production Checkout. A verified successful gateway payment credits the wallet instantly and creates an approved request/history record for the admin.

## Admin settings

Open **Admin → Payment Settings**:

1. Turn **Gateway** on or off.
2. Turn **UPI** on or off.
3. Enter the Cashfree **Production App ID**.
4. Set the gateway extra charge. For example, wallet credit `₹50` and fee `₹5` makes the Cashfree checkout total `₹55`; only `₹50` is credited instantly after verification.
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
- Configure Firebase Realtime Database rules so users can create only their own payment requests and only admins can approve manual UPI requests. Cashfree requests are verified and auto-credited after a successful gateway response.
- Test with a small real amount after adding the secret and confirming the Cashfree merchant account is activated for production.

## Telegram community and key reset tools

Open **Admin → Payment Settings** and use **Telegram community links**:

- **Reseller All Update / Join link** appears for reseller accounts on the dashboard and profile.
- **Get File link** appears after a successful purchase and inside each order.
- **Get Help link** powers the floating Telegram help button across the user dashboard.

Users can open an order in **My Orders**, choose **Reset Key**, enter a reason, and submit it. The request is stored as pending and appears in the admin settings panel. Admin can approve or reject it; an optional replacement key can be entered while approving. The user then sees the approved or rejected status in the order details.