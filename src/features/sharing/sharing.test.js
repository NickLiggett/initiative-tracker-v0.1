import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/client";
import { normalizeUsername, shareProblem, sharingErrorMessage } from "./sharing";

const members = [
  { username: "dev", role: "OWNER" },
  { username: "player", role: "VIEWER" },
];

describe("normalizeUsername", () => {
  it("drops spaces and a leading @, and lower-cases", () => {
    expect(normalizeUsername("  @Player-2 ")).toBe("player-2");
    expect(normalizeUsername("@@gm")).toBe("gm");
    expect(normalizeUsername("   ")).toBe("");
  });
});

describe("shareProblem", () => {
  it("is nothing for someone new", () => {
    expect(shareProblem("friend", members)).toBeNull();
  });

  it("asks for a username when there isn't one", () => {
    expect(shareProblem("", members)).toBe("Type a username.");
  });

  it("says when it's the owner", () => {
    expect(shareProblem("dev", members)).toBe("That's you: you already own it.");
  });

  it("says when they already have access", () => {
    expect(shareProblem("player", members)).toMatch(/^player can already see this/);
  });
});

describe("sharingErrorMessage", () => {
  it("says what to do when there is no such user", () => {
    const error = new ApiError(404, "No user 'ghost'");

    expect(sharingErrorMessage(error, "ghost")).toBe(
      "There's no user called ghost. They need to have signed in to the app once before you can share with them.",
    );
  });

  it("gives the backend's message for anything else", () => {
    expect(sharingErrorMessage(new ApiError(403, "Only the owner can do that"), "x")).toBe("Only the owner can do that");
    expect(sharingErrorMessage(new ApiError(404, "No document 'x'"), "x")).toBe("No document 'x'");
    expect(sharingErrorMessage(undefined, "x")).toBe("Something went wrong.");
  });
});
