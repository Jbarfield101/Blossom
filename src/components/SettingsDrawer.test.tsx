import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsDrawer from "./SettingsDrawer";
import { ThemeProvider } from "../features/theme/ThemeContext";
import { useUsers } from "../features/users/useUsers";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));

describe("SettingsDrawer widgets", () => {
  beforeEach(() => {
    useUsers.setState({ users: {}, currentUserId: null });
    useUsers.persist.clearStorage();
    useUsers.getState().addUser("Alice");
  });

  it("reflects widget state", async () => {
    const user = userEvent.setup();
    useUsers.getState().toggleWidget("tasks");

    render(
      <ThemeProvider>
        <SettingsDrawer open onClose={() => {}} />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "Integrations" }));
    const tasksSwitch = document.querySelector(
      "#widget-tasks input"
    ) as HTMLInputElement;
    expect(tasksSwitch).toBeChecked();
  });

  it("updates store when toggled", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <SettingsDrawer open onClose={() => {}} />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "Integrations" }));
    const tasksSwitch = document.querySelector(
      "#widget-tasks input"
    ) as HTMLInputElement;
    expect(tasksSwitch).not.toBeChecked();
    await user.click(tasksSwitch);
    const id = useUsers.getState().currentUserId!;
    expect(useUsers.getState().users[id].widgets.tasks).toBe(true);
  });
});

