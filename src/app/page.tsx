import Link from "next/link";

import { APP_NAME } from "@/constants/app";

export default function Home() {
  return (
    <>
      <nav className="flex justify-end border-b border-neutral-200 px-4 py-3">
        {process.env.NODE_ENV === "development" && (
          <Link
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            href="/debug"
          >
            Debug view
          </Link>
        )}
      </nav>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
        <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
          {APP_NAME}
        </p>
        <h1 className="text-center text-4xl font-semibold tracking-tight">
          One prompt. One shared tree.
        </h1>
        <p className="max-w-md text-center text-neutral-600">
          Grapevine is a daily picture-telephone game. The player experience is
          still being built; check back soon.
        </p>
      </main>
    </>
  );
}
