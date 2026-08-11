const DEFAULT_RESELLER_ENDPOINT = 'https://xyzcheats.com/api/reseller_v1.php';

function providerMessage(value) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  return raw
    .replace(/(?:api[_\s-]?key|master[_\s-]?key|authorization|x-master-key)\s*[:=]\s*[^,\s;]+/gi, '[hidden credential]')
    .replace(/https?:\/\/\S+/gi, '[provider endpoint]')
    .slice(0, 240);
}

function cleanProviderDuration(value) {
  let duration = String(value || '').replace(/\s+/g, ' ').trim();
  if (!duration) return '';
  return duration
    .replace(/\s*(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d+)?/gi, '')
    .replace(/\s*(?:price|mrp|stock|qty|quantity)\s*[:=-]?\s*[\d,]+(?:\.\d+)?/gi, '')
    .replace(/\s*[\(\[]\s*(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d+)?\s*[\)\]]/gi, '')
    .replace(/\s*(?:·|•|\||[-–—])\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKey(data, raw = '') {
  const candidates = [
    data?.key,
    data?.license_key,
    data?.licenseKey,
    data?.key_code,
    data?.code,
    data?.license,
    data?.data?.key,
    data?.data?.license_key,
    data?.data?.licenseKey,
    data?.data?.key_code,
    data?.data?.code,
    data?.data?.license,
    data?.result?.key,
    data?.result?.license_key,
    data?.result?.licenseKey,
    data?.result?.key_code,
    data?.result?.code,
    data?.result?.license,
    typeof data?.data === 'string' ? data.data : '',
    typeof data?.result === 'string' ? data.result : '',
    data?.rawKey,
  ];
  const looksLikeError = value => /(?:error|failed|failure|invalid|insufficient|balance|unavailable|not\s+found|try\s+again|required|expired|duplicate|already)/i.test(value);
  const found = candidates.find(value => typeof value === 'string' && value.trim() && !looksLikeError(value));
  if (found) return found.trim();
  const plain = String(raw || '').trim();
  if (plain && !/^[\[{]/.test(plain) && !/^(ok|success|true|done)$/i.test(plain) && !looksLikeError(plain)) return plain;
  return '';
}

async function buyFromProvider({ productId, duration, androidId = '' }) {
  const endpoint = String(process.env.RESELLER_ENDPOINT || DEFAULT_RESELLER_ENDPOINT).trim();
  const apiKey = String(process.env.RESELLER_API_KEY || '').trim();
  const masterKey = String(process.env.RESELLER_MASTER_KEY || '').trim();
  if (!apiKey || !masterKey || !endpoint) {
    throw new Error('Reseller API is not configured on the server.');
  }

  const providerDuration = cleanProviderDuration(duration);
  if (!providerDuration) throw new Error('Provider duration is missing.');
  const params = new URLSearchParams({
    api_key: apiKey,
    action: 'buy',
    product_id: String(productId),
    duration: providerDuration,
  });
  if (String(androidId).trim()) params.set('android_id', String(androidId).trim());

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-master-key': masterKey,
    },
    body: params,
    signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { message: raw };
  }
  if (!response.ok || data?.status === false || data?.success === false || String(data?.status).toLowerCase() === 'error') {
    throw new Error(providerMessage(data?.message || data?.msg || raw || 'Provider purchase failed.'));
  }
  const key = extractKey(data, raw);
  if (!key) throw new Error(providerMessage(data?.message || 'Provider did not return a license key.'));
  return { key, data };
}

module.exports = { buyFromProvider, cleanProviderDuration, providerMessage };