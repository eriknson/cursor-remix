# Shipflow Overlay

The repository combines React Grab and Cursor Agent as `@shipflow/overlay`.

1. Install the package: `npm install -D @shipflow/overlay`.
2. Wrap your Next.js config with `withShipflowOverlay`:
   ```ts
   // next.config.ts
   import { withShipflowOverlay } from "@shipflow/overlay/next";
   export default withShipflowOverlay({
     // existing config
   }, {
     logClipboardEndpoint: "/api/log-clipboard",
   });
   ```
3. Create `app/shipflow-overlay-provider.tsx`:
   ```tsx
   'use client';
   import { FlowOverlayProvider } from "@shipflow/overlay";

   export function ShipflowOverlay() {
     return <FlowOverlayProvider />;
   }
   ```
4. Render the overlay in `app/layout.tsx` inside a dev-only guard.
5. Add the Shipflow API handler at `app/api/shipflow/overlay/route.ts`:
   ```ts
   import { createNextHandler } from "@shipflow/overlay/next";
   export const runtime = "nodejs";
   export const dynamic = "force-dynamic";
   export const POST = createNextHandler();
   ```
6. Make sure the `cursor-agent` CLI is installed and on your `PATH`, or set `CURSOR_AGENT_BIN`.
7. Optionally run `npx shipflow-overlay init` to scaffold these files and add `.env` hints automatically.