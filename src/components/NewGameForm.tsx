"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DrawingCanvas } from "@/components/DrawingCanvas";
import { postDebug } from "@/components/debug-api";
import type { DrawingData } from "@/types/drawing";

export function NewGameForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  const startGame = async (drawing: DrawingData) => {
    if (prompt.trim().length === 0) {
      throw new Error("Write the secret prompt first.");
    }
    await postDebug("/api/debug/day-setup", {
      action: "start",
      initialPrompt: prompt,
      drawing,
    });
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1 font-hand text-lg text-ink-muted">
        1. Write a secret prompt
        <input
          autoComplete="off"
          className="field"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="A concrete, drawable prompt"
          value={prompt}
        />
      </label>
      <div className="flex flex-col gap-2">
        <p className="font-hand text-lg text-ink-muted">
          2. Draw it, then start the game
        </p>
        <DrawingCanvas
          onSubmit={startGame}
          prompt={prompt.trim() || "Your secret prompt"}
          submitLabel="Start game"
        />
      </div>
    </div>
  );
}
