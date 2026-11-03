import { DaySetup } from "@/components/DaySetup";
import { NewGameForm } from "@/components/NewGameForm";

export default function NewGamePage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-hand text-4xl font-bold">Start a new game</h1>
        <p className="max-w-prose text-ink-muted">
          Whatever is live now ends, and the new game starts on the next free
          date with you as the starter&apos;s author. Pick Player A in the top
          bar first if you&apos;re testing alone.
        </p>
      </header>
      <NewGameForm />
      <details className="sketch-alt p-4">
        <summary className="cursor-pointer font-hand text-lg">
          Or schedule a game on a specific date
        </summary>
        <div className="mt-6">
          <DaySetup />
        </div>
      </details>
    </>
  );
}
