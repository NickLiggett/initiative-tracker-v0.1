import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { SettingsProvider } from "../../settings/SettingsContext";
import SettingsPage from "./SettingsPage";

afterEach(() => vi.unstubAllGlobals());

function renderPage(props) {
  stubApi({ "GET /api/me": { id: 1, username: "dev" } });
  const onTabChange = vi.fn();
  render(
    <SettingsProvider>
      <SettingsPage onTabChange={onTabChange} {...props} />
    </SettingsProvider>,
  );
  return onTabChange;
}

describe("SettingsPage", () => {
  it("starts on the profile", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Upload picture" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dark" })).not.toBeInTheDocument();
  });

  it("shows the appearance settings on that tab", () => {
    renderPage({ tab: "appearance" });

    expect(screen.getByRole("tab", { name: "Appearance" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload picture" })).not.toBeInTheDocument();
  });

  it("says which tab was chosen", () => {
    const onTabChange = renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "Appearance" }));

    expect(onTabChange).toHaveBeenCalledWith("appearance");
  });
});
