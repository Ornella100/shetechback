const localOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(','),
]
  .filter((origin) => typeof origin === 'string' && origin.trim())
  .map((origin) => origin.trim().replace(/\/$/, ''));

// Domaine Vercel de production. Garder cette origine autorisée par défaut
// évite une panne complète du site si CORS_ORIGINS n'est pas configuré sur Render.
const productionOrigins = [
  'https://shetechfront-kwuu.vercel.app',
  'https://shetech-woman.vercel.app',
];

const allowedOrigins = new Set([...localOrigins, ...productionOrigins, ...configuredOrigins]);

export function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.has(origin.replace(/\/$/, ''));
}

export function corsOrigin(origin, callback) {
  callback(null, isAllowedOrigin(origin));
}
