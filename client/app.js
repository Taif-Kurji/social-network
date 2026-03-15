const apiBase = resolveApiBase();
const usesApi = Boolean(apiBase);

const els = {
  authCard: document.querySelector('#authCard'),
  loginForm: document.querySelector('#loginForm'),
  registerForm: document.querySelector('#registerForm'),
  logoutButton: document.querySelector('#logoutButton'),
  authStatus: document.querySelector('#authStatus'),
  searchCard: document.querySelector('#searchCard'),
  searchInput: document.querySelector('#searchInput'),
  searchResults: document.querySelector('#searchResults'),
  requestsCard: document.querySelector('#requestsCard'),
  requestsList: document.querySelector('#requestsList'),
  friendsCard: document.querySelector('#friendsCard'),
  friendsList: document.querySelector('#friendsList'),
  showOwnWallBtn: document.querySelector('#showOwnWallBtn'),
  wallCard: document.querySelector('#wallCard'),
  wallTitle: document.querySelector('#wallTitle'),
  wallSubtitle: document.querySelector('#wallSubtitle'),
  postForm: document.querySelector('#postForm'),
  postMessage: document.querySelector('#postMessage'),
  postCounter: document.querySelector('#postCounter'),
  postsList: document.querySelector('#postsList'),
  postsEmpty: document.querySelector('#postsEmpty'),
  messageArea: document.querySelector('#messageArea'),
};

const MESSAGE_LIMIT = 140;
const SEARCH_DEBOUNCE = 250;

const state = {
  user: null,
  friends: [],
  requests: [],
  searchResults: [],
  activeWall: null,
  walls: new Map(),
  searchTimer: null,
};

init();

function init() {
  bindEvents();
  if (usesApi) {
    bootstrap();
  } else {
    showMessage('Backend är inte konfigurerad. Kontrollera data-api-base.', 'danger');
  }
}

function resolveApiBase() {
  const fromQuery = new URLSearchParams(window.location.search).get('apiBase') || '';
  const fromDataset = document.body.dataset.apiBase || '';
  const fromStorage = localStorage.getItem('apiBase') || '';
  const fallback = `${window.location.protocol}//${window.location.hostname}:4000`;

  const chosen = (fromQuery || fromDataset || fromStorage || fallback).trim();
  if (fromQuery) {
    localStorage.setItem('apiBase', chosen);
  }

  return chosen.replace(/\/+$/, '');
}

function bindEvents() {
  els.loginForm?.addEventListener('submit', handleLogin);
  els.registerForm?.addEventListener('submit', handleRegister);
  els.logoutButton?.addEventListener('click', handleLogout);
  els.searchInput?.addEventListener('input', handleSearchInput);
  els.showOwnWallBtn?.addEventListener('click', () => {
    if (state.user) {
      selectWall(state.user.id, state.user.displayName, true);
    }
  });
  els.postForm?.addEventListener('submit', handlePostSubmit);
  els.postMessage?.addEventListener('input', () => {
    const length = els.postMessage.value.trim().length;
    els.postCounter.textContent = `${length} / ${MESSAGE_LIMIT} tecken`;
    els.postCounter.classList.toggle('text-danger', length > MESSAGE_LIMIT);
  });
}

async function bootstrap() {
  await refreshSession();
  if (state.user) {
    await Promise.all([refreshFriends(), refreshRequests()]);
    selectWall(state.user.id, state.user.displayName, true);
  }
  render();
}

function render() {
  renderAuth();
  renderSearch();
  renderRequests();
  renderFriends();
  renderWall();
}

function renderAuth() {
  if (!els.authCard) return;
  const loggedIn = Boolean(state.user);
  els.authCard.classList.toggle('d-none', loggedIn);
  els.logoutButton.classList.toggle('d-none', !loggedIn);
  els.authStatus.textContent = loggedIn
    ? `Inloggad som ${state.user.displayName || state.user.username}`
    : 'Inte inloggad';
}

