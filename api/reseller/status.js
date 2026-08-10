// Keep the status route separate so Vercel resolves
// /api/reseller/status instead of sending it through the SPA rewrite.
module.exports = require('../reseller.js');