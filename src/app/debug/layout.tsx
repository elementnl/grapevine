import { Suspense } from "react";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { io } from "next/cache";

import { DebugNav } from "@/components/DebugNav";
import { PlayerSwitcher } from "@/components/PlayerSwitcher";
import { TopBar } from "@/components/TopBar";
import { signOut } from "@/app/login/actions";
import { getDebugPlayerSlot, readPlayerId } from "@/server/players/player";
import { getAdminUser } from "@/server/auth/admin";

async function CurrentPlayer() {
  return <PlayerSwitcher slot={getDebugPlayerSlot(await readPlayerId())} />;
}

async function AuthenticatedDebugLayout({ children }: { children: ReactNode }) {
  await io();

  if (!(await getAdminUser())) {
    redirect("/login");
  }

  return (
    <>
      <TopBar
        links={[
          { href: "/", label: "Play" },
          { href: "/tree", label: "See the tree" },
        ]}
        trailing={
          <form action={signOut}>
            <button className="btn btn-quiet px-3 py-1 text-base" type="submit">
              Sign out
            </button>
          </form>
        }
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

export default function DebugLayout({ children }: LayoutProps<"/debug">) {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <p className="font-hand text-xl text-ink-muted">
            Checking admin access…
          </p>
        </main>
      }
    >
      <AuthenticatedDebugLayout>{children}</AuthenticatedDebugLayout>
    </Suspense>
  );
}
