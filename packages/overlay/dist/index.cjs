"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DEFAULT_MODEL_OPTIONS: () => DEFAULT_MODEL_OPTIONS,
  DEFAULT_STATUS_SEQUENCE: () => DEFAULT_STATUS_SEQUENCE,
  FlowOverlayProvider: () => FlowOverlayProvider,
  Typewriter: () => Typewriter,
  createNextHandler: () => createNextHandler,
  loadReactGrabRuntime: () => loadReactGrabRuntime,
  registerClipboardInterceptor: () => registerClipboardInterceptor
});
module.exports = __toCommonJS(index_exports);

// src/runtime/FlowOverlay.tsx
var import_react = require("react");
var import_react_dom = require("react-dom");
var import_lucide_react = require("lucide-react");

// src/runtime/cn.ts
var import_clsx = require("clsx");
var import_tailwind_merge = require("tailwind-merge");
function cn(...inputs) {
  return (0, import_tailwind_merge.twMerge)((0, import_clsx.clsx)(inputs));
}

// src/runtime/constants.ts
var DEFAULT_STATUS_SEQUENCE = [
  "Thinking",
  "Planning next moves",
  "Updating UI"
];
var DEFAULT_MODEL_OPTIONS = [
  { value: "composer-1", label: "Composer 1" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "sonnet-4.5", label: "Sonnet 4.5" },
  { value: "gemini-3", label: "Gemini 3" }
];

// src/runtime/loadReactGrabRuntime.ts
var DEFAULT_SCRIPT_URL = "https://unpkg.com/react-grab@0.0.51/dist/index.global.js";
var GLOBAL_FLAG = "__shipflowReactGrabLoaded";
var pendingLoad = null;
function loadReactGrabRuntime(options = {}) {
  var _a3;
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window[GLOBAL_FLAG]) {
    return Promise.resolve();
  }
  if (pendingLoad) {
    return pendingLoad;
  }
  const scriptUrl = (_a3 = options.url) != null ? _a3 : DEFAULT_SCRIPT_URL;
  pendingLoad = new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find((script2) => script2.src === scriptUrl);
    if (existing) {
      window[GLOBAL_FLAG] = true;
      pendingLoad = null;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.crossOrigin = "anonymous";
    script.async = false;
    script.onload = () => {
      window[GLOBAL_FLAG] = true;
      pendingLoad = null;
      resolve();
    };
    script.onerror = (error) => {
      pendingLoad = null;
      reject(error instanceof ErrorEvent ? error.error : error);
    };
    document.head.appendChild(script);
  });
  return pendingLoad;
}

