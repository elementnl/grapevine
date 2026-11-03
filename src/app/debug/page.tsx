import Link from "next/link";

import { APP_NAME } from "@/constants/app";
import { DaySetup } from "@/components/DaySetup";

export default function DebugPage() {
  if (process.env.NODE_ENV !== "development") {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="text-sm text-neutral-600">
          The debug view is only available in development.
        </p>
      </main>
    );
  }

  return (
    <>
      <nav className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <Link
          className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          href="/"
        >
          User view
        </Link>
        <span className="text-sm font-medium text-neutral-500">{APP_NAME}</span>
      </nav>
      <main className="flex flex-1 flex-col gap-8 px-4 py-12">
        <DaySetup />
      </main>
    </>
  );
}
