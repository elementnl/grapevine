"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { postDebug } from "@/components/debug-api";

type PromptEditorProps = {
  date: string;
  prompt: string;
};

export function PromptEditor({ date, prompt }: PromptEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(prompt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postDebug("/api/debug/admin", {
        action: "rename_game",
        date,
        prompt: value,
      });
      setEditing(false);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save the prompt.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-hand text-4xl font-bold">{prompt}</h1>
        <button
          className="btn btn-quiet px-3 py-0.5 text-base"
          onClick={() => {
            setValue(prompt);
            setEditing(true);
          }}
          type="button"
        >
          Edit prompt
        </button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={save}>
      <label className="font-hand text-lg text-ink-muted" htmlFor="prompt">
        Secret prompt
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          autoComplete="off"
          autoFocus
          className="field flex-1"
          disabled={busy}
          id="prompt"
          onChange={(event) => setValue(event.target.value)}
          required
          value={value}
        />
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          className="btn"
          disabled={busy}
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p aria-live="polite" className="text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
