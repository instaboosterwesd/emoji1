function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function databaseUrl() {
  return String(process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || '').replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function dbGet(path) {
  const base = databaseUrl();
  if (!base) throw new Error('Firebase database is not configured on the server.');
  const response = await fetch(`${base}/${path.replace(/^\/+/, '')}.json`);
  const raw = await response.text();
  if (!response.ok) throw new Error('Payment request could not be read.');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

async function dbPut(path, value) {
  const base = databaseUrl();
  if (!base) throw new Error('Firebase database is not configured on the server.');
  const response = await fetch(`${base}/${path.replace(/^\/+/, '')}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error('Notification state could not be saved.');
}

async function sendTelegram(text) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  // Keep the requested admin destination working when Vercel has only the
  // bot token configured. It can still be overridden without a code change.
  const chatId = String(
    process.env.TELEGRAM_CHAT_ID
      || process.env.TELEGRAM_ADMIN_CHAT_ID
      || '5844447576',
  ).trim();
  if (!token || !chatId) throw new Error('Telegram notification is not configured.');

  const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) throw new Error('Telegram message was rejected.');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { success: false, message: 'Method not allowed.' });

  let body = req.body;
  if (!body || typeof body !== 'object') {
    try { body = JSON.parse(String(req.body || '{}')); } catch { body = {}; }
  }
  const requestId = String(body?.requestId || '').trim();
  if (!requestId || !/^pay(?:_gateway)?_[a-zA-Z0-9_-]+$/.test(requestId)) {
    return send(res, 400, { success: false, message: 'A valid payment request ID is required.' });
  }

  try {
    const request = await dbGet(`paymentRequests/${encodeURIComponent(requestId)}`);
    if (!request || typeof request !== 'object') {
      return send(res, 404, { success: false, message: 'Payment request not found.' });
    }

    const eventKey = request.method === 'Cashfree' ? 'approved' : String(request.status || 'pending');
    const notificationPath = `telegramNotifications/paymentRequests/${encodeURIComponent(requestId)}/${encodeURIComponent(eventKey)}`;
    if (await dbGet(notificationPath)) {
      return send(res, 200, { success: true, duplicate: true });
    }

    const isReseller = request.type === 'reseller';
    const statusLabel = request.method === 'Cashfree'
      ? 'PAID · AUTO CREDITED'
      : String(request.status || 'pending').toUpperCase();
    const lines = [
      `🔔 <b>${isReseller ? 'Reseller unlock' : 'New deposit'} notification</b>`,
      `💰 Amount: <b>₹${escapeHtml(Number(request.amount || 0).toLocaleString('en-IN'))}</b>`,
      `👤 User: <code>${escapeHtml(request.user || request.uid || 'Unknown')}</code>`,
      `💳 Method: ${escapeHtml(request.method || 'UPI')}`,
      request.senderUpi ? `🧾 UTR: <code>${escapeHtml(request.senderUpi)}</code>` : '',
      request.gatewayOrderId ? `🆔 Gateway order: <code>${escapeHtml(request.gatewayOrderId)}</code>` : '',
      `📌 Status: <b>${escapeHtml(statusLabel)}</b>`,
      `🗂 Request ID: <code>${escapeHtml(requestId)}</code>`,
    ].filter(Boolean);
    await sendTelegram(lines.join('\n'));
    await dbPut(notificationPath, { sentAt: Date.now(), status: request.status || 'pending' });
    return send(res, 200, { success: true });
  } catch (error) {
    console.error('Telegram payment notification failed:', error?.message || error);
    return send(res, 502, { success: false, message: 'Telegram notification failed.' });
  }
};