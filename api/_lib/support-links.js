const DEFAULT_FEEDBACK_CHANNEL_URL = 'https://t.me/+kaazzM96cLs3ZmJl';

const DEFAULT_GROUP_CHANNELS = [
  { pattern: /\bbala\b/, fileUpdateUrl: 'https://t.me/+272Q3no3ie9lZGNl' },
  { pattern: /\bbr\b|br mod|br mode/, fileUpdateUrl: 'https://t.me/+DTYiBfieU1JhYTY9' },
  { pattern: /dripclient|drip line/, fileUpdateUrl: 'https://t.me/+dL1cxRra1c43ZWQ9' },
  { pattern: /fluorite/, fileUpdateUrl: 'https://t.me/+HFaGDp_8E_9kMzY1' },
  { pattern: /haxx cker/, fileUpdateUrl: 'https://t.me/+wEAjebIfrxZhZTBl' },
  { pattern: /hg cheats/, fileUpdateUrl: 'https://t.me/+Un2b-EXVgudmMTc1' },
  { pattern: /ios all setup|ios setup|gbox|esign|iphone all|ios cloud/, fileUpdateUrl: 'https://t.me/+g2HHYn3X5y1mZmY1' },
  { pattern: /\bkos\b/, fileUpdateUrl: 'https://t.me/+WkGSBvCjVlo5YjE1' },
  { pattern: /migul/, fileUpdateUrl: 'https://t.me/+aFWvR5tU3rM1Yzdl' },
  { pattern: /pato team/, fileUpdateUrl: 'https://t.me/+crO0UPtpG0tjNzU1' },
  { pattern: /prime hook/, fileUpdateUrl: 'https://t.me/+KHQ2r77mt2kwZmQ1' },
  { pattern: /rapid core/, fileUpdateUrl: 'https://t.me/+gl9VOfvlTNI2MjRl' },
  { pattern: /reaper x/, fileUpdateUrl: 'https://t.me/+wc8YzxBjI7FlYzY9' },
  { pattern: /silent cheat ff nonroot/, fileUpdateUrl: 'https://t.me/+IYUi2DMnyZ43Y2Jl' },
  { pattern: /silent cheat/, fileUpdateUrl: 'https://t.me/+rjQ0ou-HB5diZGM9' },
  { pattern: /\bsnake\b/, fileUpdateUrl: 'https://t.me/+MvhvrVPr0ts2YjA1' },
  { pattern: /xyz cheats main id|xyz main id|a xyz main id/, fileUpdateUrl: 'https://t.me/+5owd4nRLLYgxN2Nl' },
  { pattern: /xyz cheats|xyz cheater/, fileUpdateUrl: 'https://t.me/+g33QD2-jTN5hYWRI' },
];

function supportKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function defaultFileUpdateUrlFor(productName) {
  const name = supportKey(productName);
  return DEFAULT_GROUP_CHANNELS.find(rule => rule.pattern.test(name))?.fileUpdateUrl || '';
}

function cleanSupportUrl(value) {
  const url = String(value || '').trim();
  return /^(?:https?:\/\/|\/)/i.test(url) ? url : '';
}

function resolveProductSupportLinks(product, channels = [], community = {}) {
  const productName = product?.name || product?.productName || product?.product || '';
  const match = channels.find(item => supportKey(item.productName) === supportKey(productName));
  const sourceFileUpdateUrl = product?.sourceLinksEnabled === true
    ? product?.sourceFileUpdateUrl || product?.fileUpdateUrl || ''
    : '';
  const catalogFileUpdateUrl = product?.sourceLinksEnabled === true
    ? product?.fileUpdateUrl
    : '';
  const fileUpdateUrl = cleanSupportUrl(
    sourceFileUpdateUrl
      || match?.fileUpdateUrl
      || catalogFileUpdateUrl
      || defaultFileUpdateUrlFor(productName)
      || community?.getFileUrl
      || community?.resellerUpdatesUrl
      || '',
  );
  const feedbackLink = cleanSupportUrl(
    match?.feedbackUrl
      || product?.feedbackUrl
      || DEFAULT_FEEDBACK_CHANNEL_URL
      || community?.helpUrl
      || '',
  );
  return { getFileLink: fileUpdateUrl, feedbackLink };
}

module.exports = {
  DEFAULT_FEEDBACK_CHANNEL_URL,
  DEFAULT_GROUP_CHANNELS,
  supportKey,
  defaultFileUpdateUrlFor,
  cleanSupportUrl,
  resolveProductSupportLinks,
};