import { describe, expect, it } from "vitest";

import { isSupabaseServiceRoleKey } from "@/server/shared/supabase";

function createTestJwt(role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString(
    "base64url",
  );
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `${header}.${payload}.signature`;
}

describe("Supabase service-role key validation", () => {
  it("accepts service-role JWTs and Supabase secret keys", () => {
    expect(isSupabaseServiceRoleKey(createTestJwt("service_role"))).toBe(true);
    expect(isSupabaseServiceRoleKey("sb_secret_test-key")).toBe(true);
  });

  it("rejects publishable, anon, and malformed keys", () => {
    expect(isSupabaseServiceRoleKey("sb_publishable_test-key")).toBe(false);
    expect(isSupabaseServiceRoleKey(createTestJwt("anon"))).toBe(false);
    expect(isSupabaseServiceRoleKey("not-a-jwt")).toBe(false);
  });
});
