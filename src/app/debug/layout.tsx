import { Suspense } from "react";

import { DebugNav } from "@/components/DebugNav";
import { PlayerSwitcher } from "@/components/PlayerSwitcher";
import { TopBar } from "@/components/TopBar";
import { getDebugPlayerSlot, readPlayerId } from "@/server/players/player";
import { isDebugEnabled } from "@/server/shared/development-only";

async function CurrentPlayer() {
  return <PlayerSwitcher slot={getDebugPlayerSlot(await readPlayerId())} />;
}

export default function DebugLayout({ children }: LayoutProps<"/debug">) {
  if (!isDebugEnabled()) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="font-hand text-xl text-ink-muted">
          The debug view is only available in development.
        </p>
      </main>
    );
  }

  return (
    <>
      <TopBar
        links={[
          { href: "/", label: "Play" },
          { href: "/tree", label: "See the tree" },
        ]}
        middle={
          <Suspense>
            <CurrentPlayer />
          </Suspense>
        }
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-4 pb-16 md:flex-row md:gap-10">
        <aside className="md:w-44 md:shrink-0">
          <p className="mb-2 hidden font-hand text-ink-muted md:block">
            Debug tools
          </p>
          <DebugNav />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-8">
          <Suspense
            fallback={<p className="font-hand text-ink-muted">Loading…</p>}
          >
            {children}
          </Suspense>
        </main>
      </div>
    </>
  );
}
