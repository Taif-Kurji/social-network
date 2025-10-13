import { MongoClient, ObjectId } from 'mongodb';
import { env } from './env.js';

let client;
let db;

export async function connectToDatabase(uri = env.mongoUri) {
  if (client) {
    return db;
  }
  client = new MongoClient(uri, {
    ignoreUndefined: true,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  db = client.db();
  await ensureIndexes();
  return db;
}

async function ensureIndexes() {
  const users = db.collection('users');
  await users.createIndex({ usernameLower: 1 }, { unique: true });

  const friendships = db.collection('friendships');
  await friendships.createIndex(
    { requesterId: 1, recipientId: 1 },
    { unique: true },
  );
  await friendships.createIndex({ recipientId: 1, status: 1 });
  await friendships.createIndex({ requesterId: 1, status: 1 });

  const posts = db.collection('posts');
  await posts.createIndex({ ownerId: 1, createdAt: -1 });
  await posts.createIndex({ authorId: 1, createdAt: -1 });
}

export function getDb() {
  if (!db) {
    throw new Error('Database not connected');
  }
  return db;
}

export function toObjectId(id) {
  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    throw new Error('Ogiltigt id');
  }
  return new ObjectId(id);
}

export async function disconnectFromDatabase() {
  if (!client) {
    return;
  }
  await client.close();
  client = undefined;
  db = undefined;
}
