import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// findBy and waitFor wait up to a second by default, which a first render of a big page doesn't always manage on a busy or
// slow machine (a CI runner with two CPUs, or the whole suite running at once). Nothing is slower when it passes.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  window.localStorage.clear(); // settings are kept per browser, so a test must not leave any for the next
  window.sessionStorage.clear(); // and the sign-in is kept per tab
});
