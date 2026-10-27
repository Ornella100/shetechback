import jwt from 'jsonwebtoken';

export function verifierToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Accès refusé — token manquant' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: 'Token invalide ou expiré' });
  }
}

// Comme verifierToken mais sans bloquer : req.user est défini si un token valide est fourni
export function verifierTokenOptionnel(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch { /* visiteur anonyme */ }
  }
  next();
}

export function verifierAdmin(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Accès réservé aux admins' });
  next();
}

export function verifierMentorOuAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'mentor')
    return res.status(403).json({ message: 'Acces reserve aux mentors et admins' });
  next();
}
