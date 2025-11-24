import {
  createNextHandler
} from "./chunk-CWEC2JE4.js";
import {
  loadReactGrabRuntime,
  registerClipboardInterceptor
} from "./chunk-RQXM4WWG.js";

// src/runtime/FlowOverlay.tsx
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { ArrowUp, Square, Command } from "lucide-react";

// src/runtime/cn.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
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

// src/runtime/FlowOverlay.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var HIGHLIGHT_QUERY = "[data-react-grab-chat-highlighted='true']";
var EVENT_OPEN = "react-grab-chat:open";
var EVENT_CLOSE = "react-grab-chat:close";
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
  var _a, _b, _c;
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
    model: (_b = (_a = models[0]) == null ? void 0 : _a.value) != null ? _b : "",
    statusPhase: 0,
    statusAddonMode: "idle",
    statusLabel: (_c = statusSequence[0]) != null ? _c : null,
    statusContext: null,
    useTypewriter: true,
    summary: void 0
  };
};
function CursorIcon({ className }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      viewBox: "0 0 466.73 533.32",
      className,
      xmlns: "http://www.w3.org/2000/svg",
      shapeRendering: "geometricPrecision",
      children: [
        /* @__PURE__ */ jsx("path", { fill: "#72716d", d: "M233.37,266.66l231.16,133.46c-1.42,2.46-3.48,4.56-6.03,6.03l-216.06,124.74c-5.61,3.24-12.53,3.24-18.14,0L8.24,406.15c-2.55-1.47-4.61-3.57-6.03-6.03l231.16-133.46h0Z" }),
        /* @__PURE__ */ jsx("path", { fill: "#55544f", d: "M233.37,0v266.66L2.21,400.12c-1.42-2.46-2.21-5.3-2.21-8.24v-250.44c0-5.89,3.14-11.32,8.24-14.27L224.29,2.43c2.81-1.62,5.94-2.43,9.07-2.43h.01Z" }),
        /* @__PURE__ */ jsx("path", { fill: "#43413c", d: "M464.52,133.2c-1.42-2.46-3.48-4.56-6.03-6.03L242.43,2.43c-2.8-1.62-5.93-2.43-9.06-2.43v266.66l231.16,133.46c1.42-2.46,2.21-5.3,2.21-8.24v-250.44c0-2.95-.78-5.77-2.21-8.24h-.01Z" }),
        /* @__PURE__ */ jsx("path", { fill: "#d6d5d2", d: "M448.35,142.54c1.31,2.26,1.49,5.16,0,7.74l-209.83,363.42c-1.41,2.46-5.16,1.45-5.16-1.38v-239.48c0-1.91-.51-3.75-1.44-5.36l216.42-124.95h.01Z" }),
        /* @__PURE__ */ jsx("path", { fill: "#fff", d: "M448.35,142.54l-216.42,124.95c-.92-1.6-2.26-2.96-3.92-3.92L20.62,143.83c-2.46-1.41-1.45-5.16,1.38-5.16h419.65c2.98,0,5.4,1.61,6.7,3.87Z" })
      ]
    }
  );
}
function useSelectionEvents(onOpen, onClose, isOpen) {
  useEffect(() => {
    const handler = (event) => {
      const custom = event;
      if (!custom.detail) return;
      if (isOpen) {
        onClose();
      }
      onOpen(custom.detail);
    };
    window.addEventListener(EVENT_OPEN, handler);
    return () => window.removeEventListener(EVENT_OPEN, handler);
  }, [onOpen, onClose, isOpen]);
}
function useRecalculateRect(chat, setChat) {
  useEffect(() => {
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
  useEffect(() => {
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
  useEffect(() => {
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
  useEffect(() => {
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
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
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
  return /* @__PURE__ */ jsx(Fragment, { children: displayed });
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
  var _a, _b, _c;
  const anchor = chat.boundingRect;
  const bubbleRef = useRef(null);
  const [bubbleSize, setBubbleSize] = useState(null);
  const [bubbleStyle, setBubbleStyle] = useState(DEFAULT_BUBBLE_STYLE);
  const textareaRef = useRef(null);
  useClickOutside(bubbleRef, true, onClose);
  useLayoutEffect(() => {
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
  useLayoutEffect(() => {
    var _a2;
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
        const bestCandidate = (_a2 = orderedCandidates.find((candidate) => candidate.fits)) != null ? _a2 : orderedCandidates.length > 0 ? orderedCandidates.reduce(
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
  const computedStatusLabel = (_c = (_b = (_a = chat.statusLabel) != null ? _a : statusSequence[chat.statusPhase]) != null ? _b : statusSequence[0]) != null ? _c : null;
  const handleUndo = useCallback(() => {
    var _a2;
    if (chat.statusAddonMode !== "summary") {
      return;
    }
    window.dispatchEvent(
      new CustomEvent(EVENT_UNDO, {
        detail: {
          instruction: chat.instruction,
          summary: (_a2 = chat.summary) != null ? _a2 : null,
          filePath: chat.filePath
        }
      })
    );
  }, [chat]);
  useEffect(() => {
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
  const handleKeyDown = useCallback(
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
  const handleChange = useCallback(
    (event) => {
      onInstructionChange(event.target.value);
    },
    [onInstructionChange]
  );
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: cn(
              "flex w-full flex-col p-3",
              showExpandedLayout ? "gap-2" : "gap-0"
            ),
            children: [
              /* @__PURE__ */ jsxs("div", { className: "relative flex w-full items-center gap-3", children: [
                /* @__PURE__ */ jsx(
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
                !showExpandedLayout ? /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: onSubmit,
                    disabled: !hasInput || isSubmitting,
                    className: cn(
                      "absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-300/50 text-neutral-600 transition hover:bg-neutral-300/80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-700/50 dark:text-neutral-300 dark:hover:bg-neutral-700/80"
                    ),
                    children: /* @__PURE__ */ jsx(ArrowUp, { className: "h-4 w-4" })
                  }
                ) : null
              ] }),
              showExpandedLayout ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 ease-out", children: [
                /* @__PURE__ */ jsxs("div", { className: "relative inline-flex", children: [
                  /* @__PURE__ */ jsx(
                    "select",
                    {
                      "aria-label": "Model selection",
                      className: cn(
                        "h-8 w-auto appearance-none rounded-lg bg-neutral-200/50 pl-3 pr-[26px] text-xs font-medium text-neutral-500 transition hover:bg-neutral-200/70 focus:outline-none focus:ring-2 focus:ring-neutral-300/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:focus:ring-neutral-700/50"
                      ),
                      value: chat.model,
                      onChange: (event) => onModelChange(event.target.value),
                      disabled: disableEditing,
                      children: modelOptions.map((option) => /* @__PURE__ */ jsx("option", { value: option.value, children: option.label }, option.value))
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { className: "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500", children: /* @__PURE__ */ jsx("svg", { width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M1 1l4 4 4-4", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) })
                ] }),
                /* @__PURE__ */ jsx(
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
                    children: isSubmitting ? /* @__PURE__ */ jsx(Square, { className: "h-3 w-3 fill-current" }) : /* @__PURE__ */ jsx(ArrowUp, { className: "h-4 w-4" })
                  }
                )
              ] }) : null
            ]
          }
        ),
        chat.statusAddonMode !== "idle" && /* @__PURE__ */ jsx("div", { className: "flex w-full flex-col border-t border-neutral-200/30 bg-neutral-100/30 px-3 py-2 backdrop-blur-xl dark:border-neutral-800/30 dark:bg-neutral-900/30 animate-in fade-in slide-in-from-top-1 duration-150 ease-out", children: chat.statusAddonMode === "progress" ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 text-xs font-medium", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
            /* @__PURE__ */ jsx(CursorIcon, { className: "h-3.5 w-3.5 animate-pulse-subtle" }),
            /* @__PURE__ */ jsx("span", { className: "bg-gradient-to-r from-neutral-600 via-neutral-600/40 to-neutral-600 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer dark:from-neutral-400 dark:via-neutral-400/40 dark:to-neutral-400 opacity-60", children: computedStatusLabel })
          ] }),
          chat.statusContext && /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1 truncate text-right text-neutral-400 dark:text-neutral-500", children: chat.useTypewriter ? /* @__PURE__ */ jsx(Typewriter, { text: chat.statusContext }) : chat.statusContext })
        ] }) : chat.statusAddonMode === "summary" && chat.summary ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs font-medium", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-neutral-600 dark:text-neutral-400", children: [
            /* @__PURE__ */ jsx(CursorIcon, { className: "h-3.5 w-3.5" }),
            /* @__PURE__ */ jsx("span", { children: "Changes applied" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: handleUndo,
              className: "flex items-center gap-1 text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-200",
              children: [
                "Undo ",
                /* @__PURE__ */ jsx(Command, { className: "h-3 w-3 ml-0.5" }),
                " Z"
              ]
            }
          ) })
        ] }) : null }),
        chat.error ? /* @__PURE__ */ jsx("div", { className: "border-t border-red-200/50 bg-red-50/50 px-3 py-2 text-xs font-medium text-red-600 backdrop-blur-xl dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200", children: chat.error }) : null
      ]
    }
  );
}
function FlowOverlayProvider(props = {}) {
  var _a;
  const clipboardOptions = useMemo(
    () => {
      var _a2;
      return (_a2 = props.clipboardOptions) != null ? _a2 : {};
    },
    [props.clipboardOptions]
  );
  const config = useMemo(() => {
    var _a2;
    const models = props.models && props.models.length > 0 ? props.models : DEFAULT_CONFIG.models;
    const statusSequence = props.statusSequence && props.statusSequence.length > 0 ? props.statusSequence : DEFAULT_CONFIG.statusSequence;
    const endpoint = (_a2 = props.endpoint) != null ? _a2 : DEFAULT_CONFIG.endpoint;
    return {
      endpoint,
      models,
      statusSequence
    };
  }, [props.endpoint, props.models, props.statusSequence]);
  const [chat, setChat] = useState(null);
  const abortControllerRef = useRef(null);
  const fallbackStatusLabel = (_a = config.statusSequence[0]) != null ? _a : null;
  useEffect(() => {
    if (props.enableClipboardInterceptor === false) {
      return;
    }
    let cleanup;
    loadReactGrabRuntime({
      url: clipboardOptions.reactGrabUrl
    }).then(() => {
      var _a2, _b;
      cleanup = registerClipboardInterceptor({
        projectRoot: clipboardOptions.projectRoot,
        highlightColor: clipboardOptions.highlightColor,
        highlightStyleId: clipboardOptions.highlightStyleId,
        logClipboardEndpoint: (_b = (_a2 = clipboardOptions.logClipboardEndpoint) != null ? _a2 : process.env.SHIPFLOW_OVERLAY_LOG_ENDPOINT) != null ? _b : null,
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
  const close = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setChat(null);
    window.dispatchEvent(new Event(EVENT_CLOSE));
  }, []);
  const buildInitialState = useCallback(
    () => createInitialState(config.models, config.statusSequence),
    [config.models, config.statusSequence]
  );
  useSelectionEvents(
    useCallback(
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
  const sendToBackend = useCallback(
    async (payload) => {
      var _a2, _b;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const promotePhase = (phase) => {
        const safePhase = Math.min(Math.max(phase, 0), config.statusSequence.length - 1);
        setChat((prev) => {
          var _a3;
          if (!prev) return prev;
          if (prev.statusPhase === safePhase && prev.statusLabel) {
            return prev;
          }
          return {
            ...prev,
            statusPhase: safePhase,
            statusLabel: (_a3 = config.statusSequence[safePhase]) != null ? _a3 : fallbackStatusLabel
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
          throw new Error((_a2 = data == null ? void 0 : data.error) != null ? _a2 : `Request failed with status ${response.status}`);
        }
        const reader = (_b = response.body) == null ? void 0 : _b.getReader();
        if (!reader) {
          throw new Error("Streaming response is not supported in this environment.");
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantSummary = "";
        let hasPromotedPlanning = false;
        let hasPromotedUpdating = false;
        const processEvent = (event) => {
          var _a3, _b2, _c;
          if (event.event === "status") {
            const message = (_a3 = event.message) == null ? void 0 : _a3.trim();
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
            const chunk = (_b2 = event.text) == null ? void 0 : _b2.trim();
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
                  var _a4;
                  return prev ? {
                    ...prev,
                    status: "error",
                    error: (_a4 = event.error) != null ? _a4 : "Cursor CLI reported an error.",
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
  const onInstructionChange = useCallback((value) => {
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
  const onSubmit = useCallback(() => {
    let payload = null;
    setChat((current) => {
      var _a2, _b;
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
        model: current.model || ((_a2 = config.models[0]) == null ? void 0 : _a2.value) || ""
      };
      return {
        ...current,
        instruction: trimmed,
        status: "submitting",
        error: void 0,
        serverMessage: void 0,
        statusAddonMode: "progress",
        statusLabel: (_b = config.statusSequence[0]) != null ? _b : fallbackStatusLabel,
        statusContext: "Preparing Cursor CLI request\u2026",
        summary: void 0,
        statusPhase: 0
      };
    });
    if (payload) {
      void sendToBackend(payload);
    }
  }, [config.models, config.statusSequence, fallbackStatusLabel, sendToBackend]);
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  const onModelChange = useCallback(
    (value) => {
      setChat((current) => {
        var _a2, _b;
        if (!current || current.status === "submitting") {
          return current;
        }
        const nextValue = config.models.some((option) => option.value === value) ? value : (_b = (_a2 = config.models[0]) == null ? void 0 : _a2.value) != null ? _b : "";
        return { ...current, model: nextValue };
      });
    },
    [config.models]
  );
  const bubble = chat ? /* @__PURE__ */ jsx(
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
  return createPortal(bubble, document.body);
}
export {
  DEFAULT_MODEL_OPTIONS,
  DEFAULT_STATUS_SEQUENCE,
  FlowOverlayProvider,
  Typewriter,
  createNextHandler,
  loadReactGrabRuntime,
  registerClipboardInterceptor
};
//# sourceMappingURL=index.js.map