const CASHFREE_API = 'https://api.cashfree.com/pg';

function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'GET') return send(res, 405, { message: 'Method not allowed.' });

  const appId = String(req.query?.app_id || process.env.CASHFREE_APP_ID || '').trim();
  const secret = process.env.CASHFREE_SECRET_KEY;
  const orderId = String(req.query?.order_id || '').trim();
  if (!appId || !secret) return send(res, 503, { message: 'Cashfree production credentials are not configured.' });
  if (!/^tg_[a-z0-9_]+$/i.test(orderId)) return send(res, 400, { message: 'Invalid Cashfree order ID.' });

  try {
    const response = await fetch(`${CASHFREE_API}/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        accept: 'application/json',
        'x-api-version': '2025-01-01',
        'x-client-id': appId,
        'x-client-secret': secret,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return send(res, response.status, { message: data.message || 'Payment verification failed.' });
    return send(res, 200, {
      status: data.order_status || 'UNKNOWN',
      orderId: data.order_id || orderId,
      orderAmount: Number(data.order_amount || 0),
      currency: data.order_currency || 'INR',
    });
  } catch (error) {
    return send(res, 502, { message: 'Cashfree verification service is unavailable.' });
  }
};