import "server-only";

import {
  AuthenticationConfigurationError,
  GameError,
  SupabaseConfigurationError,
} from "@/server/shared/error";

const MAX_REQUEST_SIZE = 1_000_000;

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength =
    contentLengthHeader === null ? null : Number(contentLengthHeader);

  if (
    contentLength !== null &&
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_SIZE
  ) {
    throw new GameError("Request body is too large.", 413, "payload_too_large");
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new GameError(
      "Request body must be valid JSON.",
      400,
      "invalid_json",
    );
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    size += value.byteLength;
    if (size > MAX_REQUEST_SIZE) {
      try {
        await reader.cancel();
      } catch (error) {
        console.error(
          "Could not stop reading an oversized request body.",
          error,
        );
      }
      throw new GameError(
        "Request body is too large.",
        413,
        "payload_too_large",
      );
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new GameError(
      "Request body must be valid JSON.",
      400,
      "invalid_json",
    );
  }
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof GameError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }

  if (error instanceof SupabaseConfigurationError) {
    console.error(error.message);
    return Response.json(
      {
        error: "database_not_configured",
        message: error.message,
      },
      { status: 503 },
    );
  }

  if (error instanceof AuthenticationConfigurationError) {
    console.error(error.message);
    return Response.json(
      {
        error: "auth_not_configured",
        message: error.message,
      },
      { status: 503 },
    );
  }

  console.error("API request failed.", error);
  return Response.json(
    { error: "internal_error", message: "The request could not be completed." },
    { status: 500 },
  );
}
