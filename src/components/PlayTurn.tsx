"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Countdown } from "@/components/Countdown";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { DrawingView } from "@/components/DrawingView";
import {
  GUESS_MAX_LENGTH,
  GUESS_MIN_LENGTH,
  WAITING_POLL_INTERVAL_MS,
} from "@/constants/game";
import type { OpenTurn, Turn } from "@/types/game";

type PlayTurnProps = {
  turn: Turn;
};

async function postJson(url: string, body?: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.ok) {
    return;
  }

  let message = `Something went wrong (HTTP ${response.status}).`;
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

function submitUrl(turn: OpenTurn): string {
  return `/api/turns/${turn.assignmentId}/submit`;
}

function turnsLeftLabel(turnsLeft: number | null): string {
  if (turnsLeft === null) {
    return "Unlimited turns while testing locally.";
  }
  return turnsLeft === 1
    ? "1 turn left today."
    : `${turnsLeft} turns left today.`;
}

function GuessTurn({
  turn,
  onDone,
}: {
  turn: Extract<OpenTurn, { task: "guess" }>;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef(text);
  const busyRef = useRef(false);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const send = async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await postJson(submitUrl(turn), { text: textRef.current });
      onDone();
    } catch (reason) {
      busyRef.current = false;
      setBusy(false);
      setError(
        reason instanceof Error ? reason.message : "Could not save the guess.",
      );
    }
  };
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });

  // At zero, a long-enough guess is sent; otherwise the turn lapses and is given back.
  useEffect(() => {
    const timer = setTimeout(
      () => {
        if (textRef.current.trim().length >= GUESS_MIN_LENGTH) {
          void sendRef.current();
        } else {
          onDone();
        }
      },
      Math.max(0, Date.parse(turn.endsAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [onDone, turn.endsAt]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send();
  };

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <header className="text-center">
        <p className="font-hand text-lg text-ink-muted">Your turn</p>
        <h1 className="font-hand text-4xl font-bold">What is this?</h1>
      </header>
      <Countdown endsAt={turn.endsAt} totalSeconds={turn.timeLimitSec} />
      <DrawingView drawing={turn.drawing} label="The drawing to guess" />
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
        <label className="sr-only" htmlFor="guess">
          Your guess
        </label>
        <input
          autoComplete="off"
          autoFocus
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

function Ready({
  turnsLeft,
  onStarted,
}: {
  turnsLeft: number | null;
  onStarted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/turns");
      onStarted();
    } catch (reason) {
      setBusy(false);
      setError(
        reason instanceof Error ? reason.message : "Could not start a turn.",
      );
    }
  };

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <h1 className="font-hand text-5xl font-bold">Ready?</h1>
      <p className="text-ink-muted">
        You&apos;ll get a drawing to guess or a guess to draw, with a timer.{" "}
        {turnsLeftLabel(turnsLeft)}
      </p>
      <button
        className="btn btn-primary px-8 text-2xl"
        disabled={busy}
        onClick={() => void start()}
        type="button"
      >
        {busy ? "Finding a turn…" : "Play"}
      </button>
      {error && (
        <p aria-live="polite" className="text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function Waiting({ turnsLeft }: { turnsLeft: number | null }) {
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
        Nothing new for you to play yet. This page updates on its own when
        someone adds to the tree. {turnsLeftLabel(turnsLeft)}
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
            Start one from the admin view.
          </p>
        </section>
      );
    case "ready":
      return <Ready onStarted={refresh} turnsLeft={turn.turnsLeft} />;
    case "nothing_to_play":
      return <Waiting turnsLeft={turn.turnsLeft} />;
    case "out_of_turns":
      return (
        <section className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="font-hand text-4xl font-bold">
            That&apos;s all for today
          </h1>
          <p className="text-ink-muted">
            Come back tomorrow to see where your drawings and guesses went.
          </p>
          <Link className="btn" href="/tree">
            See the tree
          </Link>
        </section>
      );
    case "playing": {
      const current = turn.turn;
      if (current.task === "guess") {
        return (
          <GuessTurn
            key={current.assignmentId}
            onDone={refresh}
            turn={current}
          />
        );
      }
      return (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <Countdown
            endsAt={current.endsAt}
            totalSeconds={current.timeLimitSec}
          />
          <DrawingCanvas
            endsAt={current.endsAt}
            key={current.assignmentId}
            onSubmit={async (drawing) => {
              await postJson(submitUrl(current), { drawing });
              refresh();
            }}
            onTimeUp={refresh}
            prompt={current.prompt}
            submitLabel="Submit drawing"
          />
        </div>
      );
    }
  }
}
