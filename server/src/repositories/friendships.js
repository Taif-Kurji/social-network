import { getDb, toObjectId } from '../config/database.js';

const STATUS_PENDING = 'pending';
const STATUS_ACCEPTED = 'accepted';

export async function sendFriendRequest(requesterId, recipientId) {
  const db = getDb();
  const now = new Date();
  const doc = {
    requesterId: toObjectId(requesterId),
    recipientId: toObjectId(recipientId),
    status: STATUS_PENDING,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection('friendships').insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function findFriendshipBetween(userIdA, userIdB) {
  const db = getDb();
  const a = toObjectId(userIdA);
  const b = toObjectId(userIdB);
  return db.collection('friendships').findOne({
    $or: [
      { requesterId: a, recipientId: b },
      { requesterId: b, recipientId: a },
    ],
  });
}

export async function acceptFriendRequest(friendshipId) {
  const db = getDb();
  const id = toObjectId(friendshipId);
  const result = await db.collection('friendships').updateOne(
    { _id: id, status: STATUS_PENDING },
    {
      $set: {
        status: STATUS_ACCEPTED,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    return null;
  }

  return db.collection('friendships').findOne({ _id: id });
}

export async function listFriends(userId) {
  const db = getDb();
  const id = toObjectId(userId);

  const pipeline = [
    {
      $match: {
        status: STATUS_ACCEPTED,
        $or: [{ requesterId: id }, { recipientId: id }],
      },
    },
    {
      $project: {
        friendId: {
          $cond: [{ $eq: ['$requesterId', id] }, '$recipientId', '$requesterId'],
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'friendId',
        foreignField: '_id',
        as: 'friend',
        pipeline: [
          { $project: { passwordHash: 0, usernameLower: 0 } },
        ],
      },
    },
    { $unwind: '$friend' },
    {
      $replaceRoot: { newRoot: '$friend' },
    },
  ];

  return db.collection('friendships').aggregate(pipeline).toArray();
}

export async function listPendingRequests(userId) {
  const db = getDb();
  const id = toObjectId(userId);
  return db
    .collection('friendships')
    .aggregate([
      { $match: { recipientId: id, status: STATUS_PENDING } },
      {
        $lookup: {
          from: 'users',
          localField: 'requesterId',
          foreignField: '_id',
          as: 'requester',
          pipeline: [
            { $project: { passwordHash: 0, usernameLower: 0 } },
          ],
        },
      },
      { $unwind: '$requester' },
      {
        $project: {
          _id: 1,
          status: 1,
          createdAt: 1,
          requester: 1,
        },
      },
    ])
    .toArray();
}

export function isFriendshipAccepted(doc) {
  return doc?.status === STATUS_ACCEPTED;
}

export function isFriendshipPending(doc) {
  return doc?.status === STATUS_PENDING;
}
