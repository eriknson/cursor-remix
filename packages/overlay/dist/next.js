import {
  createNextHandler
} from "./chunk-CWEC2JE4.js";

// src/next.ts
function withShipflowOverlay(config = {}, options = {}) {
  const enabled = options.enableInProduction || process.env.NODE_ENV === "development";
  const env = {
    ...config.env,
    SHIPFLOW_OVERLAY_ENABLED: enabled ? "true" : "false"
  };
  if (options.reactGrabUrl) {
    env.SHIPFLOW_OVERLAY_REACT_GRAB_URL = options.reactGrabUrl;
  }
  if (options.logClipboardEndpoint) {
    env.SHIPFLOW_OVERLAY_LOG_ENDPOINT = options.logClipboardEndpoint;
  }
  const existingTranspile = Array.isArray(config.transpilePackages) ? config.transpilePackages : [];
  const transpilePackages = Array.from(
    /* @__PURE__ */ new Set([...existingTranspile, "@shipflow/overlay"])
  );
  return {
    ...config,
    env,
    transpilePackages
  };
}
export {
  createNextHandler,
  withShipflowOverlay
};
//# sourceMappingURL=next.js.map