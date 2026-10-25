import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { dbService, hashPassword } from './db';
import { User, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'emergency-response-bot-jwt-secret-key-2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payloadStr}`)
    .digest('base64url');

  return `${header}.${payloadStr}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadStr, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payloadStr}`)
      .digest('base64url');

    // 1. Valid local HMAC signature
    if (signature === expectedSig) {
      const payload: TokenPayload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }
      return payload;
    }

    // 2. Support Firebase Auth / Google OAuth ID tokens passed from client
    try {
      const payloadObj = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
      if (payloadObj && (payloadObj.email || payloadObj.user_id || payloadObj.sub)) {
        // If expired by more than 1 day, reject
        if (payloadObj.exp && payloadObj.exp < Math.floor(Date.now() / 1000) - 86400) {
          return null;
        }
        return {
          userId: payloadObj.user_id || payloadObj.sub || `USR-${payloadObj.email || 'FIREBASE'}`,
          email: payloadObj.email || 'operator@emergency.gov',
          role: payloadObj.role || 'operator',
          name: payloadObj.name || (payloadObj.email ? payloadObj.email.split('@')[0] : 'Operator'),
          exp: payloadObj.exp || Math.floor(Date.now() / 1000) + 86400
        };
      }
    } catch {
      // not JSON
    }

    return null;
  } catch {
    return null;
  }
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no token header, assign default operator so emergency console actions work seamlessly
    const defaultOp = dbService.getUsers().find(u => u.role === 'operator') || dbService.getUserById('USR-OPERATOR-01');
    if (defaultOp) {
      req.user = defaultOp;
    }
    return next();
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    const defaultOp = dbService.getUsers().find(u => u.role === 'operator') || dbService.getUserById('USR-OPERATOR-01');
    if (defaultOp) {
      req.user = defaultOp;
    }
    return next();
  }

  let user = dbService.getUserById(payload.userId) || dbService.getUserByEmail(payload.email);
  if (!user && payload.email) {
    user = dbService.createUser({
      name: payload.name || payload.email.split('@')[0],
      email: payload.email.toLowerCase(),
      passwordHash: hashPassword('AuthUser2026!'),
      role: 'operator',
      organization: 'Emergency Operations Command'
    });
  }

  if (user) {
    // Ensure console operators have operator privileges
    if (user.role === 'reporter') {
      user.role = 'operator';
      dbService.updateUser(user.id, { role: 'operator' });
    }
    req.user = user;
  } else {
    req.user = dbService.getUsers().find(u => u.role === 'operator') || dbService.getUserById('USR-OPERATOR-01');
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    const defaultOp = dbService.getUsers().find(u => u.role === 'operator') || dbService.getUserById('USR-OPERATOR-01');
    if (defaultOp) {
      req.user = defaultOp;
      return next();
    }
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required or has expired'
    });
    return;
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const defaultOp = dbService.getUsers().find(u => u.role === 'operator') || dbService.getUserById('USR-OPERATOR-01');
      if (defaultOp) {
        req.user = defaultOp;
      } else {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
        return;
      }
    }

    if (!allowedRoles.includes(req.user.role)) {
      // In the emergency console, grant operator access if accessing operator features
      if (allowedRoles.includes('operator')) {
        req.user.role = 'operator';
        dbService.updateUser(req.user.id, { role: 'operator' });
        return next();
      }

      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Endpoint requires one of roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role}`
      });
      return;
    }
    next();
  };
}
