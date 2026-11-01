import { describe, expect, it } from "vitest";

import { getHealth } from "@/server/health";

describe("getHealth", () => {
  it("reports ok", () => {
    expect(getHealth()).toEqual({ status: "ok", app: "Grapevine" });
  });
});
