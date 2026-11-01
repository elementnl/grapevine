import { getHealth } from "@/server/health";

export function GET() {
  return Response.json(getHealth());
}
