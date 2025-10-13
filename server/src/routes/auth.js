import { Router } from 'express';
import { BadRequestError } from '../errors/http-error.js';
import { ensurePassword, ensureUsername, requireString } from '../lib/validation.js';
import { clearSessionCookie, hashPassword, setSessionCookie, signSessionToken, verifyPassword } from '../lib/security.js';
import { createUser, findUserByUsername } from '../repositories/users.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, password, displayName = '' } = req.body ?? {};
  const normalizedUsername = ensureUsername(username);
  ensurePassword(password);
  const trimmedDisplayName = requireString(displayName || normalizedUsername, 'Visningsnamn', {
    min: 1,
    max: 40,
  });

  const existing = await findUserByUsername(normalizedUsername);
  if (existing) {
    throw new BadRequestError('Användarnamnet är upptaget.');
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({
    username: normalizedUsername,
    passwordHash,
    displayName: trimmedDisplayName,
  });

  const token = signSessionToken({ sub: user._id.toString() });
  setSessionCookie(res, token);
  res.status(201).json(sanitizeUser(user));
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  const normalizedUsername = ensureUsername(username);
  ensurePassword(password);

  const user = await findUserByUsername(normalizedUsername);
  if (!user) {
    throw new BadRequestError('Felaktigt användarnamn eller lösenord.');
  }

  const match = await verifyPassword(password, user.passwordHash);
  if (!match) {
    throw new BadRequestError('Felaktigt användarnamn eller lösenord.');
  }

  const token = signSessionToken({ sub: user._id.toString() });
  setSessionCookie(res, token);
  res.json(sanitizeUser(user));
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get('/me', (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  return res.json({ user: req.user });
});

function sanitizeUser(user) {
  const { passwordHash, usernameLower, ...rest } = user;
  rest.id = user._id.toString();
  delete rest._id;
  return rest;
}

export default router;
