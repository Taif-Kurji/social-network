import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ensureMessageLength } from '../lib/validation.js';
import { BadRequestError, NotFoundError } from '../errors/http-error.js';
import { findUserById } from '../repositories/users.js';
import { findFriendshipBetween } from '../repositories/friendships.js';
import { canPostOnWall, canViewProfile } from '../services/permissions.js';
import { createPost, listPostsForOwner } from '../repositories/posts.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { ownerId } = req.query;
  if (typeof ownerId !== 'string') {
    throw new BadRequestError('ownerId måste anges.');
  }
  const owner = await findUserById(ownerId);
  if (!owner) {
    throw new NotFoundError('Användaren hittades inte.');
  }
  const friendship = await findFriendshipBetween(req.user.id, owner._id.toString());
  if (!canViewProfile(req.user.id, owner._id.toString(), friendship)) {
    throw new BadRequestError('Du saknar behörighet att se denna vägg.');
  }
  const posts = await listPostsForOwner(owner._id.toString());
  res.json({
    posts: posts.map((post) => ({
      id: post._id.toString(),
      authorId: post.authorId.toString(),
      ownerId: post.ownerId.toString(),
      message: post.message,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author ? stripUser(post.author) : undefined,
    })),
  });
});

router.post('/', requireAuth, async (req, res) => {
  const { ownerId, message } = req.body ?? {};
  if (typeof ownerId !== 'string') {
    throw new BadRequestError('ownerId måste anges.');
  }
  const owner = await findUserById(ownerId);
  if (!owner) {
    throw new NotFoundError('Användaren hittades inte.');
  }
  const friendship = await findFriendshipBetween(req.user.id, owner._id.toString());
  if (!canPostOnWall(req.user.id, owner._id.toString(), friendship)) {
    throw new BadRequestError('Du får inte posta på den här väggen.');
  }
  const cleanMessage = ensureMessageLength(message);
  const post = await createPost({
    authorId: req.user.id,
    ownerId,
    message: cleanMessage,
  });
  res.status(201).json({
    id: post._id.toString(),
    authorId: post.authorId.toString(),
    ownerId: post.ownerId.toString(),
    message: post.message,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  });
});

function stripUser(user) {
  const { _id, passwordHash, usernameLower, ...rest } = user;
  return { ...rest, id: _id?.toString() ?? user.id };
}

export default router;
