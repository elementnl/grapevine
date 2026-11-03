"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { DrawingCanvas } from "@/components/DrawingCanvas";
import { DrawingView } from "@/components/DrawingView";
import {
  GUESS_MAX_LENGTH,
  GUESS_MIN_LENGTH,
  WAITING_POLL_INTERVAL_MS,
} from "@/constants/game";
import type { DrawingData } from "@/types/drawing";
import type { Turn, TurnSubmission } from "@/types/game";

type PlayTurnProps = {
  turn: Turn;
};

async function postTurn(submission: TurnSubmission): Promise<void> {
  const response = await fetch("/api/turn", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(submission),
  });
  if (response.ok) {
    return;
  }

  let message = `The turn could not be saved (HTTP ${response.status}).`;
  try {
    const result: unknown = await response.json();
    if (
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof result.message === "string"
    ) {
      message = result.message;
    }
  } catch {
    // Keep the generic message when the body isn't JSON.
  }
  throw new Error(message);
}

function GuessTurn({
  drawing,
  drawingId,
  onDone,
}: {
  drawing: DrawingData;
  drawingId: number;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postTurn({ kind: "guess", drawingId, text });
      onDone();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save the guess.",
      );
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <header className="text-center">
        <p className="font-hand text-lg text-ink-muted">Your turn</p>
        <h1 className="font-hand text-4xl font-bold">What is this?</h1>
      </header>
      <DrawingView drawing={drawing} label="The drawing to guess" />
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
        <label className="sr-only" htmlFor="guess">
          Your guess
        </label>
        <input
          autoComplete="off"
          className="field flex-1"
          disabled={busy}
          id="guess"
          maxLength={GUESS_MAX_LENGTH}
          minLength={GUESS_MIN_LENGTH}
          onChange={(event) => setText(event.target.value)}
          placeholder="I think it's…"
          required
          value={text}
        />
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Saving…" : "Submit guess"}
        </button>
      </form>
      {error && (
        <p aria-live="polite" className="text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function Waiting() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(
      () => router.refresh(),
      WAITING_POLL_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [router]);

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <div aria-hidden className="flex gap-2">
        {[0, 1, 2].map((dot) => (
          <span
            className="size-3 animate-bounce rounded-full bg-grape motion-reduce:animate-none"
            key={dot}
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
      </div>
      <h1 className="font-hand text-4xl font-bold">Passed down the vine</h1>
      <p className="text-ink-muted">
        Waiting for the other player. This page updates on its own when
        it&apos;s your turn.
      </p>
    </section>
  );
}

export function PlayTurn({ turn }: PlayTurnProps) {
  const router = useRouter();
  const refresh = () => router.refresh();

  switch (turn.kind) {
    case "no_game":
      return (
        <section className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
          <h1 className="font-hand text-4xl font-bold">Nothing to play yet</h1>
          <p className="text-ink-muted">
            A game starts when someone writes a secret prompt and draws it.
            Start one from the debug view.
          </p>
        </section>
      );
    case "wait":
      return <Waiting />;
    case "guess":
      return (
        <GuessTurn
          drawing={turn.drawing}
          drawingId={turn.drawingId}
          key={turn.drawingId}
          onDone={refresh}
        />
      );
    case "draw":
      return (
        <DrawingCanvas
          key={turn.guessId}
          onSubmit={async (drawing) => {
            await postTurn({ kind: "draw", guessId: turn.guessId, drawing });
            refresh();
          }}
          prompt={turn.prompt}
          submitLabel="Submit drawing"
        />
      );
  }
}
