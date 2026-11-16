import "server-only";

import { CLUSTER_SIMILARITY_THRESHOLD } from "@/constants/clustering";
import { getSupabaseAdminClient } from "@/server/shared/supabase";
import { embedText } from "@/server/turns/embeddings";

export type GuessRow = {
  id: number;
  clusterId: number | null;
  text: string;
};

export type ClusterChoice = {
  // The head to join, or null to start a new cluster.
  clusterId: number | null;
  // Stored with the guess, as pgvector's text form, for future matches.
  embedding: string | null;
  // To the nearest guess on the drawing, joined or not, for tuning.
  similarity: number | null;
};

// Guesses are already normalized; case and a leading article are the only
// differences left to ignore ("A red balloon" is "red balloon").
export function wordingKey(text: string): string {
  return text.toLocaleLowerCase().replace(/^(a|an|the) /, "");
}

function sameWording(a: string, b: string): boolean {
  return wordingKey(a) === wordingKey(b);
}

// Embedding a bare phrase scores synonyms barely above unrelated words
// ("dog"/"puppy" 0.61 vs "dog"/"cat" 0.63). As a sentence about a drawing,
// they separate (0.89 vs 0.79), which is what the threshold relies on.
export function embeddingInput(text: string): string {
  return `A drawing of ${wordingKey(text)}.`;
}

export function findExactCluster(
  guesses: GuessRow[],
  text: string,
): number | null {
  const match = guesses.find((guess) => sameWording(guess.text, text));
  return match ? (match.clusterId ?? match.id) : null;
}

export function chooseCluster(
  nearest: { headId: number; similarity: number } | null,
  threshold: number = CLUSTER_SIMILARITY_THRESHOLD,
): number | null {
  return nearest && nearest.similarity >= threshold ? nearest.headId : null;
}

// Decides which cluster a new guess on `drawingId` joins. Never throws: if
// anything fails, the guess just starts its own cluster.
// ponytail: two near-identical guesses in the same instant can both start
// clusters; harmless, add a per-drawing lock if it shows up in the data.
export async function clusterGuess(
  drawingId: number,
  text: string,
): Promise<ClusterChoice> {
  const none: ClusterChoice = {
    clusterId: null,
    embedding: null,
    similarity: null,
  };
  const client = getSupabaseAdminClient();

  try {
    const { data: guesses, error } = await client
      .from("guesses")
      .select("id, cluster_id, text")
      .eq("drawing_id", drawingId);
    if (error) {
      throw error;
    }
    const exact = findExactCluster(
      guesses.map((guess) => ({
        id: guess.id,
        clusterId: guess.cluster_id,
        text: guess.text,
      })),
      text,
    );
    if (exact !== null) {
      return { clusterId: exact, embedding: null, similarity: 1 };
    }

    const vector = await embedText(embeddingInput(text));
    if (!vector) {
      return none;
    }
    const embedding = JSON.stringify(vector);
    const { data: matches, error: matchError } = await client.rpc(
      "match_guess",
      { target_drawing_id: drawingId, query_embedding: embedding },
    );
    if (matchError) {
      throw matchError;
    }
    const [match] = matches;
    const nearest = match
      ? { headId: match.head_id, similarity: match.similarity }
      : null;
    return {
      clusterId: chooseCluster(nearest),
      embedding,
      similarity: nearest?.similarity ?? null,
    };
  } catch (error) {
    console.error(`Clustering a guess on drawing ${drawingId} failed.`, error);
    return none;
  }
}

export type GuessCluster<T extends GuessRow> = T & {
  count: number;
  // The members' other wordings, without repeats or the head's own.
  aliases: string[];
};

// Folds members into their heads, so each cluster is one node in the tree.
export function foldClusters<T extends GuessRow>(
  guesses: T[],
): GuessCluster<T>[] {
  const heads = new Map<number, GuessCluster<T>>();
  for (const guess of guesses) {
    if (guess.clusterId === null) {
      heads.set(guess.id, { ...guess, count: 1, aliases: [] });
    }
  }
  for (const guess of [...guesses].sort((a, b) => a.id - b.id)) {
    const head = guess.clusterId === null ? null : heads.get(guess.clusterId);
    if (!head) {
      continue;
    }
    head.count += 1;
    if (
      !sameWording(guess.text, head.text) &&
      !head.aliases.some((alias) => sameWording(alias, guess.text))
    ) {
      head.aliases.push(guess.text);
    }
  }
  return [...heads.values()];
}
