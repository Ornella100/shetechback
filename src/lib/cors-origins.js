const localOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(','),
]
  .filter((origin) => typeof origin === 'string' && origin.trim())
  .map((origin) => origin.trim().replace(/\/$/, ''));

const allowedOrigins = new Set([...localOrigins, ...configuredOrigins]);

export function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.has(origin.replace(/\/$/, ''));
}

export function corsOrigin(origin, callback) {
  callback(null, isAllowedOrigin(origin));
}
