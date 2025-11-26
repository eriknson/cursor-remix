# Cursor Agent overlay in context

Installs @shipflow/overlay for selecting components with react grab (hold CMD+C) so you can edit anything in context.

Steps:
- Verify eligibility first: Check for next in package.json and app/ or src/app/ directory. Abort if not App Router.
- Verify cursor-agent CLI is in PATH or set CURSOR_AGENT_BIN env var (warn if missing)
- npm install -D @shipflow/overlay (detect package manager from lockfiles)
- Create app/api/shipflow/overlay/route.ts with this code: import { createNextHandler } from "@shipflow/overlay/next"; export const runtime = "nodejs"; export const dynamic = "force-dynamic"; export const POST = createNextHandler();
- Create app/shipflow-overlay-provider.tsx with use client directive exporting FlowOverlayProvider from @shipflow/overlay
- Wrap next.config with withShipflowOverlay from @shipflow/overlay/next
- Render ShipflowOverlay component in root layout after children

Match code style. Remind user to restart dev server.

Checklist: Cursor CLI verified, Installed, API route, Provider, Config wrapped, Layout updated
