import { getDb, toObjectId } from '../config/database.js';
import { sanitizeHtml } from '../lib/validation.js';

export async function createPost({ authorId, ownerId, message }) {
  const db = getDb();
  const now = new Date();
  const doc = {
    authorId: toObjectId(authorId),
    ownerId: toObjectId(ownerId),
    message: sanitizeHtml(message),
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection('posts').insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function listPostsForOwner(ownerId, { limit = 50 } = {}) {
  const db = getDb();
  return db
    .collection('posts')
    .aggregate([
      { $match: { ownerId: toObjectId(ownerId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
          pipeline: [{ $project: { passwordHash: 0, usernameLower: 0 } }],
        },
      },
      { $unwind: '$author' },
      { $limit: limit },
    ])
    .toArray();
}
