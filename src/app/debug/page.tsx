import Link from "next/link";
import { Suspense } from "react";

import { GameStatusActions } from "@/components/GameStatusActions";
import { StatusBadge } from "@/components/StatusBadge";
import { listGames } from "@/server/admin/admin";
import type { GameSummary } from "@/types/admin";

function counts(game: GameSummary): string {
  const drawings = `${game.drawings} ${game.drawings === 1 ? "drawing" : "drawings"}`;
  const guesses = `${game.guesses} ${game.guesses === 1 ? "guess" : "guesses"}`;
  return `${drawings} · ${guesses}`;
}

async function GamesList() {
  const games = await listGames();
  const live = games.find((game) => game.status === "live");

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-hand text-4xl font-bold">Games</h1>
        <Link className="btn btn-primary" href="/debug/new">
          + Start a new game
        </Link>
      </header>

      <section aria-labelledby="live-heading" className="flex flex-col gap-3">
        <h2 className="font-hand text-xl text-ink-muted" id="live-heading">
          Being played now
        </h2>
        {live ? (
          <div className="sketch flex flex-col gap-3 p-6">
            <p className="font-hand text-3xl font-bold">{live.prompt}</p>
            <p className="text-ink-muted">
              Started {live.date} · {counts(live)}
            </p>
            <div className="flex flex-wrap items-start gap-2">
              <Link className="btn btn-primary px-3 py-1 text-base" href="/">
                Play
              </Link>
              <Link
                className="btn px-3 py-1 text-base"
                href={`/debug/games/${live.date}`}
              >
                Open
              </Link>
              <GameStatusActions date={live.date} status={live.status} />
            </div>
          </div>
        ) : (
          <p className="sketch-alt p-6 text-ink-muted">
            No game is live. Start a new one, or resume an old one below.
          </p>
        )}
      </section>

      <section aria-labelledby="all-heading" className="flex flex-col gap-3">
        <h2 className="font-hand text-xl text-ink-muted" id="all-heading">
          All games ({games.length})
        </h2>
        {games.length === 0 ? (
          <p className="text-ink-muted">No games yet.</p>
        ) : (
          <ul className="sketch divide-y-2 divide-dashed divide-ink-faint">
            {games.map((game) => (
              <li
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={game.date}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="truncate font-hand text-xl font-bold hover:text-grape"
                      href={`/debug/games/${game.date}`}
                    >
                      {game.prompt}
                    </Link>
                    <StatusBadge status={game.status} />
                  </div>
                  <p className="text-sm text-ink-muted">
                    {game.date} · {counts(game)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-start gap-2">
                  <Link
                    className="btn px-3 py-1 text-base"
                    href={`/debug/games/${game.date}`}
                  >
                    Open
                  </Link>
                  <GameStatusActions date={game.date} status={game.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// Data loads inside the page's own boundary so navigations stay instant.
export default function GamesPage() {
  return (
    <Suspense fallback={<p className="font-hand text-ink-muted">Loading…</p>}>
      <GamesList />
    </Suspense>
  );
}
