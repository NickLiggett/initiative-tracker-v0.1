import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear(); // settings are kept per browser, so a test must not leave any for the next
  window.sessionStorage.clear(); // and the sign-in is kept per tab
});
