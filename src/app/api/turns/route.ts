import { getOrCreatePlayerId } from "@/server/players/player";
import { apiErrorResponse } from "@/server/shared/http";
import { requestTurn } from "@/server/turns/play";

export async function POST() {
  try {
    return Response.json(await requestTurn(await getOrCreatePlayerId()));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
