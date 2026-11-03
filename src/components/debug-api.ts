// Posts to a debug endpoint and turns an error response into a readable Error.
export async function postDebug(
  url: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response.ok) {
    return;
  }

  let message = `The request failed (HTTP ${response.status}).`;
  try {
    const result: unknown = await response.json();
    if (
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof result.message === "string"
    ) {
      message = result.message;
    }
  } catch {
    // Keep the generic message when the body isn't JSON.
  }
  throw new Error(message);
}
