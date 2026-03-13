import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { BadRequestError, NotFoundError } from '../errors/http-error.js';
import {
  acceptFriendRequest,
  findFriendshipBetween,
  isFriendshipAccepted,
  isFriendshipPending,
  listFriends,
  listPendingRequests,
  sendFriendRequest,
} from '../repositories/friendships.js';
import { findUserById } from '../repositories/users.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const friends = await listFriends(req.user.id);
  res.json({ friends: friends.map(stripId) });
});

router.get('/requests', requireAuth, async (req, res) => {
  const requests = await listPendingRequests(req.user.id);
  res.json({ requests: requests.map(mapRequest) });
});

router.post('/requests', requireAuth, async (req, res) => {
  const { toUserId } = req.body ?? {};
  if (typeof toUserId !== 'string') {
    throw new BadRequestError('Mottagar-id saknas.');
  }
  if (toUserId === req.user.id) {
    throw new BadRequestError('Du kan inte skicka en vänförfrågan till dig själv.');
  }
  const recipient = await findUserById(toUserId);
  if (!recipient) {
    throw new NotFoundError('Användaren hittades inte.');
  }
  const existing = await findFriendshipBetween(req.user.id, toUserId);
  if (existing) {
    if (isFriendshipAccepted(existing)) {
      throw new BadRequestError('Ni är redan vänner.');
    }
    if (isFriendshipPending(existing)) {
      throw new BadRequestError('Det finns redan en väntande vänförfrågan.');
    }
  }
  const created = await sendFriendRequest(req.user.id, toUserId);
  res.status(201).json(mapRequest(created));
});

router.patch('/requests/:requestId', requireAuth, async (req, res) => {
  const updated = await acceptFriendRequest(req.params.requestId);
  if (!updated || updated.recipientId.toString() !== req.user.id) {
    throw new NotFoundError('Vänförfrågan hittades inte.');
  }
  res.json(mapRequest(updated));
});

function stripId(user) {
  const { _id, passwordHash, usernameLower, ...rest } = user;
  return { ...rest, id: user._id?.toString() ?? user.id };
}

function mapRequest(doc) {
  return {
    id: doc._id?.toString() ?? doc.id,
    requesterId: doc.requesterId?.toString() ?? doc.requester?.id,
    recipientId: doc.recipientId?.toString() ?? doc.recipient?.id,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    requester: doc.requester ? stripId(doc.requester) : undefined,
  };
}

export default router;
