// The MVP is a single line of telephone, so a day starts from one drawing.
export const STARTER_DRAWING_COUNT = 1;

export const GUESS_MIN_LENGTH = 3;
export const GUESS_MAX_LENGTH = 80;

export const PLAYER_COOKIE_NAME = "grapevine_player";
export const PLAYER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// How often the waiting screen checks whether the other player has moved.
export const WAITING_POLL_INTERVAL_MS = 3_000;

// Fixed identities for the debug player switcher, so one person can play both sides.
export const DEBUG_PLAYERS = {
  a: { label: "Player A", id: "00000000-0000-4000-8000-00000000000a" },
  b: { label: "Player B", id: "00000000-0000-4000-8000-00000000000b" },
} as const;
