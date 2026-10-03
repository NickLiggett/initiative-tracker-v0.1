// The one place that talks HTTP to open5e-backend.
//
// By default requests go to the same origin (/api/...), which the Vite dev server proxies to the backend (see
// vite.config.js). Set VITE_API_URL to call the backend directly instead.

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

// Local development only: the backend's dev profile takes the user from this header.
const DEV_USER = import.meta.env.DEV ? import.meta.env.VITE_DEV_USER : undefined;

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
 * Sends JSON to the API (POST, PUT, PATCH) and returns the JSON it answers with.
 * @param {"POST"|"PUT"|"PATCH"} method
 * @param {string} path e.g. "/api/creatures"
 * @param {object} [body]
 * @throws {ApiError} for error responses
 */
export function apiSend(method, path, body, { signal } = {}) {
  return request(method, buildUrl(path), body, signal);
}

async function request(method, url, body, signal) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (DEV_USER) {
    headers["X-User"] = DEV_USER;
  }
  const response = await fetch(url, {
    ...(method !== "GET" && { method }),
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
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
  return response.json();
}
