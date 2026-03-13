import { getDb, toObjectId } from '../config/database.js';
import { sanitizeHtml } from '../lib/validation.js';

export async function createUser({ username, passwordHash, displayName }) {
  const db = getDb();
  const now = new Date();
  const doc = {
    username,
    usernameLower: username.toLowerCase(),
    passwordHash,
    displayName: sanitizeHtml(displayName),
    bio: '',
    avatarUrl: '',
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection('users').insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function findUserByUsername(username) {
  const db = getDb();
  return db.collection('users').findOne({ usernameLower: username.toLowerCase() });
}

export async function findUserById(id) {
  const db = getDb();
  return db.collection('users').findOne({ _id: toObjectId(id) });
}

export async function searchUsers(query, { limit = 10 } = {}) {
  const db = getDb();
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }
  return db
    .collection('users')
    .find({ usernameLower: { $regex: trimmed, $options: 'i' } })
    .project({ passwordHash: 0, usernameLower: 0 })
    .limit(limit)
    .toArray();
}

export async function updateUserProfile(id, { displayName, bio, avatarUrl }) {
  const db = getDb();
  const updates = {
    updatedAt: new Date(),
  };
  if (displayName !== undefined) {
    updates.displayName = sanitizeHtml(displayName);
  }
  if (bio !== undefined) {
    updates.bio = sanitizeHtml(bio);
  }
  if (avatarUrl !== undefined) {
    updates.avatarUrl = avatarUrl.trim();
  }

  const { value } = await db
    .collection('users')
    .findOneAndUpdate(
      { _id: toObjectId(id) },
      { $set: updates },
      { returnDocument: 'after', projection: { passwordHash: 0, usernameLower: 0 } },
    );
  return value;
}
