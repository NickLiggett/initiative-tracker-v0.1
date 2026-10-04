import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { MAX_FILE_BYTES, fileToAvatar } from "../../settings/avatar";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, loadSettings, rememberUser, saveSettings } from "../../settings/settings";
import ProfileSettings from "./ProfileSettings";

// Drawing a picture needs a real canvas, which the test browser doesn't have; the rest of avatar.js is used as it is.
vi.mock("../../settings/avatar", async (importOriginal) => ({ ...(await importOriginal()), fileToAvatar: vi.fn() }));

const AVATAR = "data:image/webp;base64,AAAA";

beforeEach(() => fileToAvatar.mockReset());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderProfile(initial = {}) {
  saveSettings("dev", { ...DEFAULT_SETTINGS, ...initial });
  rememberUser("dev");
  stubApi({ "GET /api/me": { id: 1, username: "dev" } });
  render(
    <SettingsProvider>
      <ProfileSettings />
    </SettingsProvider>,
  );
  await waitFor(() => expect(fetch).toHaveBeenCalled());
}

const picture = (name = "me.png", type = "image/png", size = 1000) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};
const choose = (file) => fireEvent.change(screen.getByLabelText("Upload picture"), { target: { files: [file] } });

describe("ProfileSettings", () => {
  it("shows who the user is, and their picture", async () => {
    await renderProfile({ avatar: AVATAR });

    expect(screen.getByRole("heading", { name: "dev" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "dev's picture" })).toHaveAttribute("src", AVATAR);
    expect(screen.getByRole("button", { name: "Remove picture" })).toBeEnabled();
  });

  it("shows their initial, and nothing to remove, until they have a picture", async () => {
    await renderProfile();

    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove picture" })).toBeDisabled();
  });

  it("makes a chosen picture the avatar and keeps it", async () => {
    fileToAvatar.mockResolvedValue(AVATAR);
    await renderProfile();

    const file = picture();
    choose(file);

    expect(await screen.findByText("Your picture is changed.")).toBeInTheDocument();
    expect(fileToAvatar).toHaveBeenCalledWith(file);
    expect(screen.getByRole("img", { name: "dev's picture" })).toHaveAttribute("src", AVATAR);
    expect(loadSettings("dev").avatar).toBe(AVATAR);
    expect(screen.getByRole("button", { name: "Remove picture" })).toBeEnabled();
  });

  it("refuses a file that isn't a picture, and leaves the avatar as it was", async () => {
    await renderProfile({ avatar: AVATAR });

    choose(picture("notes.pdf", "application/pdf"));

    expect(await screen.findByRole("alert")).toHaveTextContent("That isn't a picture we can use");
    expect(fileToAvatar).not.toHaveBeenCalled();
    expect(loadSettings("dev").avatar).toBe(AVATAR);
  });

  it("refuses a picture that's too big", async () => {
    await renderProfile();

    choose(picture("huge.png", "image/png", MAX_FILE_BYTES + 1));

    expect(await screen.findByRole("alert")).toHaveTextContent("too big");
    expect(fileToAvatar).not.toHaveBeenCalled();
  });

  it("says when a picture can't be read", async () => {
    fileToAvatar.mockRejectedValueOnce(new Error("broken"));
    await renderProfile();

    choose(picture());

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't read that picture");
    expect(loadSettings("dev").avatar).toBeNull();
  });

  it("says when the browser won't keep the picture", async () => {
    fileToAvatar.mockResolvedValue(AVATAR);
    await renderProfile();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    choose(picture());

    expect(await screen.findByRole("alert")).toHaveTextContent("wouldn't keep the picture");
    expect(screen.queryByText("Your picture is changed.")).not.toBeInTheDocument();
  });

  it("removes the picture", async () => {
    await renderProfile({ avatar: AVATAR });

    fireEvent.click(screen.getByRole("button", { name: "Remove picture" }));

    expect(await screen.findByText("Your picture is removed.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "dev's picture" })).not.toBeInTheDocument();
    expect(loadSettings("dev").avatar).toBeNull();
    expect(screen.getByRole("button", { name: "Remove picture" })).toBeDisabled();
  });

  it("lets the same picture be chosen again after an error", async () => {
    fileToAvatar.mockRejectedValueOnce(new Error("broken")).mockResolvedValueOnce(AVATAR);
    await renderProfile();

    choose(picture());
    await screen.findByRole("alert");
    choose(picture());

    expect(await screen.findByText("Your picture is changed.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
