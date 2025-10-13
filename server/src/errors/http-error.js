export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Ogiltig förfrågan.') {
    super(400, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Du måste vara inloggad.') {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Åtgärden är inte tillåten.') {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resursen hittades inte.') {
    super(404, message);
  }
}
