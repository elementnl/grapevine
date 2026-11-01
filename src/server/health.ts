import "server-only";

import { APP_NAME } from "@/constants/app";

export type HealthStatus = {
  status: "ok";
  app: string;
};

export function getHealth(): HealthStatus {
  return { status: "ok", app: APP_NAME };
}
