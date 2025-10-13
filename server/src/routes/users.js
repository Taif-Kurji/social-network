import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { findUserById, searchUsers, updateUserProfile } from '../repositories/users.js';
import { BadRequestError, NotFoundError } from '../errors/http-error.js';
import { findFriendshipBetween } from '../repositories/friendships.js';
import { canViewProfile } from '../services/permissions.js';
import { requireString } from '../lib/validation.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { query = '' } = req.query;
  const results = await searchUsers(String(query));
  res.json({
    users: results.map(stripSensitiveUser),
  });
});

router.get('/:userId', requireAuth, async (req, res) => {
  const target = await findUserById(req.params.userId);
  if (!target) {
    throw new NotFoundError('Användaren hittades inte.');
  }

  const friendship = await findFriendshipBetween(req.user.id, target._id.toString());
  if (!canViewProfile(req.user.id, target._id.toString(), friendship)) {
    throw new BadRequestError('Du är inte vän med den här användaren ännu.');
  }

  res.json(stripSensitiveUser(target));
});

router.patch('/me', requireAuth, async (req, res) => {
  const { displayName, bio } = req.body ?? {};
  const updates = {};
  if (displayName !== undefined) {
    updates.displayName = requireString(displayName, 'Visningsnamnet', { min: 1, max: 40 });
  }
  if (bio !== undefined) {
    updates.bio = requireString(bio, 'Bio', { min: 0, max: 280 });
  }
  const updated = await updateUserProfile(req.user.id, updates);
  res.json(updated);
});

function stripSensitiveUser(user) {
  const { passwordHash, usernameLower, ...rest } = user;
  rest.id = user._id?.toString() ?? user.id;
  delete rest._id;
  return rest;
}

export default router;
