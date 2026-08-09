const RESELLER_ENDPOINT = process.env.RESELLER_ENDPOINT
  || process.env.VITE_RESELLER_ENDPOINT
  || 'https://xyzcheats.com/api/reseller_v1.php';

function send(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function requestParams(body) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return new URLSearchParams(Object.entries(body).filter(([, value]) => value !== undefined && value !== null));
  }
  return new URLSearchParams(String(body || ''));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed.' });

  const apiKey = process.env.RESELLER_API_KEY || process.env.VITE_RESELLER_API_KEY;
  const masterKey = process.env.RESELLER_MASTER_KEY || process.env.VITE_RESELLER_MASTER_KEY;
  if (!apiKey || !masterKey) {
    return send(res, 503, { message: 'Reseller API is not configured on the server.' });
  }

  const incoming = requestParams(req.body);
  const action = String(incoming.get('action') || '').trim().toLowerCase();
  if (!['buy', 'balance'].includes(action)) {
    return send(res, 400, { message: 'Invalid reseller action.' });
  }

  const params = new URLSearchParams({ api_key: apiKey, action });
  for (const name of ['product_id', 'duration', 'android_id']) {
    const value = String(incoming.get(name) || '').trim();
    if (value) params.set(name, value);
  }

  try {
    const upstream = await fetch(RESELLER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-master-key': masterKey,
      },
      body: params,
      signal: AbortSignal.timeout(15000),
    });
    const raw = await upstream.text();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { message: raw };
    }

    return send(res, upstream.ok ? 200 : upstream.status, parsed);
  } catch (error) {
    return send(res, 502, {
      message: error?.name === 'TimeoutError'
        ? 'Reseller API timed out after 15 seconds.'
        : 'Reseller API is unavailable.',
    });
  }
};