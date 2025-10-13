import { readSessionCookie, verifySessionToken } from '../lib/security.js';
import { findUserById } from '../repositories/users.js';
import { UnauthorizedError } from '../errors/http-error.js';

export async function authenticate(req, _res, next) {
  const token = readSessionCookie(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = verifySessionToken(token);
    const user = await findUserById(payload.sub);
    if (!user) {
      req.user = null;
      return next();
    }
    req.user = sanitizeUser(user);
    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return next();
}

export function optionalAuth(req, _res, next) {
  return next();
}

function sanitizeUser(user) {
  const { passwordHash, usernameLower, ...rest } = user;
  rest.id = user._id.toString();
  delete rest._id;
  return rest;
}
