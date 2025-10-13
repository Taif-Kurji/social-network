# TDP013 Project – Social Network (Grade 3)

This folder contains the complete implementation of the course project. The goal is a small social network where users can register, become friends, and post messages on their own or their friends’ walls. All code is written with plain HTML/CSS/JavaScript on the client and Node.js/Express + MongoDB on the server.

## Features

- Account creation, login, logout (JWT sessions via HttpOnly cookies)
- Username search with partial matches
- Friend requests (pending → accepted, no duplicates)
- Friend list and personal wall for each user
- Post messages (1–140 characters) on own or accepted friends’ walls
- Input sanitisation both client- and server-side
- Live UI updates via fetch (no full page reloads)
- Backend covered by Mocha/Supertest tests with c8 coverage (~83 %)

## Project Structure

```
project/
├── client/              # Frontend (HTML, CSS, vanilla JS)
├── server/              # Backend (Express, MongoDB)
├── SCRUTINY_NOTES.md    # Presentation/defence cheat sheet
└── README.md            # This file
```

## Prerequisites

- Node.js ≥ 18
- npm
- MongoDB running locally on the default port (27017)

## Backend Setup (`project/server`)

```bash
cd project/server
npm install
cp .env.example .env   # then edit .env
```

` .env` must at least specify:

```
JWT_SECRET=change-this-to-a-random-string
MONGODB_URI=mongodb://localhost:27017/tdp013-project
CLIENT_ORIGIN=http://127.0.0.1:8080
PORT=4000
```

Start the server:

```bash
npm run dev
```

Run the automated tests and coverage:

```bash
npm test
```

The Mocha suite (`src/routes/app.spec.js`) exercises the full user flow: register, friend request, accept, post, validation.

## Frontend Setup (`project/client`)

```bash
cd project/client
npx http-server .
```

Open `http://127.0.0.1:8080` in the browser. The page reads `data-api-base` from the `<body>` tag and talks to the backend using fetch with `credentials: 'include'`.

## Demo Checklist

1. Register two accounts (e.g., Alice and Bob).
2. Log in as Alice, search for Bob, send a friend request.
3. Log in as Bob, accept the request, confirm both friend lists update.
4. Post messages on your own wall and the friend’s wall.
5. Attempt to post an empty message to show validation.
6. Optionally show snippets of the backend (`routes/auth.js`, `routes/friends.js`, `routes/posts.js`) and frontend (`client/app.js`) to explain the flow.

`SCRUTINY_NOTES.md` contains line-by-line references for all important modules, suitable for the seminar presentation (≈6 min talk + 3 min Q&A).

## Submission Notes

- Tag the repository before submitting (e.g., `git tag projekt-v1.0`).
- Ensure README files describe how to run the server, client, and tests.
- Email the seminar teacher with the GitLab link and tag name as per course instructions.

Enjoy the demo! If you continue to develop the project, suggested extensions include real-time chat (socket.io) or rebuilding the frontend with a framework (React, Vue, etc.).
