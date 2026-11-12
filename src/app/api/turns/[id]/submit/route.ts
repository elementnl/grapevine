import { GUESS_MAX_LENGTH, GUESS_MIN_LENGTH } from "@/constants/game";
import { readPlayerId } from "@/server/players/player";
import { GameError } from "@/server/shared/error";
import { apiErrorResponse, readJsonBody } from "@/server/shared/http";
import { submitTurn } from "@/server/turns/play";
import {
  isAssignmentId,
  parseTurnSubmission,
} from "@/server/turns/submission-validation";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/turns/[id]/submit">,
) {
  try {
    const { id } = await params;
    const playerId = await readPlayerId();
    if (!isAssignmentId(id) || !playerId) {
      throw new GameError("That turn doesn't exist.", 404, "not_found");
    }

    const submission = parseTurnSubmission(await readJsonBody(request));
    if (!submission) {
      throw new GameError(
        `Provide a guess of ${GUESS_MIN_LENGTH} to ${GUESS_MAX_LENGTH} characters or a drawing.`,
        422,
        "invalid_payload",
      );
    }

    return Response.json(await submitTurn(id, playerId, submission));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
