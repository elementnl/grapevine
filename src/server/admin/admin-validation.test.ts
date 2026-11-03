import { describe, expect, it } from "vitest";

import { parseAdminAction } from "@/server/admin/admin-validation";

describe("admin action validation", () => {
  it("trims a new prompt and rejects an empty one", () => {
    expect(
      parseAdminAction({
        action: "rename_game",
        date: "2026-11-03",
        prompt: "  a red balloon ",
      }),
    ).toEqual({
      action: "rename_game",
      date: "2026-11-03",
      prompt: "a red balloon",
    });
    expect(
      parseAdminAction({
        action: "rename_game",
        date: "2026-11-03",
        prompt: " ",
      }),
    ).toBeNull();
  });

  it("only moves a game between live and frozen", () => {
    expect(
      parseAdminAction({
        action: "set_game_status",
        date: "2026-11-03",
        status: "live",
      }),
    ).toEqual({
      action: "set_game_status",
      date: "2026-11-03",
      status: "live",
    });
    expect(
      parseAdminAction({
        action: "set_game_status",
        date: "2026-11-03",
        status: "scheduled",
      }),
    ).toBeNull();
  });

  it("validates ids for deletes", () => {
    expect(
      parseAdminAction({ action: "delete_node", kind: "guess", id: 4 }),
    ).toEqual({ action: "delete_node", kind: "guess", id: 4 });
    expect(
      parseAdminAction({ action: "delete_node", kind: "day", id: 4 }),
    ).toBeNull();
    expect(
      parseAdminAction({ action: "delete_player", playerId: "not-a-uuid" }),
    ).toBeNull();
    expect(
      parseAdminAction({ action: "delete_game", date: "2026-02-30" }),
    ).toBeNull();
  });
});
