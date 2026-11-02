import "server-only";

import { GameError } from "@/server/shared/error";

export function requireDevelopmentEnvironment(): void {
  if (process.env.NODE_ENV !== "development") {
    throw new GameError("Not found.", 404, "not_found");
  }
}
