import { createNextHandler } from "@shipflow/overlay/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createNextHandler();

export const POST = handler;



