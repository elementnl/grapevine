import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/ActionButton";
import { DrawingView } from "@/components/DrawingView";
import { GameStatusActions } from "@/components/GameStatusActions";
import { PromptEditor } from "@/components/PromptEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { playerLabel } from "@/components/player-label";
import { requireAdmin } from "@/server/auth/admin";
import { isGameDate } from "@/server/days/setup-validation";
import { getGame } from "@/server/turns/turns";

async function GameDetail({
  params,
}: {
  params: PageProps<"/debug/games/[date]">["params"];
}) {
  const { date } = await params;
  await requireAdmin();
  const game = isGameDate(date) ? await getGame(date) : null;
  if (!game) {
    notFound();
  }

  // Top to bottom, the order the turns were played in.
  const nodes = [...game.nodes].sort(
    (a, b) => a.depth - b.depth || a.id - b.id,
  );

  return (
    <>
      <Link
        className="self-start font-hand text-ink-muted hover:text-ink"
        href="/debug"
      >
        ← All games
      </Link>

      <header className="flex flex-col gap-3">
        <PromptEditor date={game.date} prompt={game.prompt} />
        <div className="flex flex-wrap items-center gap-3 text-ink-muted">
          <StatusBadge status={game.status} />
          <span>{game.date}</span>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link
            className="btn btn-primary px-3 py-1 text-base"
            href={`/tree?date=${game.date}`}
          >
            See the tree
          </Link>
          {game.status === "live" && (
            <Link className="btn px-3 py-1 text-base" href="/">
              Play
            </Link>
          )}
          <GameStatusActions
            afterDelete="/debug"
            date={game.date}
            status={game.status}
          />
        </div>
      </header>

      <section aria-labelledby="turns-heading" className="flex flex-col gap-3">
        <h2 className="font-hand text-xl text-ink-muted" id="turns-heading">
          Turns ({nodes.length})
        </h2>
        {nodes.length === 0 ? (
          <p className="text-ink-muted">Nothing has been drawn yet.</p>
        ) : (
          <ol className="sketch divide-y-2 divide-dashed divide-ink-faint">
            {nodes.map((node, index) => (
              <li
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                key={`${node.kind}-${node.id}`}
              >
                <span className="w-8 shrink-0 font-hand text-xl text-ink-muted tabular-nums">
                  {index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  {node.kind === "drawing" ? (
                    <div className="w-32">
                      <DrawingView
                        drawing={node.drawing}
                        label={`Drawing ${index + 1}`}
                      />
                    </div>
                  ) : (
                    <p className="font-hand text-2xl font-bold">
                      <span className="marker">{node.text}</span>
                    </p>
                  )}
                  <p className="mt-1 text-sm text-ink-muted">
                    {node.kind === "drawing"
                      ? node.parentId === null
                        ? "Starter drawing"
                        : "Drawing"
                      : "Guess"}{" "}
                    by {playerLabel(node.playerId)}
                  </p>
                </div>
                <ActionButton
                  confirm={`Delete this ${node.kind} and everything after it?`}
                  payload={{
                    action: "delete_node",
                    kind: node.kind,
                    id: node.id,
                  }}
                  variant="danger"
                >
                  Delete
                </ActionButton>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

export default function GamePage({ params }: PageProps<"/debug/games/[date]">) {
  return (
    <Suspense fallback={<p className="font-hand text-ink-muted">Loading…</p>}>
      <GameDetail params={params} />
    </Suspense>
  );
}
