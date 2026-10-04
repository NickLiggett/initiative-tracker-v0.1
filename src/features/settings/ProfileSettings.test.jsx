import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { MAX_FILE_BYTES, fileToAvatar } from "../../settings/avatar";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, cacheSettings, loadCachedSettings, rememberUser } from "../../settings/settings";
import ProfileSettings from "./ProfileSettings";

// Drawing a picture needs a real canvas, which the test browser doesn't have; the rest of avatar.js is used as it is.
vi.mock("../../settings/avatar", async (importOriginal) => ({ ...(await importOriginal()), fileToAvatar: vi.fn() }));

const MADE = new Blob(["pixels"], { type: "image/webp" });

beforeEach(() => fileToAvatar.mockReset());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Shows the profile of `dev`, whose account has a picture (version 1759) if `avatarVersion` says so. */
async function renderProfile({ avatarVersion = null, extra = {} } = {}) {
  cacheSettings("dev", { ...DEFAULT_SETTINGS, avatarVersion });
  rememberUser("dev");
  const fetchMock = stubApi({
    "GET /api/me": { id: 1, username: "dev" },
    "GET /api/me/settings": { avatarVersion },
    "PUT /api/me/avatar": { avatarVersion: 1800 },
    "DELETE /api/me/avatar": null,
    ...extra,
  });
  render(
    <SettingsProvider>
      <ProfileSettings />
    </SettingsProvider>,
  );
  await waitFor(() => expect(requests(fetchMock, "GET /api/me/settings")).toHaveLength(1));
  await act(async () => {});
  return fetchMock;
}

const requests = (fetchMock, route) =>
  fetchMock.mock.calls.filter(([url, init = {}]) => `${init.method ?? "GET"} ${url.split("?")[0]}` === route);

const picture = (name = "me.png", type = "image/png", size = 1000) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};
const choose = (file) => fireEvent.change(screen.getByLabelText("Upload picture"), { target: { files: [file] } });

describe("ProfileSettings", () => {
  it("shows who the user is, and their picture from the account", async () => {
    await renderProfile({ avatarVersion: 1759 });

    expect(screen.getByRole("heading", { name: "dev" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "dev's picture" })).toHaveAttribute("src", "/api/users/dev/avatar?v=1759");
    expect(screen.getByRole("button", { name: "Remove picture" })).toBeEnabled();
    expect(screen.getByText("Your picture is saved to your account, so it follows you to other browsers.")).toBeInTheDocument();
  });

  it("shows their initial, and nothing to remove, until they have a picture", async () => {
    await renderProfile();

    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove picture" })).toBeDisabled();
  });

  it("makes a chosen picture the avatar, by uploading what the picture was shrunk to", async () => {
    fileToAvatar.mockResolvedValueOnce(MADE);
    const fetchMock = await renderProfile();

    const file = picture();
    choose(file);

    expect(await screen.findByText("Your picture is changed.")).toBeInTheDocument();
    expect(fileToAvatar).toHaveBeenCalledWith(file);
    expect(requests(fetchMock, "PUT /api/me/avatar")[0][1].body).toBe(MADE);
    expect(screen.getByRole("img", { name: "dev's picture" })).toHaveAttribute("src", "/api/users/dev/avatar?v=1800");
    expect(loadCachedSettings("dev").avatarVersion).toBe(1800);
    expect(screen.getByRole("button", { name: "Remove picture" })).toBeEnabled();
  });

  it("refuses a file that isn't a picture, and leaves the avatar as it was", async () => {
    const fetchMock = await renderProfile({ avatarVersion: 1759 });

    choose(picture("notes.pdf", "application/pdf"));

    expect(await screen.findByRole("alert")).toHaveTextContent("That isn't a picture we can use");
    expect(fileToAvatar).not.toHaveBeenCalled();
    expect(requests(fetchMock, "PUT /api/me/avatar")).toHaveLength(0);
    expect(loadCachedSettings("dev").avatarVersion).toBe(1759);
  });

  it("refuses a picture that's too big, without reading it", async () => {
    await renderProfile();

    choose(picture("huge.png", "image/png", MAX_FILE_BYTES + 1));

    expect(await screen.findByRole("alert")).toHaveTextContent("too big");
    expect(fileToAvatar).not.toHaveBeenCalled();
  });

  it("says when a picture can't be read, and sends nothing", async () => {
    fileToAvatar.mockRejectedValueOnce(new Error("broken"));
    const fetchMock = await renderProfile();

    choose(picture());

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't read that picture");
    expect(requests(fetchMock, "PUT /api/me/avatar")).toHaveLength(0);
  });

  it("says why when the account wouldn't take the picture, and keeps the one it had", async () => {
    fileToAvatar.mockResolvedValueOnce(MADE);
    await renderProfile({
      avatarVersion: 1759,
      extra: { "PUT /api/me/avatar": () => new Response(JSON.stringify({ detail: "An avatar can be 512 KB at most" }), { status: 413 }) },
    });

    choose(picture());

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your picture: An avatar can be 512 KB at most");
    expect(screen.queryByText("Your picture is changed.")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "dev's picture" })).toHaveAttribute("src", "/api/users/dev/avatar?v=1759");
  });

  it("removes the picture from the account", async () => {
    const fetchMock = await renderProfile({ avatarVersion: 1759 });

    fireEvent.click(screen.getByRole("button", { name: "Remove picture" }));

    expect(await screen.findByText("Your picture is removed.")).toBeInTheDocument();
    expect(requests(fetchMock, "DELETE /api/me/avatar")).toHaveLength(1);
    expect(screen.queryByRole("img", { name: "dev's picture" })).not.toBeInTheDocument();
    expect(loadCachedSettings("dev").avatarVersion).toBeNull();
    expect(screen.getByRole("button", { name: "Remove picture" })).toBeDisabled();
  });

  it("keeps the picture and says so when it can't be removed", async () => {
    await renderProfile({ avatarVersion: 1759, extra: { "DELETE /api/me/avatar": () => new Response("{}", { status: 500 }) } });

    fireEvent.click(screen.getByRole("button", { name: "Remove picture" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't remove your picture");
    expect(screen.getByRole("img", { name: "dev's picture" })).toBeInTheDocument();
  });

  it("lets the same picture be chosen again after an error", async () => {
    fileToAvatar.mockRejectedValueOnce(new Error("broken")).mockResolvedValueOnce(MADE);
    await renderProfile();

    choose(picture());
    await screen.findByRole("alert");
    choose(picture());

    expect(await screen.findByText("Your picture is changed.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
