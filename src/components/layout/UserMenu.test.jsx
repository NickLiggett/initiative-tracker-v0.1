import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, cacheSettings, rememberUser } from "../../settings/settings";
import UserMenu from "./UserMenu";

afterEach(() => vi.unstubAllGlobals());

function renderMenu(onOpenSettings = () => {}, avatarVersion = null) {
  stubApi({ "GET /api/me": { id: 1, username: "dev" }, "GET /api/me/settings": { avatarVersion } });
  render(
    <SettingsProvider>
      <UserMenu onOpenSettings={onOpenSettings} />
    </SettingsProvider>,
  );
}

describe("UserMenu", () => {
  it("shows the user's picture at the top right", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, avatarVersion: 1759 });
    rememberUser("dev");
    renderMenu(() => {}, 1759);

    expect(within(screen.getByRole("button", { name: "Account menu" })).getByRole("img")).toHaveAttribute(
      "src",
      "/api/users/dev/avatar?v=1759",
    );
  });

  it("shows their initial when they have no picture", async () => {
    renderMenu();

    expect(await within(screen.getByRole("button", { name: "Account menu" })).findByText("D")).toBeInTheDocument();
  });

  it("opens with who is signed in and ways to the profile and appearance settings", async () => {
    renderMenu();
    await waitFor(() => expect(screen.getByText("D")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));

    const menu = within(await screen.findByRole("menu"));
    expect(menu.getByText("Signed in as")).toBeInTheDocument();
    expect(menu.getByText("dev")).toBeInTheDocument();
    expect(menu.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Profile", "Appearance"]);
  });

  it.each([
    ["Profile", "profile"],
    ["Appearance", "appearance"],
  ])("takes you to the %s settings", async (item, section) => {
    const onOpenSettings = vi.fn();
    renderMenu(onOpenSettings);

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: item }));

    expect(onOpenSettings).toHaveBeenCalledWith(section);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});
