const SCRAPE_ENDPOINT = 'https://vercel-api-seven-sepia.vercel.app/scrape';

function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'GET') return send(res, 405, { message: 'Method not allowed.' });

  const cookie = String(process.env.PRODUCTS_SCRAPE_COOKIE || '').trim();
  if (!cookie) return send(res, 503, { message: 'Live products API is not configured.' });

  try {
    const response = await fetch(`${SCRAPE_ENDPOINT}?cookie=${encodeURIComponent(cookie)}`, {
      headers: { accept: 'application/json' },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data?.products)) {
      return send(res, response.status >= 400 ? response.status : 502, {
        message: data?.message || 'Live products could not be loaded.',
      });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return send(res, 200, {
      success: true,
      source: data.source || 'LIVE',
      count: data.products.length,
      products: data.products,
    });
  } catch {
    return send(res, 502, { message: 'Live products service is unavailable.' });
  }
};