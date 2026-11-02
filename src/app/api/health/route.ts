import { getHealth } from "@/server/health/health";

export function GET() {
  return Response.json(getHealth());
}
