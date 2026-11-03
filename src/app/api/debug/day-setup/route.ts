import { runDaySetupAction } from "@/server/days/setup";
import { parseDaySetupAction } from "@/server/days/setup-validation";
import { getOrCreatePlayerId } from "@/server/players/player";
import { requireDebugEnabled } from "@/server/shared/development-only";
import { GameError } from "@/server/shared/error";
import { apiErrorResponse, readJsonBody } from "@/server/shared/http";

export async function POST(request: Request) {
  try {
    requireDebugEnabled();
    const action = parseDaySetupAction(await readJsonBody(request));
    if (!action) {
      throw new GameError(
        "Provide a valid day setup action.",
        422,
        "invalid_payload",
      );
    }

    return Response.json(
      await runDaySetupAction(action, await getOrCreatePlayerId()),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
