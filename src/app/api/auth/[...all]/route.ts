import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/guards";

declare global {
  var __authHandlers: ReturnType<typeof toNextJsHandler> | undefined;
}

function getHandlers() {
  if (!globalThis.__authHandlers) {
    globalThis.__authHandlers = toNextJsHandler(getAuth());
  }
  return globalThis.__authHandlers;
}

export const GET = (req: Request) => getHandlers().GET(req);
export const POST = (req: Request) => getHandlers().POST(req);
