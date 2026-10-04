import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, rememberUser, saveSettings } from "../../settings/settings";
import UserMenu from "./UserMenu";

afterEach(() => vi.unstubAllGlobals());

function renderMenu(onOpenSettings = () => {}) {
  stubApi({ "GET /api/me": { id: 1, username: "dev" } });
  render(
    <SettingsProvider>
      <UserMenu onOpenSettings={onOpenSettings} />
    </SettingsProvider>,
  );
}

describe("UserMenu", () => {
  it("shows the user's picture at the top right", async () => {
    const avatar = "data:image/webp;base64,AAAA";
    saveSettings("dev", { ...DEFAULT_SETTINGS, avatar });
    rememberUser("dev");
    renderMenu();

    expect(within(screen.getByRole("button", { name: "Account menu" })).getByRole("img")).toHaveAttribute("src", avatar);
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