function renderSearch() {
  if (!els.searchCard) return;
  const visible = Boolean(state.user);
  els.searchCard.classList.toggle('d-none', !visible);
  if (!visible) {
    els.searchResults.innerHTML = '';
    els.searchInput.value = '';
  } else {
    els.searchResults.innerHTML = '';
    state.searchResults.forEach((user) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `
        <span>
          <strong>${escapeHtml(user.displayName || user.username)}</strong>
          <span class="text-muted">@${escapeHtml(user.username)}</span>
        </span>
      `;
      const button = document.createElement('button');
      button.className = 'btn btn-sm btn-outline-primary';
      button.textContent = 'Lägg till vän';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        sendFriendRequest(user.id);
      });
      li.append(button);
      els.searchResults.append(li);
    });
  }
}

function renderRequests() {
  if (!els.requestsCard) return;
  const visible = Boolean(state.user) && state.requests.length > 0;
  els.requestsCard.classList.toggle('d-none', !visible);
  els.requestsList.innerHTML = '';
  state.requests.forEach((req) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>
        <strong>${escapeHtml(req.requester.displayName || req.requester.username)}</strong>
        <span class="text-muted small d-block">@${escapeHtml(req.requester.username)}</span>
      </span>
    `;
    const button = document.createElement('button');
    button.className = 'btn btn-sm btn-success';
    button.textContent = 'Acceptera';
    button.addEventListener('click', () => acceptFriendRequest(req.id));
    li.append(button);
    els.requestsList.append(li);
  });
}

function renderFriends() {
  if (!els.friendsCard) return;
  const visible = Boolean(state.user);
  els.friendsCard.classList.toggle('d-none', !visible);
  els.friendsList.innerHTML = '';
  state.friends.forEach((friend) => {
    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
    li.textContent = friend.displayName || friend.username;
    li.addEventListener('click', () => selectWall(friend.id, friend.displayName || friend.username, false));
    if (state.activeWall?.id === friend.id) {
      li.classList.add('active');
    }
    els.friendsList.append(li);
  });
}

function renderWall() {
  if (!els.wallCard) return;
  const active = state.activeWall;
  const visible = Boolean(state.user && active);
  els.wallCard.classList.toggle('d-none', !visible);
  if (!visible) return;

  els.wallTitle.textContent =
    active.id === state.user.id ? 'Din sida' : `${active.name}`;
  els.wallSubtitle.textContent =
    active.id === state.user.id
      ? 'Här ser du dina egna inlägg.'
      : `Du tittar på ${active.name || 'vän'}.`;

  const mayPost = active.canPost;
  els.postForm.classList.toggle('d-none', !mayPost);

  const posts = state.walls.get(active.id) || [];
  els.postsList.innerHTML = '';
  els.postsEmpty.classList.toggle('d-none', posts.length > 0);
  posts.forEach((post) => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = `
      <div class="d-flex justify-content-between">
        <div>
          <div class="post-headline fw-semibold">${escapeHtml(post.author.displayName || post.author.username)}</div>
          <div class="post-meta">${formatDate(post.createdAt)}</div>
        </div>
      </div>
      <p class="mt-2 wrap-anywhere">${decodeHtml(post.message)}</p>
    `;
    els.postsList.append(li);
  });
}

async function refreshSession() {
  try {
    const res = await apiFetch('/auth/me');
    state.user = res.user;
  } catch (error) {
    state.user = null;
    showMessage(error.message, 'danger');
  }
}

async function refreshFriends() {
  if (!state.user) return;
  const res = await apiFetch('/friends');
  state.friends = res.friends || [];
}

async function refreshRequests() {
  if (!state.user) return;
  const res = await apiFetch('/friends/requests');
  state.requests = (res.requests || []).map((req) => ({
    ...req,
    requester: req.requester || {},
  }));
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(els.loginForm);
  const payload = {
    username: formData.get('username')?.trim(),
    password: formData.get('password') || '',
  };
  if (!payload.username || !payload.password) {
    return showMessage('Fyll i alla fält.', 'warning');
  }
  await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  els.loginForm.reset();
  await bootstrap();
  showMessage('Inloggning lyckades.', 'success');
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(els.registerForm);
  const payload = {
    username: formData.get('username')?.trim(),
    password: formData.get('password') || '',
    displayName: formData.get('displayName')?.trim(),
  };
  if (!payload.username || !payload.password) {
    return showMessage('Fyll i alla obligatoriska fält.', 'warning');
  }
  await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  els.registerForm.reset();
  await bootstrap();
  showMessage('Konto skapat! Du är inloggad.', 'success');
}

async function handleLogout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  state.user = null;
  state.friends = [];
  state.requests = [];
  state.activeWall = null;
  state.walls.clear();
  render();
  showMessage('Du loggades ut.', 'info');
}

function handleSearchInput() {
  if (!state.user) return;
  const value = els.searchInput.value.trim();
  if (state.searchTimer) {
    clearTimeout(state.searchTimer);
  }
  state.searchTimer = setTimeout(async () => {
    if (value.length < 2) {
      state.searchResults = [];
      renderSearch();
      return;
    }
    const res = await apiFetch(`/users?query=${encodeURIComponent(value)}`);
    state.searchResults = res.users?.filter((u) => u.id !== state.user.id) ?? [];
    renderSearch();
  }, SEARCH_DEBOUNCE);
}

async function sendFriendRequest(userId) {
  await apiFetch('/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ toUserId: userId }),
  });
  showMessage('Vänförfrågan skickad!', 'success');
  state.searchResults = state.searchResults.filter((user) => user.id !== userId);
  renderSearch();
}

async function acceptFriendRequest(requestId) {
  await apiFetch(`/friends/requests/${requestId}`, { method: 'PATCH' });
  await Promise.all([refreshFriends(), refreshRequests()]);
  renderFriends();
  renderRequests();
  showMessage('Ni är nu vänner!', 'success');
}

async function selectWall(userId, name, isOwn) {
  state.activeWall = {
    id: userId,
    name,
    canPost: isOwn || state.friends.some((f) => f.id === userId),
  };
  els.friendsList
    ?.querySelectorAll('.list-group-item')
    .forEach((li) => li.classList.remove('active'));
  if (!state.walls.has(userId)) {
    await loadWall(userId);
  }
  renderWall();
}

async function loadWall(ownerId) {
  if (!state.user) return;
  const res = await apiFetch(`/posts?ownerId=${encodeURIComponent(ownerId)}`);
  const posts = res.posts?.map((post) => ({
    ...post,
    author: post.author || { username: 'Okänd' },
  })) ?? [];
  state.walls.set(ownerId, posts);
  if (state.activeWall?.id === ownerId) {
    renderWall();
  }
}

async function handlePostSubmit(event) {
  event.preventDefault();
  if (!state.activeWall) return;
  const message = els.postMessage.value.trim();
  if (!message) {
    return showMessage('Meddelandet får inte vara tomt.', 'warning');
  }
  if (message.length > MESSAGE_LIMIT) {
    return showMessage('Meddelandet får vara max 140 tecken.', 'warning');
  }
  await apiFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({ ownerId: state.activeWall.id, message }),
  });
  els.postForm.reset();
  els.postCounter.textContent = `0 / ${MESSAGE_LIMIT} tecken`;
  await loadWall(state.activeWall.id);
  showMessage('Inlägget publicerades.', 'success');
}

function showMessage(text, level = 'info') {
  if (!els.messageArea) return;
  els.messageArea.textContent = text;
  els.messageArea.className = `alert alert-${level}`;
  els.messageArea.classList.remove('d-none');
  setTimeout(() => {
    els.messageArea?.classList.add('d-none');
  }, 4000);
}

async function apiFetch(path, options = {}) {
  if (!usesApi) {
    throw new Error('API-bas saknas.');
  }
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      credentials: 'include',
      body: options.body,
    });
  } catch (error) {
    throw new Error(`Kunde inte nå backend på ${apiBase}. Kontrollera att servern är igång och att CLIENT_ORIGIN/CORS är rätt inställt.`);
  }

  if (response.status === 204) {
    return {};
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error('Kunde inte tolka svaret från servern.');
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Något gick fel.');
  }
  return payload;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

function decodeHtml(value) {
  const div = document.createElement('div');
  div.innerHTML = value ?? '';
  return div.textContent || '';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
