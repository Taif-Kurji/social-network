import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import friendsRouter from './routes/friends.js';
import postsRouter from './routes/posts.js';
import { HttpError } from './errors/http-error.js';
import { authenticate } from './middleware/auth.js';

function toAlternateLocalhostOrigin(origin) {
  if (origin.includes('localhost')) {
    return origin.replace('localhost', '127.0.0.1');
  }
  if (origin.includes('127.0.0.1')) {
    return origin.replace('127.0.0.1', 'localhost');
  }
  return null;
}

const allowedOrigins = new Set();
for (const origin of env.clientOrigins) {
  allowedOrigins.add(origin);
  const alternateOrigin = toAlternateLocalhostOrigin(origin);
  if (alternateOrigin) {
    allowedOrigins.add(alternateOrigin);
  }
}

export const app = express();

app.disable('x-powered-by');

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(authenticate);

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/friends', friendsRouter);
app.use('/posts', postsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Resursen hittades inte.' });
});

app.use((err, req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Ogiltig JSON.' });
  }
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'Ett internt fel inträffade.' });
});