// src/runtime/registerClipboardInterceptor.ts
var GLOBAL_KEY = "__shipflowOverlayCleanup";
var HIGHLIGHT_ATTR = "data-react-grab-chat-highlighted";
var STYLE_ID = "shipflow-overlay-highlight-style";
var EVENT_OPEN = "react-grab-chat:open";
var EVENT_CLOSE = "react-grab-chat:close";
var defaultOptions = {
  highlightColor: "#ff40e0",
  highlightStyleId: STYLE_ID
};
function ensureHighlightStyles(color, styleId) {
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
[${HIGHLIGHT_ATTR}="true"] {
  outline: 2px solid ${color};
  outline-offset: 2px;
  transition: outline 0.2s ease;
}`;
  document.head.appendChild(style);
}
function parseClipboard(text) {
  if (typeof text !== "string") {
    return { htmlFrame: null, codeLocation: null };
  }
  const htmlFrameMatch = text.match(/## HTML Frame:\n([\s\S]*?)(?=\n## Code Location:|$)/);
  const codeLocationMatch = text.match(/## Code Location:\n([\s\S]*?)(?=\n<\/selected_element>|$)/);
  const selectedElementMatch = text.match(/<selected_element>\n([\s\S]*?)\n<\/selected_element>/);
  const htmlFrame = htmlFrameMatch ? htmlFrameMatch[1].trim() : selectedElementMatch ? selectedElementMatch[1].trim() : null;
  const codeLocation = codeLocationMatch ? codeLocationMatch[1].trim() : null;
  return { htmlFrame, codeLocation };
}
function extractFilePath(stack) {
  if (typeof stack !== "string") return null;
  const pathRegex = /\b(?:in\s+|at\s+)((?:[A-Za-z]:)?\/?[^:\s)]+?\.(?:[jt]sx?|mdx?))/g;
  let match = null;
  while (match = pathRegex.exec(stack)) {
    const candidate = match[1];
    if (candidate) {
      return candidate.trim();
    }
  }
  return null;
}
function toRelativePath(filePath, projectRoot) {
  if (!filePath) return null;
  if (!projectRoot) return filePath;
  const normalizedRoot = projectRoot.endsWith("/") ? projectRoot : `${projectRoot}/`;
  if (filePath.startsWith(normalizedRoot)) {
    const sliced = filePath.slice(normalizedRoot.length);
    return sliced.startsWith("/") ? sliced.slice(1) : sliced;
  }
  return filePath;
}
function findElementAtPoint(clientX, clientY) {
  var _a3;
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    if ((_a3 = element.closest) == null ? void 0 : _a3.call(element, "[data-react-grab]")) continue;
    const style = window.getComputedStyle(element);
    if (style.pointerEvents === "none" || style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) {
      continue;
    }
    return element;
  }
  return null;
}
function findTooltipElement() {
  var _a3;
  const OVERLAY_SELECTOR = '[data-react-grab="true"]';
  const TOOLTIP_SELECTOR = "div.pointer-events-none.bg-grab-pink-light.text-grab-pink";
  const visited = /* @__PURE__ */ new Set();
  const visit = (node) => {
    if (!node || visited.has(node)) {
      return null;
    }
    visited.add(node);
    if (node instanceof HTMLElement || node instanceof DocumentFragment) {
      const queryMatch = node instanceof HTMLElement ? node.querySelector(TOOLTIP_SELECTOR) : null;
      if (queryMatch) {
        return queryMatch;
      }
      const children = node instanceof HTMLElement ? Array.from(node.children) : [];
      for (const child of children) {
        const found = visit(child);
        if (found) {
          return found;
        }
      }
    }
    if (node instanceof HTMLElement && node.shadowRoot) {
      return visit(node.shadowRoot);
    }
    return null;
  };
  const hosts = document.querySelectorAll(OVERLAY_SELECTOR);
  for (const host of hosts) {
    const found = (_a3 = visit(host)) != null ? _a3 : host.shadowRoot ? visit(host.shadowRoot) : null;
    if (found) {
      return found;
    }
  }
  return null;
}
function getHoverTagRect() {
  const tooltip = findTooltipElement();
  if (!(tooltip instanceof HTMLElement)) {
    return null;
  }
  const rect = tooltip.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}
function applyHighlight(element) {
  if (!element) return;
  const previous = document.querySelector(`[${HIGHLIGHT_ATTR}="true"]`);
  if (previous && previous !== element) {
    previous.removeAttribute(HIGHLIGHT_ATTR);
  }
  element.setAttribute(HIGHLIGHT_ATTR, "true");
}
function clearHighlight() {
  const highlighted = document.querySelector(`[${HIGHLIGHT_ATTR}="true"]`);
  highlighted == null ? void 0 : highlighted.removeAttribute(HIGHLIGHT_ATTR);
}
function dispatchOpenEvent(detail) {
  window.dispatchEvent(
    new CustomEvent(EVENT_OPEN, {
      detail
    })
  );
}
function registerClipboardInterceptor(options = {}) {
  var _a3, _b2;
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return () => void 0;
  }
  if (window[GLOBAL_KEY]) {
    return window[GLOBAL_KEY];
  }
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    console.warn("[shipflow-overlay] navigator.clipboard.writeText is not available.");
    return () => void 0;
  }
  const projectRoot = options.projectRoot;
  const highlightColor = (_a3 = options.highlightColor) != null ? _a3 : defaultOptions.highlightColor;
  const highlightStyleId = (_b2 = options.highlightStyleId) != null ? _b2 : defaultOptions.highlightStyleId;
  const logClipboardEndpoint = options.logClipboardEndpoint === void 0 ? null : options.logClipboardEndpoint;
  ensureHighlightStyles(highlightColor, highlightStyleId);
  clearHighlight();
  void loadReactGrabRuntime({ url: options.reactGrabUrl });
  let lastPointer = null;
  const pointerListener = (event) => {
    const pointer = event;
    lastPointer = { clientX: pointer.clientX, clientY: pointer.clientY };
  };
  window.addEventListener("pointerup", pointerListener, true);
  window.addEventListener(EVENT_CLOSE, clearHighlight);
  const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
  const overrideWriteText = async function(text) {
    const parsed = parseClipboard(text);
    const isReactGrabPayload = Boolean(parsed.htmlFrame || parsed.codeLocation);
    const result = await originalWriteText(text);
    if (!isReactGrabPayload) {
      return result;
    }
    const pointer = lastPointer;
    lastPointer = null;
    const pointerPayload = pointer ? { x: pointer.clientX, y: pointer.clientY } : null;
    let boundingRect = null;
    let element = null;
    if (pointer) {
      element = findElementAtPoint(pointer.clientX, pointer.clientY);
    }
    if (!element) {
      const fallback = document.querySelector(`[${HIGHLIGHT_ATTR}="true"]`);
      if (fallback) {
        element = fallback;
      }
    }
    if (element instanceof HTMLElement) {
      applyHighlight(element);
      const rect = element.getBoundingClientRect();
      boundingRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
    }
    let filePath = parsed.codeLocation ? extractFilePath(parsed.codeLocation) : null;
    filePath = filePath ? toRelativePath(filePath, projectRoot) : null;
    const tagRect = getHoverTagRect();
    dispatchOpenEvent({
      htmlFrame: parsed.htmlFrame,
      codeLocation: parsed.codeLocation,
      filePath,
      clipboardData: text,
      pointer: pointerPayload,
      boundingRect,
      tagRect
    });
    if (logClipboardEndpoint) {
      try {
        await fetch(logClipboardEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clipboardData: text,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            filePath
          })
        });
      } catch (error) {
        console.error("[shipflow-overlay] Failed to log clipboard payload", error);
      }
    }
    return result;
  };
  navigator.clipboard.writeText = overrideWriteText;
  const cleanup = () => {
    window.removeEventListener("pointerup", pointerListener, true);
    window.removeEventListener(EVENT_CLOSE, clearHighlight);
    if (navigator.clipboard.writeText === overrideWriteText) {
      navigator.clipboard.writeText = originalWriteText;
    }
    clearHighlight();
    delete window[GLOBAL_KEY];
  };
  window[GLOBAL_KEY] = cleanup;
  return cleanup;
}

// src/runtime/FlowOverlay.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var HIGHLIGHT_QUERY = "[data-react-grab-chat-highlighted='true']";
var EVENT_OPEN2 = "react-grab-chat:open";
var EVENT_CLOSE2 = "react-grab-chat:close";
var EVENT_UNDO = "react-grab-chat:undo";
var DEFAULT_CONFIG = {
  endpoint: "/api/shipflow/overlay",
  models: DEFAULT_MODEL_OPTIONS,
  statusSequence: DEFAULT_STATUS_SEQUENCE
};
var DEFAULT_BUBBLE_STYLE = {
  top: "20%",
  left: "50%",
  transform: "translate(-50%, -50%)"
};
var VIEWPORT_MARGIN = 12;
var ANCHOR_GAP = 24;
var POINTER_HORIZONTAL_GAP = 16;
var POINTER_VERTICAL_OFFSET = 12;
var createInitialState = (models, statusSequence) => {
  var _a3, _b2, _c;
  return {
    htmlFrame: null,
    codeLocation: null,
    filePath: null,
    clipboardData: "",
    pointer: null,
    boundingRect: null,
    instruction: "",
    status: "idle",
    serverMessage: void 0,
    error: void 0,
    model: (_b2 = (_a3 = models[0]) == null ? void 0 : _a3.value) != null ? _b2 : "",
    statusPhase: 0,
    statusAddonMode: "idle",
    statusLabel: (_c = statusSequence[0]) != null ? _c : null,
    statusContext: null,
    useTypewriter: true,
    summary: void 0
  };
};
function CursorIcon({ className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      viewBox: "0 0 466.73 533.32",
      className,
      xmlns: "http://www.w3.org/2000/svg",
      shapeRendering: "geometricPrecision",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "#72716d", d: "M233.37,266.66l231.16,133.46c-1.42,2.46-3.48,4.56-6.03,6.03l-216.06,124.74c-5.61,3.24-12.53,3.24-18.14,0L8.24,406.15c-2.55-1.47-4.61-3.57-6.03-6.03l231.16-133.46h0Z" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "#55544f", d: "M233.37,0v266.66L2.21,400.12c-1.42-2.46-2.21-5.3-2.21-8.24v-250.44c0-5.89,3.14-11.32,8.24-14.27L224.29,2.43c2.81-1.62,5.94-2.43,9.07-2.43h.01Z" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "#43413c", d: "M464.52,133.2c-1.42-2.46-3.48-4.56-6.03-6.03L242.43,2.43c-2.8-1.62-5.93-2.43-9.06-2.43v266.66l231.16,133.46c1.42-2.46,2.21-5.3,2.21-8.24v-250.44c0-2.95-.78-5.77-2.21-8.24h-.01Z" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "#d6d5d2", d: "M448.35,142.54c1.31,2.26,1.49,5.16,0,7.74l-209.83,363.42c-1.41,2.46-5.16,1.45-5.16-1.38v-239.48c0-1.91-.51-3.75-1.44-5.36l216.42-124.95h.01Z" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "#fff", d: "M448.35,142.54l-216.42,124.95c-.92-1.6-2.26-2.96-3.92-3.92L20.62,143.83c-2.46-1.41-1.45-5.16,1.38-5.16h419.65c2.98,0,5.4,1.61,6.7,3.87Z" })
      ]
    }
  );
}
function useSelectionEvents(onOpen, onClose, isOpen) {
  (0, import_react.useEffect)(() => {
    const handler = (event) => {
      const custom = event;
      if (!custom.detail) return;
      if (isOpen) {
        onClose();
      }
      onOpen(custom.detail);
    };
    window.addEventListener(EVENT_OPEN2, handler);
    return () => window.removeEventListener(EVENT_OPEN2, handler);
  }, [onOpen, onClose, isOpen]);
}
function useRecalculateRect(chat, setChat) {
  (0, import_react.useEffect)(() => {
    if (!chat) return;
    const updateRect = () => {
      const element = document.querySelector(HIGHLIGHT_QUERY);
      if (!(element instanceof HTMLElement)) {
        setChat((current) => {
          if (!current || current.boundingRect === null) {
            return current;
          }
          return { ...current, boundingRect: null };
        });
        return;
      }
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const nextRect = {
        top: rect.top + scrollY,
        left: rect.left + scrollX,
        width: rect.width,
        height: rect.height
      };
      setChat((current) => {
        if (!current) {
          return current;
        }
        const prev = current.boundingRect;
        const hasChanged = !prev || prev.top !== nextRect.top || prev.left !== nextRect.left || prev.width !== nextRect.width || prev.height !== nextRect.height;
        if (!hasChanged) {
          return current;
        }
        return {
          ...current,
          boundingRect: nextRect
        };
      });
    };
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [chat, setChat]);
}
function useEscapeToClose(isOpen, onClose) {
  (0, import_react.useEffect)(() => {
    if (!isOpen) return;
    const handler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, onClose]);
}
function useAutoFocus(isOpen) {
  (0, import_react.useEffect)(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const textarea = document.querySelector(
        "[data-react-grab-chat-input='true']"
      );
      textarea == null ? void 0 : textarea.focus();
      textarea == null ? void 0 : textarea.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);
}
function useClickOutside(ref, isOpen, onClose) {
  (0, import_react.useEffect)(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      const target = event.target;
      if (ref.current && !ref.current.contains(target)) {
        const highlightedElement = document.querySelector(HIGHLIGHT_QUERY);
        if (!highlightedElement || !highlightedElement.contains(target)) {
          onClose();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [ref, isOpen, onClose]);
}
function Typewriter({ text }) {
  const [displayed, setDisplayed] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    setDisplayed("");
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 15);
    return () => clearInterval(timer);
  }, [text]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: displayed });
}
function Bubble({
  chat,
  onInstructionChange,
  onSubmit,
  onStop,
  onModelChange,
  onClose,
  modelOptions,
  statusSequence
}) {
  var _a3, _b2, _c;
  const anchor = chat.boundingRect;
  const bubbleRef = (0, import_react.useRef)(null);
  const [bubbleSize, setBubbleSize] = (0, import_react.useState)(null);
  const [bubbleStyle, setBubbleStyle] = (0, import_react.useState)(DEFAULT_BUBBLE_STYLE);
  const textareaRef = (0, import_react.useRef)(null);
  useClickOutside(bubbleRef, true, onClose);
  (0, import_react.useLayoutEffect)(() => {
    const node = bubbleRef.current;
    if (!node) return;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setBubbleSize((prev) => {
        if (prev && prev.width === rect.width && prev.height === rect.height) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };
    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(node);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, []);
  (0, import_react.useLayoutEffect)(() => {
    var _a4;
    if (!bubbleSize) {
      setBubbleStyle((prev) => prev === DEFAULT_BUBBLE_STYLE ? prev : DEFAULT_BUBBLE_STYLE);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const verticalGap = ANCHOR_GAP;
    const horizontalGap = ANCHOR_GAP;
    const clampHorizontal = (value) => {
      const min = VIEWPORT_MARGIN;
      const max = viewportWidth - VIEWPORT_MARGIN - bubbleSize.width;
      if (min > max) {
        return (viewportWidth - bubbleSize.width) / 2;
      }
      return Math.min(Math.max(value, min), max);
    };
    const clampVertical = (value) => {
      const min = VIEWPORT_MARGIN;
      const max = viewportHeight - VIEWPORT_MARGIN - bubbleSize.height;
      if (min > max) {
        return (viewportHeight - bubbleSize.height) / 2;
      }
      return Math.min(Math.max(value, min), max);
    };
    const computeOverflow = (top, left) => {
      const overflowTop = Math.max(VIEWPORT_MARGIN - top, 0);
      const overflowBottom = Math.max(
        top + bubbleSize.height - (viewportHeight - VIEWPORT_MARGIN),
        0
      );
      const overflowLeft = Math.max(VIEWPORT_MARGIN - left, 0);
      const overflowRight = Math.max(
        left + bubbleSize.width - (viewportWidth - VIEWPORT_MARGIN),
        0
      );
      return overflowTop + overflowBottom + overflowLeft + overflowRight;
    };
    const pointer = chat.pointer;
    let bestStyle = null;
    if (anchor) {
      const anchorViewport = {
        top: anchor.top - scrollY,
        left: anchor.left - scrollX,
        width: anchor.width,
        height: anchor.height
      };
      const anchorCenterX = anchorViewport.left + anchorViewport.width / 2;
      const anchorCenterY = anchorViewport.top + anchorViewport.height / 2;
      const candidates = [];
      const bottomTop = anchorViewport.top + anchorViewport.height + verticalGap;
      const bottomLeft = clampHorizontal(anchorCenterX - bubbleSize.width / 2);
      candidates.push({
        name: "bottom",
        top: bottomTop,
        left: bottomLeft,
        fits: bottomTop + bubbleSize.height <= viewportHeight - VIEWPORT_MARGIN,
        overflow: computeOverflow(bottomTop, bottomLeft)
      });
      const topTop = anchorViewport.top - verticalGap - bubbleSize.height;
      const topLeft = clampHorizontal(anchorCenterX - bubbleSize.width / 2);
      candidates.push({
        name: "top",
        top: topTop,
        left: topLeft,
        fits: topTop >= VIEWPORT_MARGIN,
        overflow: computeOverflow(topTop, topLeft)
      });
      const rightLeft = anchorViewport.left + anchorViewport.width + horizontalGap;
      const rightTop = clampVertical(anchorCenterY - bubbleSize.height / 2);
      candidates.push({
        name: "right",
        top: rightTop,
        left: rightLeft,
        fits: rightLeft + bubbleSize.width <= viewportWidth - VIEWPORT_MARGIN,
        overflow: computeOverflow(rightTop, rightLeft)
      });
      const leftLeft = anchorViewport.left - horizontalGap - bubbleSize.width;
      const leftTop = clampVertical(anchorCenterY - bubbleSize.height / 2);
      candidates.push({
        name: "left",
        top: leftTop,
        left: leftLeft,
        fits: leftLeft >= VIEWPORT_MARGIN,
        overflow: computeOverflow(leftTop, leftLeft)
      });
      const baseOrder = ["bottom", "top", "right", "left"];
      const orderedCandidates = baseOrder.map((name) => candidates.find((candidate) => candidate.name === name)).filter((candidate) => Boolean(candidate));
      const perfectCandidate = orderedCandidates.find(
        (candidate) => candidate.fits && candidate.overflow === 0
      );
      if (perfectCandidate) {
        bestStyle = {
          top: `${Math.round(perfectCandidate.top + scrollY)}px`,
          left: `${Math.round(perfectCandidate.left + scrollX)}px`
        };
      } else if (!pointer) {
        const bestCandidate = (_a4 = orderedCandidates.find((candidate) => candidate.fits)) != null ? _a4 : orderedCandidates.length > 0 ? orderedCandidates.reduce(
          (best, candidate) => candidate.overflow < best.overflow ? candidate : best,
          orderedCandidates[0]
        ) : null;
        if (bestCandidate) {
          bestStyle = {
            top: `${Math.round(bestCandidate.top + scrollY)}px`,
            left: `${Math.round(bestCandidate.left + scrollX)}px`
          };
        }
      }
    }
    if (!bestStyle && pointer) {
      const pointerTopRaw = pointer.y - POINTER_VERTICAL_OFFSET;
      const clampedTop = clampVertical(pointerTopRaw);
      const rightLeftRaw = pointer.x + POINTER_HORIZONTAL_GAP;
      const fitsRight = rightLeftRaw + bubbleSize.width <= viewportWidth - VIEWPORT_MARGIN;
      let targetLeft = rightLeftRaw;
      if (!fitsRight) {
        const leftLeftRaw = pointer.x - POINTER_HORIZONTAL_GAP - bubbleSize.width;
        targetLeft = leftLeftRaw;
      }
      const clampedLeft = clampHorizontal(targetLeft);
      bestStyle = {
        top: `${Math.round(clampedTop + scrollY)}px`,
        left: `${Math.round(clampedLeft + scrollX)}px`
      };
    }
    if (bestStyle) {
      setBubbleStyle((prev) => {
        if (prev.top === bestStyle.top && prev.left === bestStyle.left && !("transform" in prev)) {
          return prev;
        }
        return bestStyle;
      });
      return;
    }
    setBubbleStyle((prev) => prev === DEFAULT_BUBBLE_STYLE ? prev : DEFAULT_BUBBLE_STYLE);
  }, [anchor, bubbleSize, chat.pointer]);
  const isSubmitting = chat.status === "submitting";
  const hasInput = chat.instruction.trim().length > 0;
  const showExpandedLayout = hasInput || chat.status !== "idle";
  const disableEditing = isSubmitting;
  const computedStatusLabel = (_c = (_b2 = (_a3 = chat.statusLabel) != null ? _a3 : statusSequence[chat.statusPhase]) != null ? _b2 : statusSequence[0]) != null ? _c : null;
  const handleUndo = (0, import_react.useCallback)(() => {
    var _a4;
    if (chat.statusAddonMode !== "summary") {
      return;
    }
    window.dispatchEvent(
      new CustomEvent(EVENT_UNDO, {
        detail: {
          instruction: chat.instruction,
          summary: (_a4 = chat.summary) != null ? _a4 : null,
          filePath: chat.filePath
        }
      })
    );
  }, [chat]);
  (0, import_react.useEffect)(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const minRows = showExpandedLayout ? 2 : 1;
    textarea.rows = minRows;
    textarea.style.height = "auto";
    const computedStyles = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyles.lineHeight) || 24;
    const borderOffset = textarea.offsetHeight - textarea.clientHeight;
    const minHeight = lineHeight * minRows + borderOffset;
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
  }, [chat.instruction, showExpandedLayout]);
  const handleKeyDown = (0, import_react.useCallback)(
    (event) => {
      if (event.key !== "Enter") return;
      if (event.shiftKey) {
        return;
      }
      event.preventDefault();
      if (!isSubmitting && hasInput) {
        onSubmit();
      }
    },
    [hasInput, isSubmitting, onSubmit]
  );
  const handleChange = (0, import_react.useCallback)(
    (event) => {
      onInstructionChange(event.target.value);
    },
    [onInstructionChange]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      ref: bubbleRef,
      className: cn(
        "absolute z-[2147483647] flex w-full max-w-[400px] flex-col overflow-hidden rounded-xl border border-neutral-200/40 bg-neutral-50/60 text-neutral-900 shadow-2xl backdrop-blur-2xl font-sans dark:border-neutral-700/40 dark:bg-neutral-900/60 dark:text-neutral-50",
        "animate-in fade-in-0 zoom-in-95 duration-100 ease-out"
      ),
      style: bubbleStyle,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Shipflow overlay request",
      "data-react-grab-chat-bubble": "true",
      "data-react-grab": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: cn(
              "flex w-full flex-col p-3",
              showExpandedLayout ? "gap-2" : "gap-0"
            ),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative flex w-full items-center gap-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "textarea",
                  {
                    ref: textareaRef,
                    "data-react-grab-chat-input": "true",
                    rows: showExpandedLayout ? 2 : 1,
                    className: cn(
                      "w-full resize-none bg-transparent text-sm font-normal leading-relaxed text-neutral-800 placeholder:text-neutral-400 outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500",
                      disableEditing && "opacity-50",
                      !showExpandedLayout && "pr-10"
                    ),
                    placeholder: "Change anything",
                    value: chat.instruction,
                    onChange: handleChange,
                    onKeyDown: handleKeyDown,
                    disabled: disableEditing
                  }
                ),
                !showExpandedLayout ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: onSubmit,
                    disabled: !hasInput || isSubmitting,
                    className: cn(
                      "absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-300/50 text-neutral-600 transition hover:bg-neutral-300/80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-700/50 dark:text-neutral-300 dark:hover:bg-neutral-700/80"
                    ),
                    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ArrowUp, { className: "h-4 w-4" })
                  }
                ) : null
              ] }),
              showExpandedLayout ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 ease-out", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative inline-flex", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "select",
                    {
                      "aria-label": "Model selection",
                      className: cn(
                        "h-8 w-auto appearance-none rounded-lg bg-neutral-200/50 pl-3 pr-[26px] text-xs font-medium text-neutral-500 transition hover:bg-neutral-200/70 focus:outline-none focus:ring-2 focus:ring-neutral-300/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:focus:ring-neutral-700/50"
                      ),
                      value: chat.model,
                      onChange: (event) => onModelChange(event.target.value),
                      disabled: disableEditing,
                      children: modelOptions.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: option.value, children: option.label }, option.value))
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M1 1l4 4 4-4", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: isSubmitting ? onStop : onSubmit,
                    disabled: !hasInput && !isSubmitting,
                    className: cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                      isSubmitting ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200" : "bg-neutral-900 text-white shadow-lg hover:bg-neutral-800 hover:scale-105 dark:bg-white dark:text-black dark:hover:bg-neutral-200",
                      !hasInput && !isSubmitting && "opacity-0 pointer-events-none"
                    ),
                    children: isSubmitting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Square, { className: "h-3 w-3 fill-current" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ArrowUp, { className: "h-4 w-4" })
                  }
                )
              ] }) : null
            ]
          }
        ),
        chat.statusAddonMode !== "idle" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex w-full flex-col border-t border-neutral-200/30 bg-neutral-100/30 px-3 py-2 backdrop-blur-xl dark:border-neutral-800/30 dark:bg-neutral-900/30 animate-in fade-in slide-in-from-top-1 duration-150 ease-out", children: chat.statusAddonMode === "progress" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between gap-3 text-xs font-medium", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2 shrink-0", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CursorIcon, { className: "h-3.5 w-3.5 animate-pulse-subtle" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "bg-gradient-to-r from-neutral-600 via-neutral-600/40 to-neutral-600 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer dark:from-neutral-400 dark:via-neutral-400/40 dark:to-neutral-400 opacity-60", children: computedStatusLabel })
          ] }),
          chat.statusContext && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "min-w-0 flex-1 truncate text-right text-neutral-400 dark:text-neutral-500", children: chat.useTypewriter ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typewriter, { text: chat.statusContext }) : chat.statusContext })
        ] }) : chat.statusAddonMode === "summary" && chat.summary ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between text-xs font-medium", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2 text-neutral-600 dark:text-neutral-400", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CursorIcon, { className: "h-3.5 w-3.5" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Changes applied" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              onClick: handleUndo,
              className: "flex items-center gap-1 text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-200",
              children: [
                "Undo ",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Command, { className: "h-3 w-3 ml-0.5" }),
                " Z"
              ]
            }
          ) })
        ] }) : null }),
        chat.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "border-t border-red-200/50 bg-red-50/50 px-3 py-2 text-xs font-medium text-red-600 backdrop-blur-xl dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200", children: chat.error }) : null
      ]
    }
  );
}
function FlowOverlayProvider(props = {}) {
  var _a3;
  const clipboardOptions = (0, import_react.useMemo)(
    () => {
      var _a4;
      return (_a4 = props.clipboardOptions) != null ? _a4 : {};
    },
    [props.clipboardOptions]
  );
  const config = (0, import_react.useMemo)(() => {
    var _a4;
    const models = props.models && props.models.length > 0 ? props.models : DEFAULT_CONFIG.models;
    const statusSequence = props.statusSequence && props.statusSequence.length > 0 ? props.statusSequence : DEFAULT_CONFIG.statusSequence;
    const endpoint = (_a4 = props.endpoint) != null ? _a4 : DEFAULT_CONFIG.endpoint;
    return {
      endpoint,
      models,
      statusSequence
    };
  }, [props.endpoint, props.models, props.statusSequence]);
  const [chat, setChat] = (0, import_react.useState)(null);
  const abortControllerRef = (0, import_react.useRef)(null);
  const fallbackStatusLabel = (_a3 = config.statusSequence[0]) != null ? _a3 : null;
  (0, import_react.useEffect)(() => {
    if (props.enableClipboardInterceptor === false) {
      return;
    }
    let cleanup;
    loadReactGrabRuntime({
      url: clipboardOptions.reactGrabUrl
    }).then(() => {
      var _a4, _b2;
      cleanup = registerClipboardInterceptor({
        projectRoot: clipboardOptions.projectRoot,
        highlightColor: clipboardOptions.highlightColor,
        highlightStyleId: clipboardOptions.highlightStyleId,
        logClipboardEndpoint: (_b2 = (_a4 = clipboardOptions.logClipboardEndpoint) != null ? _a4 : process.env.SHIPFLOW_OVERLAY_LOG_ENDPOINT) != null ? _b2 : null,
        reactGrabUrl: clipboardOptions.reactGrabUrl
      });
    }).catch((error) => {
      console.error("[shipflow-overlay] Failed to load React Grab runtime", error);
    });
    return () => {
      cleanup == null ? void 0 : cleanup();
    };
  }, [
    clipboardOptions.highlightColor,
    clipboardOptions.highlightStyleId,
    clipboardOptions.logClipboardEndpoint,
    clipboardOptions.projectRoot,
    clipboardOptions.reactGrabUrl,
    props.enableClipboardInterceptor
  ]);
  const close = (0, import_react.useCallback)(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setChat(null);
    window.dispatchEvent(new Event(EVENT_CLOSE2));
  }, []);
  const buildInitialState = (0, import_react.useCallback)(
    () => createInitialState(config.models, config.statusSequence),
    [config.models, config.statusSequence]
  );
  useSelectionEvents(
    (0, import_react.useCallback)(
      (payload) => {
        setChat({
          ...buildInitialState(),
          ...payload
        });
      },
      [buildInitialState]
    ),
    close,
    Boolean(chat)
  );
  useRecalculateRect(chat, setChat);
  useEscapeToClose(Boolean(chat), close);
  useAutoFocus(Boolean(chat));
  const sendToBackend = (0, import_react.useCallback)(
    async (payload) => {
      var _a4, _b2;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const promotePhase = (phase) => {
        const safePhase = Math.min(Math.max(phase, 0), config.statusSequence.length - 1);
        setChat((prev) => {
          var _a5;
          if (!prev) return prev;
          if (prev.statusPhase === safePhase && prev.statusLabel) {
            return prev;
          }
          return {
            ...prev,
            statusPhase: safePhase,
            statusLabel: (_a5 = config.statusSequence[safePhase]) != null ? _a5 : fallbackStatusLabel
          };
        });
      };
      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error((_a4 = data == null ? void 0 : data.error) != null ? _a4 : `Request failed with status ${response.status}`);
        }
        const reader = (_b2 = response.body) == null ? void 0 : _b2.getReader();
        if (!reader) {
          throw new Error("Streaming response is not supported in this environment.");
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantSummary = "";
        let hasPromotedPlanning = false;
        let hasPromotedUpdating = false;
        const processEvent = (event) => {
          var _a5, _b3, _c;
          if (event.event === "status") {
            const message = (_a5 = event.message) == null ? void 0 : _a5.trim();
            if (message) {
              if (!hasPromotedPlanning && /plan|analy/i.test(message)) {
                promotePhase(1);
                hasPromotedPlanning = true;
              }
              if (!hasPromotedUpdating && /apply|build|final|update/i.test(message)) {
                promotePhase(2);
                hasPromotedUpdating = true;
              }
              setChat(
                (prev) => prev ? {
                  ...prev,
                  statusContext: message,
                  useTypewriter: true
                } : prev
              );
            }
            if (!hasPromotedPlanning) {
              promotePhase(0);
            }
            return;
          }
          if (event.event === "assistant") {
            const chunk = (_b3 = event.text) == null ? void 0 : _b3.trim();
            if (chunk) {
              assistantSummary += chunk.endsWith("\n") ? chunk : `${chunk} `;
              if (!hasPromotedPlanning) {
                promotePhase(1);
                hasPromotedPlanning = true;
              }
              setChat(
                (prev) => prev ? {
                  ...prev,
                  statusContext: chunk,
                  useTypewriter: false
                } : prev
              );
            }
            return;
          }
          if (event.event === "done") {
            if (event.success) {
              promotePhase(2);
              hasPromotedUpdating = true;
              const summary = ((_c = event.summary) == null ? void 0 : _c.trim()) || assistantSummary.trim() || "Changes applied.";
              setChat(
                (prev) => prev ? {
                  ...prev,
                  status: "success",
                  instruction: "",
                  statusAddonMode: "summary",
                  summary,
                  statusLabel: null,
                  statusContext: null,
                  statusPhase: Math.max(config.statusSequence.length - 1, 0),
                  serverMessage: event.stderr ? event.stderr.trim() : prev.serverMessage
                } : prev
              );
            } else {
              setChat(
                (prev) => {
                  var _a6;
                  return prev ? {
                    ...prev,
                    status: "error",
                    error: (_a6 = event.error) != null ? _a6 : "Cursor CLI reported an error.",
                    statusAddonMode: "idle",
                    statusLabel: null,
                    statusContext: null,
                    summary: void 0,
                    statusPhase: 0,
                    serverMessage: event.stderr ? event.stderr.trim() : prev.serverMessage
                  } : prev;
                }
              );
            }
          }
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (line) {
              try {
                processEvent(JSON.parse(line));
              } catch (error) {
                console.warn("[shipflow-overlay] Unable to parse stream line", { line, error });
              }
            }
            newlineIndex = buffer.indexOf("\n");
          }
        }
        buffer += decoder.decode();
        const finalLine = buffer.trim();
        if (finalLine) {
          try {
            processEvent(JSON.parse(finalLine));
          } catch (error) {
            console.warn("[shipflow-overlay] Unable to parse final stream line", { finalLine, error });
          }
        }
      } catch (error) {
        if (controller.signal.aborted) {
          setChat(
            (prev) => prev ? {
              ...prev,
              status: "idle",
              statusAddonMode: "idle",
              statusLabel: null,
              statusContext: null,
              summary: void 0,
              error: void 0,
              serverMessage: void 0,
              statusPhase: 0
            } : prev
          );
          return;
        }
        console.error("[shipflow-overlay] Failed to communicate with Cursor CLI backend", error);
        setChat(
          (prev) => prev ? {
            ...prev,
            status: "error",
            error: error instanceof Error ? error.message : "Unable to send request.",
            statusAddonMode: "idle",
            statusLabel: null,
            statusContext: null,
            summary: void 0
          } : prev
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [config.endpoint, config.models, config.statusSequence, fallbackStatusLabel]
  );
  const onInstructionChange = (0, import_react.useCallback)((value) => {
    setChat((current) => {
      if (!current) {
        return current;
      }
      const next = {
        ...current,
        instruction: value
      };
      if (current.status !== "submitting") {
        next.status = "idle";
      }
      if (value.length > 0 && current.statusAddonMode !== "idle") {
        next.statusAddonMode = "idle";
        next.statusLabel = null;
        next.statusContext = null;
        next.summary = void 0;
        next.statusPhase = 0;
      }
      if (current.status === "error") {
        next.error = void 0;
      }
      return next;
    });
  }, []);
  const onSubmit = (0, import_react.useCallback)(() => {
    let payload = null;
    setChat((current) => {
      var _a4, _b2;
      if (!current) return current;
      if (current.status === "submitting") return current;
      const trimmed = current.instruction.trim();
      if (!trimmed) {
        return {
          ...current,
          error: "Please describe the change.",
          status: "error",
          statusAddonMode: "idle",
          statusLabel: null,
          statusContext: null,
          summary: void 0,
          statusPhase: 0,
          serverMessage: void 0
        };
      }
      payload = {
        filePath: current.filePath,
        htmlFrame: current.htmlFrame,
        stackTrace: current.codeLocation,
        instruction: trimmed,
        model: current.model || ((_a4 = config.models[0]) == null ? void 0 : _a4.value) || ""
      };
      return {
        ...current,
        instruction: trimmed,
        status: "submitting",
        error: void 0,
        serverMessage: void 0,
        statusAddonMode: "progress",
        statusLabel: (_b2 = config.statusSequence[0]) != null ? _b2 : fallbackStatusLabel,
        statusContext: "Preparing Cursor CLI request\u2026",
        summary: void 0,
        statusPhase: 0
      };
    });
    if (payload) {
      void sendToBackend(payload);
    }
  }, [config.models, config.statusSequence, fallbackStatusLabel, sendToBackend]);
  const stop = (0, import_react.useCallback)(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  const onModelChange = (0, import_react.useCallback)(
    (value) => {
      setChat((current) => {
        var _a4, _b2;
        if (!current || current.status === "submitting") {
          return current;
        }
        const nextValue = config.models.some((option) => option.value === value) ? value : (_b2 = (_a4 = config.models[0]) == null ? void 0 : _a4.value) != null ? _b2 : "";
        return { ...current, model: nextValue };
      });
    },
    [config.models]
  );
  const bubble = chat ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Bubble,
    {
      chat,
      onInstructionChange,
      onSubmit,
      onStop: stop,
      onModelChange,
      onClose: close,
      modelOptions: config.models,
      statusSequence: config.statusSequence
    }
  ) : null;
  if (!bubble) return null;
  return (0, import_react_dom.createPortal)(bubble, document.body);
}

// src/server/createNextHandler.ts
var import_path2 = __toESM(require("path"), 1);
var import_server = require("next/server");

// src/server/cursorAgent.ts
var import_child_process = require("child_process");
var import_promises = require("fs/promises");
var import_fs = require("fs");
var import_path = __toESM(require("path"), 1);
var LOG_PREFIX = "[shipflow-overlay]";
var _a;
var CURSOR_BINARY_HINT = (_a = process.env.CURSOR_AGENT_BIN) != null ? _a : "cursor-agent";
var _a2, _b;
var HOME_DIR = (_b = (_a2 = process.env.HOME) != null ? _a2 : process.env.USERPROFILE) != null ? _b : "";
var cachedBinary = null;
var cachedEnv = null;
var resolvePromise = null;
var IGNORED_STATUS_MESSAGES = /* @__PURE__ */ new Set(["User event"]);
var WHITELISTED_STATUS_MESSAGES = /* @__PURE__ */ new Set([
  "Initializing agent",
  "Agent ready.",
  "Thinking",
  "Building changes",
  "Analyzing project",
  "Build step complete."
]);
var MIN_STATUS_LENGTH = 30;
var STATUS_KEYS = ["text", "value", "delta", "message", "summary", "label"];
var STREAM_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform"
};
var pathExistsAndExecutable = async (filePath) => {
  if (!filePath) return false;
  try {
    await (0, import_promises.access)(filePath, import_fs.constants.X_OK);
    return true;
  } catch {
    try {
      await (0, import_promises.access)(filePath, import_fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
};
var describeEvent = (event) => {
  if (!event || typeof event !== "object") {
    return null;
  }
  const payload = event;
  const type = typeof payload.type === "string" ? payload.type : null;
  const subtype = typeof payload.subtype === "string" ? payload.subtype : null;
  if (type === "system") {
    if (subtype === "init") {
      return "Initializing agent";
    }
    if (subtype === "progress" && typeof payload.message === "string") {
      return payload.message;
    }
    if (subtype === "completed") {
      return "Agent ready.";
    }
    return subtype ? `System update: ${subtype}` : "System update.";
  }
  if (type === "assistant") {
    return "Thinking\u2026";
  }
  if (type === "tool_call") {
    const toolName = typeof payload.tool === "object" && payload.tool && typeof payload.tool.name === "string" ? String(payload.tool.name) : "Tool";
    const normalizedName = toolName.toLowerCase();
    if (subtype === "started") {
      if (normalizedName.includes("apply") || normalizedName.includes("write") || normalizedName.includes("patch") || normalizedName.includes("build")) {
        return "Building changes\u2026";
      }
      if (normalizedName.includes("plan") || normalizedName.includes("analy")) {
        return "Analyzing project\u2026";
      }
      return `Running ${toolName}\u2026`;
    }
    if (subtype === "completed") {
      if (normalizedName.includes("apply") || normalizedName.includes("write") || normalizedName.includes("patch") || normalizedName.includes("build")) {
        return "Build step complete.";
      }
      return `${toolName} finished.`;
    }
    return `${toolName} ${subtype != null ? subtype : "update"}\u2026`;
  }
  if (type === "result") {
    return "Finalizing changes\u2026";
  }
  if (type === "error") {
    if (typeof payload.message === "string") {
      return `Error: ${payload.message}`;
    }
    return "Cursor CLI reported an error.";
  }
  if (typeof payload.message === "string") {
    return payload.message;
  }
  return type ? `Event: ${type}${subtype ? `/${subtype}` : ""}` : null;
};
var extractAssistantText = (input, seen = /* @__PURE__ */ new WeakSet()) => {
  if (!input) return "";
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((entry) => extractAssistantText(entry, seen)).join("");
  }
  if (typeof input === "object") {
    if (seen.has(input)) return "";
    seen.add(input);
    const record = input;
    let text = "";
    for (const key of STATUS_KEYS) {
      const value = record[key];
      if (typeof value === "string") {
        text += value;
      } else if (value) {
        text += extractAssistantText(value, seen);
      }
    }
    if ("content" in record) {
      text += extractAssistantText(record.content, seen);
    }
    if ("parts" in record) {
      text += extractAssistantText(record.parts, seen);
    }
    if ("text_delta" in record) {
      text += extractAssistantText(record.text_delta, seen);
    }
    return text;
  }
  return "";
};
var buildCandidateDirs = (binaryPath, additionalSearchDirs) => {
  var _a3;
  const candidateDirs = new Set(
    ((_a3 = process.env.PATH) != null ? _a3 : "").split(import_path.default.delimiter).map((entry) => entry.trim()).filter(Boolean)
  );
  for (const dir of additionalSearchDirs) {
    if (dir) {
      candidateDirs.add(dir);
    }
  }
  if (HOME_DIR) {
    candidateDirs.add(import_path.default.join(HOME_DIR, ".cursor", "bin"));
    candidateDirs.add(import_path.default.join(HOME_DIR, "Library", "Application Support", "Cursor", "bin"));
    candidateDirs.add(import_path.default.join(HOME_DIR, "AppData", "Local", "Programs", "cursor", "bin"));
  }
  if (binaryPath && import_path.default.isAbsolute(binaryPath)) {
    candidateDirs.add(import_path.default.dirname(binaryPath));
  }
  return Array.from(candidateDirs);
};
async function discoverCursorAgentBinary(options) {
  var _a3, _b2;
  const additionalSearchDirs = (_a3 = options.additionalSearchDirs) != null ? _a3 : [];
  const logPrefix = (_b2 = options.logPrefix) != null ? _b2 : LOG_PREFIX;
  const candidateNames = /* @__PURE__ */ new Set();
  if (options.binaryPath) {
    candidateNames.add(options.binaryPath);
  }
  if (CURSOR_BINARY_HINT) {
    candidateNames.add(CURSOR_BINARY_HINT);
  }
  candidateNames.add("cursor-agent");
  if (process.platform === "win32") {
    candidateNames.add("cursor-agent.exe");
  }
  for (const name of candidateNames) {
    if (!name) continue;
    if (import_path.default.isAbsolute(name)) {
      if (await pathExistsAndExecutable(name)) {
        return {
          binary: name,
          env: null
        };
      }
      continue;
    }
    const whichCommand = process.platform === "win32" ? "where" : "which";
    const lookup = (0, import_child_process.spawnSync)(whichCommand, [name], { encoding: "utf8" });
    if (!lookup.error && lookup.status === 0 && lookup.stdout) {
      const resolvedPath = lookup.stdout.split(/\r?\n/).find(Boolean);
      if (resolvedPath && await pathExistsAndExecutable(resolvedPath)) {
        return {
          binary: resolvedPath,
          env: null
        };
      }
    }
    for (const dir of buildCandidateDirs(name, additionalSearchDirs)) {
      const fullPath = import_path.default.join(dir, name);
      if (await pathExistsAndExecutable(fullPath)) {
        return {
          binary: fullPath,
          env: null
        };
      }
    }
  }
  console.error(
    `${logPrefix} cursor-agent binary not found. Set CURSOR_AGENT_BIN to an absolute path or add cursor-agent to your PATH.`
  );
  throw new Error(
    "cursor-agent binary not found. Set CURSOR_AGENT_BIN to an absolute path or add cursor-agent to your PATH."
  );
}
async function resolveCursorAgentBinary(options = {}) {
  if (options.binaryPath) {
    const normalized = options.binaryPath.trim();
    if (normalized && await pathExistsAndExecutable(normalized)) {
      return {
        binary: normalized,
        env: null
      };
    }
  }
  if (cachedBinary) {
    return {
      binary: cachedBinary,
      env: cachedEnv
    };
  }
  if (!resolvePromise) {
    resolvePromise = discoverCursorAgentBinary(options).then((resolved) => {
      var _a3, _b2;
      cachedBinary = resolved.binary;
      const extraDirs = [
        ...(_a3 = options.additionalSearchDirs) != null ? _a3 : [],
        import_path.default.dirname(resolved.binary)
      ];
      if (HOME_DIR) {
        extraDirs.push(import_path.default.join(HOME_DIR, ".cursor", "bin"));
        extraDirs.push(import_path.default.join(HOME_DIR, "Library", "Application Support", "Cursor", "bin"));
        extraDirs.push(import_path.default.join(HOME_DIR, "AppData", "Local", "Programs", "cursor", "bin"));
      }
      const existingPath = (_b2 = process.env.PATH) != null ? _b2 : "";
      const pathSegments = new Set(
        existingPath.split(import_path.default.delimiter).map((segment) => segment.trim()).filter(Boolean)
      );
      for (const dir of extraDirs) {
        if (dir) {
          pathSegments.add(dir);
        }
      }
      cachedEnv = {
        ...process.env,
        PATH: Array.from(pathSegments).join(import_path.default.delimiter)
      };
      return {
        binary: resolved.binary,
        env: cachedEnv
      };
    }).catch((error) => {
      resolvePromise = null;
      throw error;
    });
  }
  return resolvePromise;
}
async function runCursorAgentStream(options, send) {
  var _a3;
  const logPrefix = (_a3 = options.logPrefix) != null ? _a3 : LOG_PREFIX;
  await new Promise((resolve) => {
    var _a4, _b2;
    try {
      const args = [
        "--print",
        "--force",
        "--output-format",
        "stream-json",
        "--stream-partial-output",
        "--model",
        options.model,
        options.prompt
      ];
      console.log(`${logPrefix} Spawning cursor-agent`, {
        command: options.binary,
        args,
        cwd: process.cwd()
      });
      const child = (0, import_child_process.spawn)(options.binary, args, {
        cwd: process.cwd(),
        env: (_a4 = options.env) != null ? _a4 : process.env,
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdoutBuffer = "";
      let stderrAggregate = "";
      let assistantSummary = "";
      let settled = false;
      const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : Number((_b2 = process.env.SHIPFLOW_OVERLAY_AGENT_TIMEOUT_MS) != null ? _b2 : 4 * 60 * 1e3);
      const sendStatus = (message) => {
        if (!message) return;
        send({ event: "status", message });
      };
      const appendAssistant = (text) => {
        if (!text) return;
        assistantSummary += text;
        send({ event: "assistant", text });
      };
      const flushDone = (success, exitCode, error) => {
        send({
          event: "done",
          success,
          summary: assistantSummary.trim(),
          exitCode,
          error,
          stderr: stderrAggregate.trim() || void 0
        });
      };
      const processLine = (line) => {
        if (!line.trim()) {
          return;
        }
        try {
          const parsed = JSON.parse(line);
          const status = describeEvent(parsed);
          if (status) {
            const trimmed = status.trim();
            const isWhitelisted = WHITELISTED_STATUS_MESSAGES.has(trimmed);
            const isIgnored = IGNORED_STATUS_MESSAGES.has(trimmed);
            const isLongEnough = trimmed.length >= MIN_STATUS_LENGTH;
            if (!isIgnored && (isWhitelisted || isLongEnough)) {
              sendStatus(trimmed);
            }
          }
          if (typeof parsed.type === "string" && parsed.type === "assistant") {
            const text = extractAssistantText(parsed);
            appendAssistant(text);
          }
          if (typeof parsed.type === "string" && parsed.type === "result") {
            const text = extractAssistantText(parsed);
            appendAssistant(text);
          }
        } catch (error) {
          console.warn(`${logPrefix} Failed to parse cursor-agent stream line`, {
            line,
            error
          });
          sendStatus(line);
        }
      };
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn(`${logPrefix} cursor-agent exceeded timeout; terminating process`, {
          timeoutMs
        });
        sendStatus(`Cursor CLI timed out after ${timeoutMs}ms; terminating process.`);
        try {
          child.kill("SIGTERM");
        } catch (killError) {
          console.warn(`${logPrefix} Failed to terminate cursor-agent process`, killError);
        }
        flushDone(false, null, `Cursor CLI timed out after ${timeoutMs}ms.`);
        resolve();
      }, timeoutMs);
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdoutBuffer += text;
        let newlineIndex = stdoutBuffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = stdoutBuffer.slice(0, newlineIndex);
          stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
          processLine(line);
          newlineIndex = stdoutBuffer.indexOf("\n");
        }
      });
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderrAggregate += text;
        for (const line of text.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
          sendStatus(`[stderr] ${line}`);
        }
        console.error(`${logPrefix} cursor-agent stderr:`, text);
      });
      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        console.error(`${logPrefix} cursor-agent failed to start`, error);
        flushDone(false, null, error instanceof Error ? error.message : "Failed to start Cursor CLI.");
        resolve();
      });
      child.on("close", (exitCode) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (stdoutBuffer.trim()) {
          processLine(stdoutBuffer);
          stdoutBuffer = "";
        }
        console.log(`${logPrefix} cursor-agent exited`, { exitCode });
        if (exitCode === 0) {
          flushDone(true, exitCode != null ? exitCode : 0);
        } else {
          const error = stderrAggregate.trim() || `Cursor CLI exited with status ${exitCode != null ? exitCode : "unknown"}. Check server logs for details.`;
          flushDone(false, exitCode != null ? exitCode : null, error);
        }
        resolve();
      });
    } catch (error) {
      console.error(`${logPrefix} Unexpected error launching cursor-agent`, error);
      send({
        event: "done",
        success: false,
        summary: "",
        exitCode: null,
        error: error instanceof Error ? error.message : "Unexpected error launching Cursor CLI."
      });
      resolve();
    }
  });
}

// src/server/createNextHandler.ts
var DEFAULT_MODEL = "composer-1";
var STACK_TRACE_PATH_PATTERN = /([^\s()]+?\.(?:[jt]sx?|mdx?))/gi;
var normalizeFilePath = (filePath) => {
  if (!filePath) return null;
  const trimmed = filePath.trim();
  if (!trimmed) return null;
  const webpackPrefix = "webpack-internal:///";
  const filePrefix = "file://";
  let sanitized = trimmed;
  if (sanitized.startsWith(webpackPrefix)) {
    sanitized = sanitized.slice(webpackPrefix.length);
  }
  if (sanitized.startsWith(filePrefix)) {
    sanitized = sanitized.slice(filePrefix.length);
  }
  if (sanitized.startsWith("./")) {
    sanitized = sanitized.slice(2);
  }
  if (!sanitized) {
    return null;
  }
  const cwd = process.cwd();
  if (pathIsAbsoluteSafe(sanitized)) {
    const relative = relativeSafe(cwd, sanitized);
    return relative.startsWith("..") ? sanitized : relative;
  }
  return sanitized;
};
var pathIsAbsoluteSafe = (target) => {
  try {
    return import_path2.default.isAbsolute(target);
  } catch {
    return false;
  }
};
var relativeSafe = (from, to) => {
  try {
    return import_path2.default.relative(from, to);
  } catch {
    return to;
  }
};
var extractFilePathFromStackTrace = (stackTrace) => {
  if (!stackTrace) return null;
  STACK_TRACE_PATH_PATTERN.lastIndex = 0;
  let match;
  while (match = STACK_TRACE_PATH_PATTERN.exec(stackTrace)) {
    const rawCandidate = match[1];
    if (typeof rawCandidate !== "string") {
      continue;
    }
    let candidate = rawCandidate.trim();
    if (!candidate) {
      continue;
    }
    if (candidate.includes("node_modules/") || candidate.includes("node_modules\\")) {
      continue;
    }
    if (candidate.startsWith("webpack-internal:///")) {
      candidate = candidate.slice("webpack-internal:///".length);
    }
    if (candidate.startsWith("./")) {
      candidate = candidate.slice(2);
    }
    if (!candidate) {
      continue;
    }
    return candidate;
  }
  return null;
};
var buildPrompt = (filePath, htmlFrame, stackTrace, instruction) => {
  const lines = [];
  lines.push(`Open ${filePath}.`);
  lines.push("Target the element matching this HTML:");
  lines.push(htmlFrame != null ? htmlFrame : "(no HTML frame provided)");
  lines.push("");
  lines.push("and the component stack:");
  lines.push(stackTrace != null ? stackTrace : "(no component stack provided)");
  lines.push("");
  lines.push(`User request: ${instruction}`);
  return lines.join("\n");
};
var stripNullish = (record) => Object.fromEntries(
  Object.entries(record).filter(([, value]) => value !== void 0 && value !== null)
);
var isEnabled = (options) => {
  if (options.allowInProduction) {
    return true;
  }
  const envFlag = process.env.SHIPFLOW_OVERLAY_ENABLED;
  if (envFlag && ["true", "1", "on", "yes"].includes(envFlag.toLowerCase())) {
    return true;
  }
  return process.env.NODE_ENV === "development";
};
function createNextHandler(options = {}) {
  var _a3;
  const logPrefix = (_a3 = options.logPrefix) != null ? _a3 : "[shipflow-overlay]";
  return async function handler(request) {
    var _a4, _b2;
    if (!isEnabled(options)) {
      return import_server.NextResponse.json(
        { error: "Shipflow overlay workflow is only available in development." },
        { status: 403 }
      );
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      return import_server.NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    const instruction = (_a4 = payload.instruction) == null ? void 0 : _a4.trim();
    if (!instruction) {
      return import_server.NextResponse.json({ error: "Instruction is required." }, { status: 400 });
    }
    const directFilePath = normalizeFilePath(payload.filePath);
    const derivedFilePath = directFilePath != null ? directFilePath : payload.filePath ? null : normalizeFilePath(extractFilePathFromStackTrace(payload.stackTrace));
    const normalizedFilePath = derivedFilePath;
    if (!normalizedFilePath) {
      return import_server.NextResponse.json(
        { error: "Unable to determine target file path from stack trace." },
        { status: 400 }
      );
    }
    const prompt = buildPrompt(normalizedFilePath, payload.htmlFrame, payload.stackTrace, instruction);
    const model = ((_b2 = payload.model) == null ? void 0 : _b2.trim()) || options.defaultModel || DEFAULT_MODEL;
    try {
      const resolved = await resolveCursorAgentBinary(
        stripNullish({
          binaryPath: options.cursorAgentBinary,
          additionalSearchDirs: options.additionalSearchDirs,
          logPrefix
        })
      );
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const state = { isClosed: false };
          const send = (event) => {
            if (state.isClosed) {
              return;
            }
            try {
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}
`));
            } catch (error) {
              if (error instanceof TypeError && (error.message.includes("closed") || error.message.includes("Invalid state"))) {
                state.isClosed = true;
              }
            }
          };
          request.signal.addEventListener("abort", () => {
            state.isClosed = true;
            try {
              controller.close();
            } catch {
            }
          });
          send({ event: "status", message: "Understanding user intent" });
          try {
            await runCursorAgentStream(
              {
                binary: resolved.binary,
                model,
                prompt,
                timeoutMs: options.timeoutMs,
                logPrefix,
                env: resolved.env
              },
              send
            );
          } catch (error) {
            if (state.isClosed) {
              return;
            }
            console.error(`${logPrefix} Failed during Cursor CLI streaming`, error);
            send({
              event: "done",
              success: false,
              summary: "",
              exitCode: null,
              error: error instanceof Error ? error.message : "Unexpected error streaming from Cursor CLI."
            });
          } finally {
            if (!state.isClosed) {
              try {
                controller.close();
              } catch {
              }
              state.isClosed = true;
            }
          }
        }
      });
      return new import_server.NextResponse(stream, {
        headers: STREAM_HEADERS
      });
    } catch (error) {
      console.error(`${logPrefix} Failed to run cursor-agent`, error);
      return import_server.NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to invoke Cursor CLI. Ensure cursor-agent is installed and available on PATH."
        },
        { status: 500 }
      );
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_MODEL_OPTIONS,
  DEFAULT_STATUS_SEQUENCE,
  FlowOverlayProvider,
  Typewriter,
  createNextHandler,
  loadReactGrabRuntime,
  registerClipboardInterceptor
});
//# sourceMappingURL=index.cjs.map