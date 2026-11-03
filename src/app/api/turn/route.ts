import { GUESS_MAX_LENGTH, GUESS_MIN_LENGTH } from "@/constants/game";
import { getOrCreatePlayerId } from "@/server/players/player";
import { GameError } from "@/server/shared/error";
import { apiErrorResponse, readJsonBody } from "@/server/shared/http";
import { parseTurnSubmission } from "@/server/turns/submission-validation";
import { submitTurn } from "@/server/turns/turns";

export async function POST(request: Request) {
  try {
    const submission = parseTurnSubmission(await readJsonBody(request));
    if (!submission) {
      throw new GameError(
        `Provide a guess of ${GUESS_MIN_LENGTH} to ${GUESS_MAX_LENGTH} characters or a drawing.`,
        422,
        "invalid_payload",
      );
    }

    return Response.json(
      await submitTurn(submission, await getOrCreatePlayerId()),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
