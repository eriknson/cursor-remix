import type { NextConfig } from "next";
import { withShipflowOverlay } from "@shipflow/overlay/next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withShipflowOverlay(nextConfig, {
  logClipboardEndpoint: "/api/log-clipboard",
});
