const DEFAULT_ALLOWED_HOSTS = ['adminpanels.shop'];

function allowedHosts() {
  return String(process.env.MEDIA_PROXY_HOSTS || DEFAULT_ALLOWED_HOSTS.join(','))
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedMediaUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || '').trim());
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  const hostname = parsed.hostname.toLowerCase();
  const allowed = allowedHosts().some(host => hostname === host || hostname.endsWith(`.${host}`));
  return allowed ? parsed : null;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function copyHeader(upstream, res, name) {
  const value = upstream.headers.get(name);
  if (value) res.setHeader(name, value);
}

module.exports = async function mediaHandler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, If-Range, If-None-Match');
    return res.end();
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    return sendJson(res, 405, { message: 'Method not allowed.' });
  }

  const rawUrl = String(req.query?.url || '').trim();
  const target = isAllowedMediaUrl(rawUrl);
  if (!target) {
    return sendJson(res, 400, { message: 'Only approved media hosts can be proxied.' });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; TG-Selling-MediaProxy/1.0)',
    Accept: String(req.headers?.accept || '*/*'),
  };
  for (const name of ['range', 'if-range', 'if-none-match']) {
    const value = req.headers?.[name];
    if (value) headers[name] = value;
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });

    res.statusCode = upstream.status;
    res.setHeader('Access-Control-Allow-Origin', '*');
    for (const name of [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified',
      'cache-control',
    ]) {
      copyHeader(upstream, res, name);
    }

    if (req.method === 'HEAD' || !upstream.body) return res.end();

    if (typeof res.write === 'function') {
      for await (const chunk of upstream.body) res.write(Buffer.from(chunk));
      return res.end();
    }

    return res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error('[media] upstream request failed', error?.message || error);
    return sendJson(res, error?.name === 'TimeoutError' ? 504 : 502, {
      message: 'Media source is temporarily unavailable.',
    });
  }
};