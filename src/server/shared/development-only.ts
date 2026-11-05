import "server-only";

export function isLocalDebugEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
