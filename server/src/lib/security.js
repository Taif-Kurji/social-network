import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;
const SESSION_COOKIE = 'session';
const TOKEN_TTL = 60 * 60 * 24 * 7;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signSessionToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifySessionToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: TOKEN_TTL * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.cookie(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 0,
    path: '/',
  });
}

export function readSessionCookie(req) {
  return req.cookies?.[SESSION_COOKIE] ?? null;
}
