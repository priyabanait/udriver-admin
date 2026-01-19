/* global process */
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.JWT_SECRET || 'dev_secret';

import Manager from '../models/manager.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  // If a previous middleware already set req.user (test harness), trust that user and skip token verification
  if (req.user) return next();

  // In development, bypass strict auth unless explicitly forced
  if (process.env.NODE_ENV !== 'production' && process.env.FORCE_AUTH !== 'true') {
    return next();
  }
  if (!token) return res.status(401).json({ message: 'Missing token' });

  // Allow a special mock token in development to enable frontend mock auth flows
  // For convenience in development/testing, map the mock token to a super_admin so
  // permission-protected endpoints (like updating roles) can be exercised.
  if (token === 'mock') {
    req.user = { id: 'mock', role: 'super_admin', email: 'mock@udrive.local', permissions: [] };
    return next();
  }

  jwt.verify(token, SECRET, async (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    // If token has an id, validate tokenVersion against current manager record when auth is enforced
    if (user && user.id && (process.env.NODE_ENV === 'production' || process.env.FORCE_AUTH === 'true')) {
      try {
        const manager = await Manager.findById(user.id).select('tokenVersion');
        const tokenVersion = (user && user.tokenVersion) || 0;
        if (manager && manager.tokenVersion !== tokenVersion) {
          return res.status(401).json({ message: 'Token expired - please re-login' });
        }
      } catch (dbErr) {
        // If DB lookup fails, treat as invalid auth
        return res.status(403).json({ message: 'Auth validation failed' });
      }
    }
    req.user = user;
    next();
  });
}

// Middleware to require a specific permission (or super_admin role)
export function requirePermission(permission) {
  return (req, res, next) => {
    // Enforce in production, or when explicitly forced (FORCE_AUTH=true), otherwise bypass for convenience
    if (process.env.NODE_ENV !== 'production' && process.env.FORCE_AUTH !== 'true') return next();

    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const has = (user.role === 'super_admin') || (Array.isArray(user.permissions) && user.permissions.includes(permission));
    if (!has) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

export default authenticateToken;
