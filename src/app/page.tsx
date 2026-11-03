import { Suspense } from "react";

import { PlayerSwitcher } from "@/components/PlayerSwitcher";
import { PlayTurn } from "@/components/PlayTurn";
import { TopBar } from "@/components/TopBar";
import { getDebugPlayerSlot, readPlayerId } from "@/server/players/player";
import { isDebugEnabled } from "@/server/shared/development-only";
import { getCurrentTurn } from "@/server/turns/turns";

async function CurrentTurn() {
  return <PlayTurn turn={await getCurrentTurn(await readPlayerId())} />;
}

async function CurrentPlayer() {
  return <PlayerSwitcher slot={getDebugPlayerSlot(await readPlayerId())} />;
}

export default function Home() {
  const debug = isDebugEnabled();

  return (
    <>
      <TopBar
        links={[
          { href: "/tree", label: "See the tree" },
          ...(debug ? [{ href: "/debug", label: "Debug" }] : []),
        ]}
        middle={
          debug && (
            <Suspense>
              <CurrentPlayer />
            </Suspense>
          )
        }
      />
      <main className="flex flex-1 flex-col justify-center px-4 pt-4 pb-16">
        <Suspense
          fallback={
            <p className="text-center font-hand text-xl text-ink-muted">
              Fetching your turn…
            </p>
          }
        >
          <CurrentTurn />
        </Suspense>
      </main>
    </>
  );
}
