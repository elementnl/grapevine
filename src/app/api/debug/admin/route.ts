import { runAdminAction } from "@/server/admin/admin";
import { parseAdminAction } from "@/server/admin/admin-validation";
import { requireDebugEnabled } from "@/server/shared/development-only";
import { GameError } from "@/server/shared/error";
import { apiErrorResponse, readJsonBody } from "@/server/shared/http";

export async function POST(request: Request) {
  try {
    requireDebugEnabled();
    const action = parseAdminAction(await readJsonBody(request));
    if (!action) {
      throw new GameError(
        "Provide a valid admin action.",
        422,
        "invalid_payload",
      );
    }

    return Response.json(await runAdminAction(action));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
