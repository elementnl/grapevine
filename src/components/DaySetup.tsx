"use client";

import { type FormEvent, useState } from "react";

import { DrawingCanvas } from "@/components/DrawingCanvas";
import type { DrawingData } from "@/types/drawing";

type DaySetupState = {
  date: string;
  initialPrompt: string;
  starterCount: number;
  status: "scheduled" | "live";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function postDebugAction(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch("/api/debug/day-setup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `The server returned an invalid response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    const message =
      isRecord(result) && typeof result.message === "string"
        ? result.message
        : `The request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return result;
}

export function DaySetup() {
  const [date, setDate] = useState("");
  const [initialPrompt, setInitialPrompt] = useState("");
  const [setup, setSetup] = useState<DaySetupState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await postDebugAction({
        action: "create",
        date,
        initialPrompt,
      });
      if (
        !isRecord(result) ||
        result.date !== date ||
        result.initialPrompt !== initialPrompt.trim() ||
        typeof result.starterCount !== "number" ||
        result.starterCount < 0 ||
        result.starterCount > 2 ||
        (result.status !== "scheduled" && result.status !== "live")
      ) {
        throw new Error("The server returned an invalid day setup.");
      }

      setInitialPrompt(result.initialPrompt);
      setSetup({
        date,
        initialPrompt: result.initialPrompt,
        starterCount: result.starterCount,
        status: result.status,
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not create the day.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveStarter = async (starterIndex: 1 | 2, drawing: DrawingData) => {
    if (!setup) {
      throw new Error("Create the day before saving starter drawings.");
    }

    setBusy(true);
    setError(null);
    try {
      const result = await postDebugAction({
        action: "starter",
        date: setup.date,
        starterIndex,
        drawing,
      });
      if (
        !isRecord(result) ||
        result.date !== setup.date ||
        result.starterCount !== starterIndex
      ) {
        throw new Error(
          "The server returned an invalid starter drawing result.",
        );
      }

      setSetup({ ...setup, starterCount: starterIndex });
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Could not save the starter drawing.";
      setError(message);
      throw reason;
    } finally {
      setBusy(false);
    }
  };

  const publishDay = async () => {
    if (!setup) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await postDebugAction({
        action: "publish",
        date: setup.date,
      });
      if (
        !isRecord(result) ||
        result.date !== setup.date ||
        result.status !== "live"
      ) {
        throw new Error("The server returned an invalid publish result.");
      }

      setSetup({ ...setup, status: "live" });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not publish the day.",
      );
    } finally {
      setBusy(false);
    }
  };

  const starterIndex = setup?.starterCount === 0 ? 1 : 2;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-center text-sm font-medium tracking-wide text-neutral-500 uppercase">
          Development tool
        </p>
        <h1 className="text-center text-3xl font-semibold tracking-tight">
          Set up a game day
        </h1>
        <p className="text-center text-sm text-neutral-600">
          Choose the initial prompt, draw two starters, and publish the day for
          players.
        </p>
      </header>

      {!setup ? (
        <form
          className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          onSubmit={createDay}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              Day
              <input
                className="rounded-lg border border-neutral-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                onChange={(event) => setDate(event.target.value)}
                required
                type="date"
                value={date}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Initial prompt
            <textarea
              className="min-h-24 rounded-lg border border-neutral-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              onChange={(event) => setInitialPrompt(event.target.value)}
              placeholder="A concrete, drawable prompt"
              required
              value={initialPrompt}
            />
          </label>
          <button
            className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-wait disabled:bg-neutral-400"
            disabled={busy}
            type="submit"
          >
            {busy ? "Setting up day…" : "Create or resume day"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">
              {setup.status === "live" ? "Live day" : "Scheduled day"}
            </p>
            <p className="mt-1 text-sm text-neutral-600">{setup.date}</p>
            <h2 className="mt-2 text-xl font-semibold">
              {setup.initialPrompt}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {setup.starterCount} of 2 starter drawings saved
            </p>
          </div>

          {setup.status === "scheduled" && setup.starterCount < 2 && (
            <DrawingCanvas
              key={`${setup.date}-${starterIndex}`}
              onSubmit={(drawing) => saveStarter(starterIndex, drawing)}
              prompt={setup.initialPrompt}
              submitLabel={`Save starter drawing ${starterIndex}`}
            />
          )}

          {setup.status === "scheduled" && setup.starterCount === 2 && (
            <button
              className="self-center rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:bg-neutral-400"
              disabled={busy}
              onClick={publishDay}
              type="button"
            >
              {busy ? "Publishing…" : "Publish day for all players"}
            </button>
          )}

          {setup.status === "live" && (
            <p className="rounded-lg bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800">
              The game is live for {setup.date}.
            </p>
          )}
        </div>
      )}

      {error && (
        <p aria-live="polite" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {!setup && (
        <p className="text-center text-xs text-neutral-500">
          Setup progress is saved as a scheduled day. To resume after a reload,
          enter the same date and prompt.
        </p>
      )}
    </section>
  );
}
