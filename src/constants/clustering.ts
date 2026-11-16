// Guesses at or above this cosine similarity to a guess on the same drawing
// join its cluster (spec: Guess clustering). A starting guess; tune it from
// the `similarity` recorded on every guess.
export const CLUSTER_SIMILARITY_THRESHOLD = 0.85;

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 512;
// Clustering is best effort: past this, the guess starts its own cluster.
export const EMBEDDING_TIMEOUT_MS = 3_000;
