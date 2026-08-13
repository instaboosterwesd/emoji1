const { resellerEndpoint } = require('./_lib/reseller');

function send(res, status, body) {
  if (typeof res.status === 'function') res.status(status);
  else res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
  }
  if (typeof res.end === 'function') res.end(JSON.stringify(body));
}

function requestParams(body) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return new URLSearchParams(Object.entries(body).filter(([, value]) => value !== undefined && value !== null));
  }
  return new URLSearchParams(String(body || ''));
}

module.exports = async function handler(req, res) {
  try {
    return await handleRequest(req, res);
  } catch (error) {
    console.error('[reseller] unhandled request error', error);
    return send(res, 500, { message: 'Reseller API request failed on the server.' });
  }
};

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  // Vercel invokes this function for /api/reseller and /api/reseller/status
  // with different req.url values depending on the routing configuration.
  // Any GET is safe to treat as a configuration-status request because
  // purchases are POST-only.
  if (req.method === 'GET') {
    const endpoint = resellerEndpoint();
    const configured = Boolean(
      process.env.RESELLER_API_KEY
      && process.env.RESELLER_MASTER_KEY
      && endpoint,
    );
    return send(res, configured ? 200 : 503, {
      configured,
      endpointConfigured: Boolean(endpoint),
      credentialsConfigured: Boolean(
        process.env.RESELLER_API_KEY && process.env.RESELLER_MASTER_KEY,
      ),
      message: configured
        ? 'Reseller API is configured server-side.'
        : 'Set RESELLER_API_KEY, RESELLER_MASTER_KEY, and RESELLER_ENDPOINT in the production environment.',
    });
  }

  if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed.' });

  // These values must remain server-side. Never accept credentials from the
  // browser or fall back to VITE_ variables, which are bundled into the SPA.
  const apiKey = process.env.RESELLER_API_KEY;
  const masterKey = process.env.RESELLER_MASTER_KEY;
  if (!apiKey || !masterKey) {
    return send(res, 503, { message: 'Reseller API is not configured on the server.' });
  }

  const endpoint = resellerEndpoint();
  let endpointUrl;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    return send(res, 503, { message: 'RESELLER_ENDPOINT must be a full https:// provider URL.' });
  }
  const requestHost = String(req.headers?.host || '').split(':')[0].toLowerCase();
  const endpointHost = endpointUrl.hostname.toLowerCase();
  if (
    requestHost
    && endpointHost === requestHost
    && endpointUrl.pathname.replace(/\/+$/, '') === '/api/reseller'
  ) {
    return send(res, 503, {
      message: 'RESELLER_ENDPOINT points back to this app. Set it to the upstream reseller provider URL, not /api/reseller.',
    });
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
    const upstream = await fetch(endpointUrl, {
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
}