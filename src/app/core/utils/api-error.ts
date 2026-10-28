import { HttpErrorResponse } from '@angular/common/http';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Should a page show its own toast for this failed call?
 * Status 0 (no connection), 403 and 5xx already get a toast from error.interceptor.ts,
 * so a page must not show a second one. Everything else (400, 404, 409 ...) is the page's job.
 */
export function shouldToastHere(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return true;
  }
  return error.status !== 0 && error.status !== 403 && error.status < 500;
}

/**
 * Turns whatever went wrong with a backend call into ONE sentence a person can read.
 *
 * The backend sends errors in one of two shapes (see GlobalExceptionHandler):
 *   normal:     { timestamp, status, error: "Conflict", message: "This listing is not available" }
 *   validation: { timestamp, status: 400, error: "Bad Request", messages: { email: "Email is required" } }
 *
 * Usage:  error: (err) => this.errorText.set(getApiErrorMessage(err))
 */
export function getApiErrorMessage(error: unknown, fallback = GENERIC_MESSAGE): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  // Status 0 means the request never reached the backend: no internet, or the backend is not running.
  if (error.status === 0) {
    return 'We could not reach the server. Check your internet connection and try again.';
  }

  const body = error.error;
  if (body && typeof body === 'object') {
    const details = body as Record<string, unknown>;

    // Validation errors: join all the field messages into one sentence.
    const messages = details['messages'];
    if (messages && typeof messages === 'object') {
      const texts = Object.values(messages).filter((text) => typeof text === 'string');
      if (texts.length > 0) {
        return texts.join('. ');
      }
    }

    // Normal errors: the backend already wrote a readable message.
    const message = details['message'];
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }

  // No readable body (for example the plain 401 sent when the token is missing or expired).
  switch (error.status) {
    case 401:
      return 'Please log in to continue.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return fallback;
  }
}
