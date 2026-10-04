import { describe, expect, it } from "vitest";
import { base64Url, challengeFor, createPkce, randomString } from "./pkce";

describe("base64Url", () => {
  it("uses - and _ for + and /, and leaves off the padding", () => {
    expect(base64Url(new Uint8Array([251, 255, 254]))).toBe("-__-"); // "+//+" in plain base64
    expect(base64Url(new Uint8Array([1]))).toBe("AQ"); // "AQ==" in plain base64
    expect(base64Url(new Uint8Array([]))).toBe("");
  });
});

describe("challengeFor", () => {
  it("is the SHA-256 of the verifier as base64url: the example worked through in RFC 7636, appendix B", async () => {
    expect(await challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("randomString", () => {
  it("is URL-safe text from that many random bytes", () => {
    expect(randomString(32)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomString(16)).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("is different each time", () => {
    const strings = new Set(Array.from({ length: 50 }, () => randomString()));
    expect(strings.size).toBe(50);
  });
});

describe("createPkce", () => {
  it("makes a verifier of the length the standard allows, and the challenge that goes with it", async () => {
    const { verifier, challenge } = await createPkce();

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(await challengeFor(verifier));
  });

  it("is different each time", async () => {
    expect((await createPkce()).verifier).not.toBe((await createPkce()).verifier);
  });
});
