import "server-only";

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_TIMEOUT_MS,
} from "@/constants/clustering";

export function parseEmbedding(body: unknown): number[] | null {
  if (typeof body !== "object" || body === null || !("data" in body)) {
    return null;
  }
  const [first] = Array.isArray(body.data) ? body.data : [];
  const embedding: unknown =
    typeof first === "object" && first !== null && "embedding" in first
      ? first.embedding
      : null;
  if (
    !Array.isArray(embedding) ||
    embedding.length !== EMBEDDING_DIMENSIONS ||
    !embedding.every(
      (value) => typeof value === "number" && Number.isFinite(value),
    )
  ) {
    return null;
  }
  return embedding;
}

// Null when there's no key or the API fails, so the caller can carry on
// without clustering.
export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Embedding request failed with HTTP ${response.status}.`);
      return null;
    }
    const embedding = parseEmbedding(await response.json());
    if (!embedding) {
      console.error("Embedding response had an unexpected shape.");
    }
    return embedding;
  } catch (error) {
    console.error("Embedding request failed.", error);
    return null;
  }
}
