import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/client";
import { inviteNotice, normalizeUsername, parseShareTarget, shareProblem, shareTargetProblem, sharingErrorMessage } from "./sharing";

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

describe("parseShareTarget", () => {
  it("takes an email address as an invitation, trimmed and in lower case", () => {
    expect(parseShareTarget("  Pat@Example.com ")).toEqual({ kind: "email", value: "pat@example.com" });
    expect(parseShareTarget("a.b+c@sub.example.org")).toEqual({ kind: "email", value: "a.b+c@sub.example.org" });
  });

  it("takes anything else as a username", () => {
    expect(parseShareTarget("  @Player-2 ")).toEqual({ kind: "username", value: "player-2" });
    expect(parseShareTarget("@gm")).toEqual({ kind: "username", value: "gm" });
    expect(parseShareTarget("pat@example")).toEqual({ kind: "username", value: "pat@example" }); // no dot: not an address
    expect(parseShareTarget("a@@b.com").kind).toBe("username");
    expect(parseShareTarget("a b@c.com").kind).toBe("username");
    expect(parseShareTarget("   ")).toEqual({ kind: "username", value: "" });
  });
});

describe("shareTargetProblem", () => {
  it("asks for something when there is nothing", () => {
    expect(shareTargetProblem(parseShareTarget(" "), members)).toBe("Type a username or an email address.");
  });

  it("checks usernames as before, and leaves an email address to the backend", () => {
    expect(shareTargetProblem(parseShareTarget("dev"), members)).toBe("That's you: you already own it.");
    expect(shareTargetProblem(parseShareTarget("friend"), members)).toBeNull();
    expect(shareTargetProblem(parseShareTarget("dev@example.com"), members)).toBeNull();
  });
});

describe("inviteNotice", () => {
  it("says who was added when the address already had an account", () => {
    expect(inviteNotice({ email: "p@x.com", username: "pat", emailSent: false })).toEqual({
      severity: "success",
      text: "p@x.com already has an account, so pat can see it now.",
    });
  });

  it("says when the invitation went out, and warns when the email didn't", () => {
    expect(inviteNotice({ email: "p@x.com", username: null, emailSent: true }).severity).toBe("success");
    const warning = inviteNotice({ email: "p@x.com", username: null, emailSent: false });
    expect(warning.severity).toBe("warning");
    expect(warning.text).toMatch(/the email couldn't be sent/);
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
