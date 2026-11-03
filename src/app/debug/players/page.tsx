import { Suspense } from "react";

import { ActionButton } from "@/components/ActionButton";
import { playerLabel } from "@/components/player-label";
import { listPlayers } from "@/server/admin/admin";
import { readPlayerId } from "@/server/players/player";

async function PlayersList() {
  const [players, currentId] = await Promise.all([
    listPlayers(),
    readPlayerId(),
  ]);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-hand text-4xl font-bold">Players</h1>
        <ActionButton endpoint="/api/debug/player" payload={{ slot: "new" }}>
          Become a new player
        </ActionButton>
      </header>
      <p className="max-w-prose text-ink-muted">
        Switch between Player A and Player B in the top bar to play both sides.
        Deleting a player keeps their drawings and guesses, just without an
        author.
      </p>

      <section
        aria-labelledby="players-heading"
        className="flex flex-col gap-3"
      >
        <h2 className="font-hand text-xl text-ink-muted" id="players-heading">
          Everyone who has played ({players.length})
        </h2>
        {players.length === 0 ? (
          <p className="text-ink-muted">Nobody has played yet.</p>
        ) : (
          <ul className="sketch divide-y-2 divide-dashed divide-ink-faint">
            {players.map((player) => (
              <li
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={player.id}
              >
                <div className="flex flex-col gap-1">
                  <p className="font-hand text-xl font-bold">
                    {playerLabel(player.id)}
                    {player.id === currentId && (
                      <span className="ml-2 font-normal text-grape">(you)</span>
                    )}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {player.drawings} drawings · {player.guesses} guesses ·
                    joined {player.createdAt.slice(0, 10)}
                  </p>
                </div>
                <ActionButton
                  confirm={`Delete ${playerLabel(player.id)}? Their turns stay, without an author.`}
                  payload={{ action: "delete_player", playerId: player.id }}
                  variant="danger"
                >
                  Delete
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<p className="font-hand text-ink-muted">Loading…</p>}>
      <PlayersList />
    </Suspense>
  );
}
