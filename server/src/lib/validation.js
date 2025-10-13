import { BadRequestError } from '../errors/http-error.js';

export function requireString(value, fieldName, { min = 1, max = 255 } = {}) {
  if (typeof value !== 'string') {
    throw new BadRequestError(`${fieldName} måste vara en sträng.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new BadRequestError(`${fieldName} måste innehålla minst ${min} tecken.`);
  }
  if (trimmed.length > max) {
    throw new BadRequestError(`${fieldName} får vara max ${max} tecken.`);
  }
  return trimmed;
}

export function ensureMessageLength(message) {
  return requireString(message, 'Meddelandet', { min: 1, max: 140 });
}

export function ensureUsername(username) {
  const trimmed = requireString(username, 'Användarnamnet', { min: 3, max: 24 });
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    throw new BadRequestError('Användarnamnet får endast innehålla bokstäver, siffror eller _.');
  }
  return trimmed;
}

export function ensurePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new BadRequestError('Lösenordet måste vara minst 8 tecken.');
  }
  return password;
}

export function sanitizeHtml(value) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
  };
  return value.replace(/[&<>"'`]/g, (char) => map[char]);
}
