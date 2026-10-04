// The one place that talks HTTP to open5e-backend.
//
// By default requests go to the same origin (/api/...), which the Vite dev server proxies to the backend (see
// vite.config.js). Set VITE_API_URL to call the backend directly instead.

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

// Local development only: the backend's dev profile takes the user from this header.
const DEV_USER = import.meta.env.DEV ? import.meta.env.VITE_DEV_USER : undefined;

// When the app has real sign-in (see auth/AuthContext), requests carry the user's token instead of the dev header.
let tokenProvider = null;

/**
 * Sets where requests get the access token to send: a function that resolves to the token, or to null when nobody is
 * signed in. Null (the default) means no sign-in is configured, and the dev header is used if there is one.
 */
export function setAuthTokenProvider(provider) {
  tokenProvider = provider;
}

/** An error response from the API, with the problem-details message the backend sends. */
export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Builds a request URL; parameters that are undefined, null or "" are left out. */
export function buildUrl(path, params = {}) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.append(name, value);
    }
  }
  const search = query.toString();
  return `${BASE_URL}${path}${search ? `?${search}` : ""}`;
}

/**
 * GETs JSON from the API.
 * @param {string} path e.g. "/api/creatures"
 * @param {object} [params] query parameters
 * @param {{signal?: AbortSignal}} [options]
 * @throws {ApiError} for error responses
 */
export function apiGet(path, params, { signal } = {}) {
  return request("GET", buildUrl(path, params), undefined, signal);
}

/**
 * Sends JSON to the API (POST, PUT, PATCH, DELETE) and returns the JSON it answers with, or null if it answers with
 * nothing (as it does to a DELETE). A `Blob` body (a picture, say) is sent as it is, with its own type, not as JSON.
 * @param {"POST"|"PUT"|"PATCH"|"DELETE"} method
 * @param {string} path e.g. "/api/creatures"
 * @param {object|Blob} [body]
 * @throws {ApiError} for error responses
 */
export function apiSend(method, path, body, { signal } = {}) {
  return request(method, buildUrl(path), body, signal);
}

async function request(method, url, body, signal) {
  const headers = { Accept: "application/json" };
  const raw = typeof Blob !== "undefined" && body instanceof Blob;
  if (body !== undefined) {
    headers["Content-Type"] = raw ? body.type : "application/json";
  }
  if (tokenProvider) {
    const token = await tokenProvider();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } else if (DEV_USER) {
    headers["X-User"] = DEV_USER;
  }
  const response = await fetch(url, {
    ...(method !== "GET" && { method }),
    headers,
    ...(body !== undefined && { body: raw ? body : JSON.stringify(body) }),
    signal,
  });
  if (!response.ok) {
    let detail;
    try {
      detail = (await response.json()).detail;
    } catch {
      // not a problem-details body
    }
    throw new ApiError(response.status, detail);
  }
  return response.status === 204 ? null : response.json();
}
