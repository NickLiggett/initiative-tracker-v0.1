import { afterEach, describe, expect, it, vi } from "vitest";
import { AVATAR_SIZE, MAX_FILE_BYTES, checkAvatarFile, fileToAvatar, squareCrop } from "./avatar";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const file = (type, size = 1000) => ({ type, size });

describe("checkAvatarFile", () => {
  it("accepts the usual picture types", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
      expect(checkAvatarFile(file(type))).toBeNull();
    }
  });

  it("refuses other files, and no file", () => {
    expect(checkAvatarFile(file("application/pdf"))).toMatch(/isn't a picture/);
    expect(checkAvatarFile(file("image/svg+xml"))).toMatch(/isn't a picture/); // can carry scripts
    expect(checkAvatarFile(file(""))).toMatch(/isn't a picture/);
    expect(checkAvatarFile(undefined)).toMatch(/isn't a picture/);
  });

  it("refuses a big one", () => {
    expect(checkAvatarFile(file("image/png", MAX_FILE_BYTES))).toBeNull();
    expect(checkAvatarFile(file("image/png", MAX_FILE_BYTES + 1))).toMatch(/too big/);
  });
});

describe("squareCrop", () => {
  it("takes the middle of a wide picture", () => {
    expect(squareCrop(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 });
  });

  it("takes the middle of a tall one", () => {
    expect(squareCrop(200, 500)).toEqual({ sx: 0, sy: 150, side: 200 });
  });

  it("takes all of a square one", () => {
    expect(squareCrop(300, 300)).toEqual({ sx: 0, sy: 0, side: 300 });
  });

  it("rounds down when the middle is between pixels", () => {
    expect(squareCrop(201, 100)).toEqual({ sx: 50, sy: 0, side: 100 });
  });
});

describe("fileToAvatar", () => {
  it("draws the middle of the picture, shrunk, and gives it back as a data URL", async () => {
    const bitmap = { width: 600, height: 300, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    const drawImage = vi.fn();
    const canvas = { getContext: () => ({ drawImage }), toDataURL: vi.fn().mockReturnValue("data:image/webp;base64,AAAA") };
    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    await expect(fileToAvatar(file("image/png"))).resolves.toBe("data:image/webp;base64,AAAA");

    expect(canvas.width).toBe(AVATAR_SIZE);
    expect(canvas.height).toBe(AVATAR_SIZE);
    expect(drawImage).toHaveBeenCalledWith(bitmap, 150, 0, 300, 300, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("lets go of the picture even when drawing fails", async () => {
    const bitmap = { width: 10, height: 10, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    vi.spyOn(document, "createElement").mockReturnValue({ getContext: () => null });

    await expect(fileToAvatar(file("image/png"))).rejects.toThrow();

    expect(bitmap.close).toHaveBeenCalled();
  });
});
