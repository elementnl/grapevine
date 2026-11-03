import {
  becomeNewPlayer,
  isDebugPlayerSlot,
  switchToDebugPlayer,
} from "@/server/players/player";
import { requireDebugEnabled } from "@/server/shared/development-only";
import { GameError } from "@/server/shared/error";
import { apiErrorResponse, readJsonBody } from "@/server/shared/http";

export async function POST(request: Request) {
  try {
    requireDebugEnabled();
    const body = await readJsonBody(request);
    const slot =
      typeof body === "object" && body !== null && "slot" in body
        ? body.slot
        : null;
    if (slot === "new") {
      await becomeNewPlayer();
      return Response.json({ slot });
    }
    if (!isDebugPlayerSlot(slot)) {
      throw new GameError("Choose player a, b or new.", 422, "invalid_payload");
    }

    await switchToDebugPlayer(slot);
    return Response.json({ slot });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
