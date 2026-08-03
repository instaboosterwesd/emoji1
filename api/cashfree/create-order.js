const CASHFREE_API = 'https://api.cashfree.com/pg';

function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed.' });

  const secret = process.env.CASHFREE_SECRET_KEY;
  const appId = String(req.body?.appId || process.env.CASHFREE_APP_ID || '').trim();
  if (!secret || !appId) return send(res, 503, { message: 'Cashfree production credentials are not configured.' });

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 1) return send(res, 400, { message: 'Invalid payment amount.' });

  const customerId = String(req.body?.customerId || '').trim();
  if (!customerId) return send(res, 400, { message: 'Customer ID is required.' });

  const orderId = `tg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const customerPhone = String(req.body?.customerPhone || '').replace(/\D/g, '').slice(-10) || '9999999999';
  const customerEmail = String(req.body?.customerEmail || '').trim() || `${customerId}@example.com`;
  const payload = {
    order_id: orderId,
    order_amount: Number(amount.toFixed(2)),
    order_currency: 'INR',
    customer_details: {
      customer_id: customerId.slice(0, 50),
      customer_name: String(req.body?.customerName || 'Customer').slice(0, 100),
      customer_email: customerEmail.slice(0, 100),
      customer_phone: customerPhone,
    },
    order_note: 'Wallet top-up',
  };

  try {
    const response = await fetch(`${CASHFREE_API}/orders`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2025-01-01',
        'x-client-id': appId,
        'x-client-secret': secret,
        'x-idempotency-key': orderId,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.payment_session_id) {
      return send(res, response.status >= 400 ? response.status : 502, { message: data.message || 'Cashfree order could not be created.' });
    }
    return send(res, 200, {
      orderId: data.order_id || orderId,
      paymentSessionId: data.payment_session_id,
      orderAmount: payload.order_amount,
    });
  } catch (error) {
    return send(res, 502, { message: 'Cashfree service is unavailable.' });
  }
};