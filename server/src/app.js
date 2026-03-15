import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import friendsRouter from './routes/friends.js';
import postsRouter from './routes/posts.js';
import { HttpError } from './errors/http-error.js';
import { authenticate } from './middleware/auth.js';

function buildAllowedOrigins(rawOrigins) {
  const origins = new Set();
  const source = Array.isArray(rawOrigins) ? rawOrigins : [rawOrigins];

  for (const origin of source) {
    if (typeof origin !== 'string' || origin.length === 0) {
      continue;
    }

    origins.add(origin);

    if (origin.includes('127.0.0.1')) {
      origins.add(origin.replace('127.0.0.1', 'localhost'));
    }
    if (origin.includes('localhost')) {
      origins.add(origin.replace('localhost', '127.0.0.1'));
    }
  }

  return origins;
}

const allowedOrigins = buildAllowedOrigins(env.clientOrigins ?? env.clientOrigin);

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
