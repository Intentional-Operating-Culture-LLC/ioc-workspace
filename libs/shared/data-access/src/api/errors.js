/**
 * API Error class for consistent error handling
 */
export class APIError extends Error {
  constructor(message, status = 500, code = null, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}