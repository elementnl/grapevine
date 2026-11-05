import {
  becomeNewPlayer,
  isDebugPlayerSlot,
  switchToDebugPlayer,
} from "@/server/players/player";
import { requireAdmin } from "@/server/auth/admin";
import { GameError } from "@/server/shared/error";
import { apiErrorResponse, readJsonBody } from "@/server/shared/http";

export async function POST(request: Request) {
  try {
    await requireAdmin();
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
