import Link from "next/link";
import { Suspense } from "react";

import { TreeCanvas } from "@/components/TreeCanvas";
import { layoutTree } from "@/components/tree-layout";
import { isGameDate } from "@/server/days/setup-validation";
import { getGame, getLatestGame } from "@/server/turns/turns";

// ?date= opens a specific game; otherwise the live or latest finished one.
async function Tree({
  searchParams,
}: {
  searchParams: PageProps<"/tree">["searchParams"];
}) {
  const { date } = await searchParams;
  const game = isGameDate(date) ? await getGame(date) : await getLatestGame();
  if (!game) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="font-hand text-4xl font-bold">Nothing growing yet</h1>
        <p className="max-w-sm text-ink-muted">
          The tree appears once someone starts a game and draws the first
          picture.
        </p>
        <Link className="btn" href="/">
          Back to the game
        </Link>
      </main>
    );
  }

  return (
    <TreeCanvas
      date={game.date}
      layout={layoutTree(game.prompt, game.nodes)}
      status={game.status}
    />
  );
}

export default function TreePage({ searchParams }: PageProps<"/tree">) {
  return (
    <Suspense
      fallback={
        <p className="m-auto font-hand text-xl text-ink-muted">
          Unrolling the tree…
        </p>
      }
    >
      <Tree searchParams={searchParams} />
    </Suspense>
  );
}
