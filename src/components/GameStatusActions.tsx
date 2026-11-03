import { ActionButton } from "@/components/ActionButton";
import type { GameStatus } from "@/types/game";

type GameStatusActionsProps = {
  date: string;
  status: GameStatus;
  // Where to land after deleting; a detail page can't stay on its own game.
  afterDelete?: string;
};

// Live ↔ ended, plus delete: the same controls on the list and the detail page.
export function GameStatusActions({
  date,
  status,
  afterDelete,
}: GameStatusActionsProps) {
  return (
    <>
      {status === "live" ? (
        <ActionButton
          payload={{ action: "set_game_status", date, status: "frozen" }}
        >
          End game
        </ActionButton>
      ) : (
        <ActionButton
          confirm="Make this the live game? Whatever is live now will end."
          payload={{ action: "set_game_status", date, status: "live" }}
        >
          {status === "frozen" ? "Resume" : "Make live"}
        </ActionButton>
      )}
      <ActionButton
        confirm={`Delete the ${date} game and every drawing and guess in it? This can't be undone.`}
        payload={{ action: "delete_game", date }}
        redirectTo={afterDelete}
        variant="danger"
      >
        Delete
      </ActionButton>
    </>
  );
}
