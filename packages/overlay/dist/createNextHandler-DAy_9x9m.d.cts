import { NextRequest, NextResponse } from 'next/server';

type ShipflowOverlayRequestPayload = {
    filePath: string | null;
    htmlFrame: string | null;
    stackTrace: string | null;
    instruction: string;
    model?: string;
};
type ShipflowOverlayServerOptions = {
    cursorAgentBinary?: string;
    additionalSearchDirs?: string[];
    defaultModel?: string;
    allowInProduction?: boolean;
    timeoutMs?: number;
    logPrefix?: string;
};
declare function createNextHandler(options?: ShipflowOverlayServerOptions): (request: NextRequest) => Promise<NextResponse<unknown>>;

export { type ShipflowOverlayServerOptions as S, type ShipflowOverlayRequestPayload as a, createNextHandler as c };
