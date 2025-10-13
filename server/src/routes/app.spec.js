/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import request from 'supertest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tdp013-project-test';

import { app } from '../app.js';
import { connectToDatabase, getDb, disconnectFromDatabase } from '../config/database.js';

const db = () => getDb();

describe('Project API', () => {
  let agentAlice;
  let agentBob;
  let alice;
  let bob;

  before(async () => {
    await connectToDatabase();
  });

  after(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await Promise.all([
      db().collection('users').deleteMany({}),
      db().collection('friendships').deleteMany({}),
      db().collection('posts').deleteMany({}),
    ]);
    agentAlice = request.agent(app);
    agentBob = request.agent(app);
  });

  it('walks through registration, friendship, posting and search', async () => {
    const registerAlice = await agentAlice
      .post('/auth/register')
      .send({ username: 'alice', password: 'secret123', displayName: 'Alice' })
      .expect(201);
    alice = registerAlice.body;
    expect(alice).to.include.keys('id', 'username', 'displayName');

    const meAlice = await agentAlice.get('/auth/me').expect(200);
    expect(meAlice.body.user.username).to.equal('alice');

    const registerBob = await agentBob
      .post('/auth/register')
      .send({ username: 'bob', password: 'secret123', displayName: 'Bob' })
      .expect(201);
    bob = registerBob.body;

    const searchResult = await agentAlice.get('/users').query({ query: 'bo' }).expect(200);
    expect(searchResult.body.users).to.have.lengthOf(1);
    expect(searchResult.body.users[0].username).to.equal('bob');

    await agentAlice
      .post('/friends/requests')
      .send({ toUserId: bob.id })
      .expect(201);

    const pending = await agentBob.get('/friends/requests').expect(200);
    expect(pending.body.requests).to.have.lengthOf(1);
    const requestId = pending.body.requests[0].id;

    await agentBob.patch(`/friends/requests/${requestId}`).expect(200);

    const aliceFriends = await agentAlice.get('/friends').expect(200);
    expect(aliceFriends.body.friends.map((f) => f.username)).to.include('bob');
    const bobFriends = await agentBob.get('/friends').expect(200);
    expect(bobFriends.body.friends.map((f) => f.username)).to.include('alice');

    await agentAlice
      .post('/posts')
      .send({ ownerId: alice.id, message: 'Hej från Alice!' })
      .expect(201);

    await agentAlice
      .post('/posts')
      .send({ ownerId: bob.id, message: 'Hej Bob!' })
      .expect(201);

    const bobWall = await agentBob.get('/posts').query({ ownerId: bob.id }).expect(200);
    expect(bobWall.body.posts).to.have.lengthOf(1);
    expect(bobWall.body.posts[0].message).to.equal('Hej Bob!');

    const badPost = await agentAlice
      .post('/posts')
      .send({ ownerId: alice.id, message: '' })
      .expect(400);
    expect(badPost.body.error).to.match(/Meddelandet/);
  });
});
