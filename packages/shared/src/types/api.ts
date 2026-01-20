// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  success: true;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
  success: false;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// Error codes
export const API_ERROR_CODES = {
  // Auth errors
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
  OAUTH_FAILED: "OAUTH_FAILED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",

  // General errors
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
