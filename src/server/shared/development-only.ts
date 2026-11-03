import "server-only";

import { GameError } from "@/server/shared/error";

// Debug tools run locally, and on deploys that opt in with GRAPEVINE_DEBUG=1
// (Vercel Preview only, never Production: they let anyone reset the game).
export function isDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.GRAPEVINE_DEBUG === "1"
  );
}

export function requireDebugEnabled(): void {
  if (!isDebugEnabled()) {
    throw new GameError("Not found.", 404, "not_found");
  }
}
