import { runDaySetupAction } from "@/server/days/setup";
import { parseDaySetupAction } from "@/server/days/setup-validation";
import { requireDevelopmentEnvironment } from "@/server/shared/development-only";
import { GameError } from "@/server/shared/error";
import { apiErrorResponse, readJsonBody } from "@/server/shared/http";

export async function POST(request: Request) {
  try {
    requireDevelopmentEnvironment();
    const action = parseDaySetupAction(await readJsonBody(request));
    if (!action) {
      throw new GameError(
        "Provide a valid day setup action.",
        422,
        "invalid_payload",
      );
    }

    return Response.json(await runDaySetupAction(action));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
