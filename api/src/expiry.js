const EXPIRY_OPTIONS = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000
};

export function parseExpiry(expiry) {
  if (!expiry || expiry === 'never') {
    return null;
  }

  if (EXPIRY_OPTIONS[expiry]) {
    return new Date(Date.now() + EXPIRY_OPTIONS[expiry]);
  }

  const parsed = new Date(expiry);
  if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
    return undefined;
  }

  return parsed;
}

export function normalizeLanguage(language) {
  if (!language || typeof language !== 'string') {
    return 'plaintext';
  }

  return language.trim().slice(0, 50) || 'plaintext';
}