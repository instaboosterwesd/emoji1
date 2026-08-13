function send(res, status, body) {
  if (typeof res.status === 'function') res.status(status);
  else res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
  }
  res.end(JSON.stringify(body));
}

function requestBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  try {
    return JSON.parse(String(req.body || '{}'));
  } catch {
    return {};
  }
}

function imageBbKey() {
  return String(
    process.env.IMAGEBB_API_KEY
      || process.env.IMGBB_API_KEY
      || process.env.IMGBB_KEY
      || '',
  ).trim();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed.' });

  const key = imageBbKey();
  if (!key) {
    return send(res, 503, {
      message: 'Image upload is not configured. Add IMAGEBB_API_KEY in the server environment, or paste an image URL.',
    });
  }

  const body = requestBody(req);
  const image = String(body.image || '').trim();
  if (!image) return send(res, 400, { message: 'Select an image to upload.' });
  if (image.length > 12_000_000) return send(res, 413, { message: 'Image is too large. Use an image under 9 MB.' });

  const imageValue = image.replace(/^data:[^;]+;base64,/, '');
  try {
    const upstream = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ image: imageValue }),
      signal: AbortSignal.timeout(30_000),
    });
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = {}; }
    if (!upstream.ok || data?.success === false || !data?.data?.url) {
      return send(res, 502, { message: String(data?.error?.message || data?.status_txt || 'Image upload failed.').slice(0, 180) });
    }
    return send(res, 200, {
      success: true,
      url: data.data.url,
      displayUrl: data.data.display_url || data.data.url,
    });
  } catch (error) {
    return send(res, 502, {
      message: error?.name === 'TimeoutError' ? 'Image upload timed out.' : 'Image upload service is unavailable.',
    });
  }
};