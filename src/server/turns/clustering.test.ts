import { describe, expect, it } from "vitest";

import {
  chooseCluster,
  embeddingInput,
  findExactCluster,
  foldClusters,
} from "@/server/turns/clustering";
import { parseEmbedding } from "@/server/turns/embeddings";

describe("chooseCluster", () => {
  it("joins at or above the threshold and starts a cluster below it", () => {
    expect(chooseCluster({ headId: 4, similarity: 0.85 }, 0.85)).toBe(4);
    expect(chooseCluster({ headId: 4, similarity: 0.97 }, 0.85)).toBe(4);
    expect(chooseCluster({ headId: 4, similarity: 0.8499 }, 0.85)).toBeNull();
  });

  it("starts a cluster when the drawing has no guesses with embeddings", () => {
    expect(chooseCluster(null)).toBeNull();
  });
});

describe("findExactCluster", () => {
  const guesses = [
    { id: 1, clusterId: null, text: "a red balloon" },
    { id: 2, clusterId: 1, text: "Red balloon" },
    { id: 3, clusterId: null, text: "a dog" },
  ];

  it("matches the same wording in any case, through to its head", () => {
    expect(findExactCluster(guesses, "A Red Balloon")).toBe(1);
    expect(findExactCluster(guesses, "red BALLOON")).toBe(1);
    expect(findExactCluster(guesses, "the red balloon")).toBe(1);
    expect(findExactCluster(guesses, "dog")).toBe(3);
    expect(findExactCluster(guesses, "a dog")).toBe(3);
  });

  it("finds nothing for new wording", () => {
    expect(findExactCluster(guesses, "a cat")).toBeNull();
    expect(findExactCluster([], "a cat")).toBeNull();
  });
});

describe("foldClusters", () => {
  it("folds members into heads with a count and distinct other wordings", () => {
    expect(
      foldClusters([
        { id: 5, clusterId: 1, text: "red balloon" },
        { id: 1, clusterId: null, text: "a red balloon" },
        { id: 2, clusterId: 1, text: "Red balloon" },
        { id: 3, clusterId: null, text: "a dog" },
        { id: 4, clusterId: 1, text: "A red balloon" },
        { id: 6, clusterId: 1, text: "crimson balloon" },
        { id: 7, clusterId: 1, text: "Crimson balloon" },
      ]),
    ).toEqual([
      {
        id: 1,
        clusterId: null,
        text: "a red balloon",
        count: 6,
        aliases: ["crimson balloon"],
      },
      { id: 3, clusterId: null, text: "a dog", count: 1, aliases: [] },
    ]);
  });
});

describe("embeddingInput", () => {
  it("embeds a guess as a sentence about a drawing, without its article", () => {
    expect(embeddingInput("A Red Balloon")).toBe("A drawing of red balloon.");
    expect(embeddingInput("turtle car")).toBe("A drawing of turtle car.");
  });
});

describe("parseEmbedding", () => {
  const vector = Array.from({ length: 512 }, (_, index) => index / 512);

  it("reads the first embedding from an OpenAI response", () => {
    expect(parseEmbedding({ data: [{ embedding: vector }] })).toEqual(vector);
  });

  it("rejects anything else", () => {
    expect(parseEmbedding({ data: [{ embedding: vector.slice(1) }] })).toBe(
      null,
    );
    expect(parseEmbedding({ data: [] })).toBeNull();
    expect(parseEmbedding({ error: { message: "nope" } })).toBeNull();
    expect(
      parseEmbedding({ data: [{ embedding: [...vector.slice(1), "x"] }] }),
    ).toBeNull();
    expect(parseEmbedding(null)).toBeNull();
  });
});
