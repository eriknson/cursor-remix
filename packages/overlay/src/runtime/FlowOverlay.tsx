'use client';

import {
  type CSSProperties,
  type ChangeEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ArrowUp, Square, Command } from "lucide-react";

import { cn } from "./cn";
import { DEFAULT_MODEL_OPTIONS, DEFAULT_STATUS_SEQUENCE } from "./constants";
import type {
  ModelOption,
  SelectionPayload,
  ShipflowOverlayConfig,
  StatusAddonMode,
  StatusSequence,
  StreamEvent,
} from "./types";
import { loadReactGrabRuntime } from "./loadReactGrabRuntime";
import {
  registerClipboardInterceptor,
  type ClipboardInterceptorOptions,
} from "./registerClipboardInterceptor";

const HIGHLIGHT_QUERY = "[data-react-grab-chat-highlighted='true']";
const EVENT_OPEN = "react-grab-chat:open";
const EVENT_CLOSE = "react-grab-chat:close";
const EVENT_UNDO = "react-grab-chat:undo";

const DEFAULT_CONFIG: ShipflowOverlayConfig = {
  endpoint: "/api/shipflow/overlay",
  models: DEFAULT_MODEL_OPTIONS,
  statusSequence: DEFAULT_STATUS_SEQUENCE,
};

type ChatState = SelectionPayload & {
  instruction: string;
  status: "idle" | "submitting" | "success" | "error";
  error?: string;
  serverMessage?: string;
  model: string;
  statusPhase: number;
  statusAddonMode: StatusAddonMode;
  statusLabel: string | null;
  statusContext: string | null;
  useTypewriter: boolean;
  summary?: string;
};

const DEFAULT_BUBBLE_STYLE: CSSProperties = {
  top: "20%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};

const VIEWPORT_MARGIN = 12;
const ANCHOR_GAP = 24;
const POINTER_HORIZONTAL_GAP = 16;
const POINTER_VERTICAL_OFFSET = 12;

const createInitialState = (
  models: readonly ModelOption[],
  statusSequence: StatusSequence,
): ChatState => ({
  htmlFrame: null,
  codeLocation: null,
  filePath: null,
  clipboardData: "",
  pointer: null,
  boundingRect: null,
  instruction: "",
  status: "idle",
  serverMessage: undefined,
  error: undefined,
  model: models[0]?.value ?? "",
  statusPhase: 0,
  statusAddonMode: "idle",
  statusLabel: statusSequence[0] ?? null,
  statusContext: null,
  useTypewriter: true,
  summary: undefined,
});

export type FlowOverlayProps = Partial<ShipflowOverlayConfig> & {
  enableClipboardInterceptor?: boolean;
  clipboardOptions?: ClipboardInterceptorOptions;
};

function CursorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 466.73 533.32"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
    >
      <path fill="#72716d" d="M233.37,266.66l231.16,133.46c-1.42,2.46-3.48,4.56-6.03,6.03l-216.06,124.74c-5.61,3.24-12.53,3.24-18.14,0L8.24,406.15c-2.55-1.47-4.61-3.57-6.03-6.03l231.16-133.46h0Z" />
      <path fill="#55544f" d="M233.37,0v266.66L2.21,400.12c-1.42-2.46-2.21-5.3-2.21-8.24v-250.44c0-5.89,3.14-11.32,8.24-14.27L224.29,2.43c2.81-1.62,5.94-2.43,9.07-2.43h.01Z" />
      <path fill="#43413c" d="M464.52,133.2c-1.42-2.46-3.48-4.56-6.03-6.03L242.43,2.43c-2.8-1.62-5.93-2.43-9.06-2.43v266.66l231.16,133.46c1.42-2.46,2.21-5.3,2.21-8.24v-250.44c0-2.95-.78-5.77-2.21-8.24h-.01Z" />
      <path fill="#d6d5d2" d="M448.35,142.54c1.31,2.26,1.49,5.16,0,7.74l-209.83,363.42c-1.41,2.46-5.16,1.45-5.16-1.38v-239.48c0-1.91-.51-3.75-1.44-5.36l216.42-124.95h.01Z" />
      <path fill="#fff" d="M448.35,142.54l-216.42,124.95c-.92-1.6-2.26-2.96-3.92-3.92L20.62,143.83c-2.46-1.41-1.45-5.16,1.38-5.16h419.65c2.98,0,5.4,1.61,6.7,3.87Z" />
    </svg>
  );
}

function useSelectionEvents(
  onOpen: (payload: SelectionPayload) => void,
  onClose: () => void,
  isOpen: boolean,
) {
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<SelectionPayload>;
      if (!custom.detail) return;

      if (isOpen) {
        onClose();
      }

      onOpen(custom.detail);
    };

    window.addEventListener(EVENT_OPEN, handler as EventListener);
    return () => window.removeEventListener(EVENT_OPEN, handler as EventListener);
  }, [onOpen, onClose, isOpen]);
}

function useRecalculateRect(
  chat: ChatState | null,
  setChat: React.Dispatch<React.SetStateAction<ChatState | null>>,
) {
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
        height: rect.height,
      };

      setChat((current) => {
        if (!current) {
          return current;
        }

        const prev = current.boundingRect;
        const hasChanged =
          !prev ||
          prev.top !== nextRect.top ||
          prev.left !== nextRect.left ||
          prev.width !== nextRect.width ||
          prev.height !== nextRect.height;

        if (!hasChanged) {
          return current;
        }

        return {
          ...current,
          boundingRect: nextRect,
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

function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, onClose]);
}

function useAutoFocus(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        "[data-react-grab-chat-input='true']",
      );
      textarea?.focus();
      textarea?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
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

function Typewriter({ text }: { text: string }) {
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

  return <>{displayed}</>;
}

function Bubble({
  chat,
  onInstructionChange,
  onSubmit,
  onStop,
  onModelChange,
  onClose,
  modelOptions,
  statusSequence,
}: {
  chat: ChatState;
  onInstructionChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onModelChange: (value: string) => void;
  onClose: () => void;
  modelOptions: readonly ModelOption[];
  statusSequence: StatusSequence;
}) {
  const anchor = chat.boundingRect;
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleSize, setBubbleSize] = useState<{ width: number; height: number } | null>(null);
  const [bubbleStyle, setBubbleStyle] = useState<CSSProperties>(DEFAULT_BUBBLE_STYLE);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    if (!bubbleSize) {
      setBubbleStyle((prev) => (prev === DEFAULT_BUBBLE_STYLE ? prev : DEFAULT_BUBBLE_STYLE));
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

    const clampHorizontal = (value: number) => {
      const min = VIEWPORT_MARGIN;
      const max = viewportWidth - VIEWPORT_MARGIN - bubbleSize.width;
      if (min > max) {
        return (viewportWidth - bubbleSize.width) / 2;
      }
      return Math.min(Math.max(value, min), max);
    };

    const clampVertical = (value: number) => {
      const min = VIEWPORT_MARGIN;
      const max = viewportHeight - VIEWPORT_MARGIN - bubbleSize.height;
      if (min > max) {
        return (viewportHeight - bubbleSize.height) / 2;
      }
      return Math.min(Math.max(value, min), max);
    };

    const computeOverflow = (top: number, left: number) => {
      const overflowTop = Math.max(VIEWPORT_MARGIN - top, 0);
      const overflowBottom = Math.max(
        top + bubbleSize.height - (viewportHeight - VIEWPORT_MARGIN),
        0,
      );
      const overflowLeft = Math.max(VIEWPORT_MARGIN - left, 0);
      const overflowRight = Math.max(
        left + bubbleSize.width - (viewportWidth - VIEWPORT_MARGIN),
        0,
      );

      return overflowTop + overflowBottom + overflowLeft + overflowRight;
    };

    const pointer = chat.pointer;
    let bestStyle: CSSProperties | null = null;

    if (anchor) {
      const anchorViewport = {
        top: anchor.top - scrollY,
        left: anchor.left - scrollX,
        width: anchor.width,
        height: anchor.height,
      };

      const anchorCenterX = anchorViewport.left + anchorViewport.width / 2;
      const anchorCenterY = anchorViewport.top + anchorViewport.height / 2;

      type CandidateName = "bottom" | "top" | "right" | "left";

      type Candidate = {
        name: CandidateName;
        top: number;
        left: number;
        fits: boolean;
        overflow: number;
      };

      const candidates: Candidate[] = [];

      const bottomTop = anchorViewport.top + anchorViewport.height + verticalGap;
      const bottomLeft = clampHorizontal(anchorCenterX - bubbleSize.width / 2);
      candidates.push({
        name: "bottom",
        top: bottomTop,
        left: bottomLeft,
        fits: bottomTop + bubbleSize.height <= viewportHeight - VIEWPORT_MARGIN,
        overflow: computeOverflow(bottomTop, bottomLeft),
      });

      const topTop = anchorViewport.top - verticalGap - bubbleSize.height;
      const topLeft = clampHorizontal(anchorCenterX - bubbleSize.width / 2);
      candidates.push({
        name: "top",
        top: topTop,
        left: topLeft,
        fits: topTop >= VIEWPORT_MARGIN,
        overflow: computeOverflow(topTop, topLeft),
      });

      const rightLeft = anchorViewport.left + anchorViewport.width + horizontalGap;
      const rightTop = clampVertical(anchorCenterY - bubbleSize.height / 2);
      candidates.push({
        name: "right",
        top: rightTop,
        left: rightLeft,
        fits: rightLeft + bubbleSize.width <= viewportWidth - VIEWPORT_MARGIN,
        overflow: computeOverflow(rightTop, rightLeft),
      });

      const leftLeft = anchorViewport.left - horizontalGap - bubbleSize.width;
      const leftTop = clampVertical(anchorCenterY - bubbleSize.height / 2);
      candidates.push({
        name: "left",
        top: leftTop,
        left: leftLeft,
        fits: leftLeft >= VIEWPORT_MARGIN,
        overflow: computeOverflow(leftTop, leftLeft),
      });

      const baseOrder: CandidateName[] = ["bottom", "top", "right", "left"];
      const orderedCandidates = baseOrder
        .map((name) => candidates.find((candidate) => candidate.name === name))
        .filter((candidate): candidate is Candidate => Boolean(candidate));

      const perfectCandidate = orderedCandidates.find(
        (candidate) => candidate.fits && candidate.overflow === 0,
      );

      if (perfectCandidate) {
        bestStyle = {
          top: `${Math.round(perfectCandidate.top + scrollY)}px`,
          left: `${Math.round(perfectCandidate.left + scrollX)}px`,
        };
      } else if (!pointer) {
        const bestCandidate =
          orderedCandidates.find((candidate) => candidate.fits) ??
          (orderedCandidates.length > 0
            ? orderedCandidates.reduce(
                (best, candidate) => (candidate.overflow < best.overflow ? candidate : best),
                orderedCandidates[0],
              )
            : null);

        if (bestCandidate) {
          bestStyle = {
            top: `${Math.round(bestCandidate.top + scrollY)}px`,
            left: `${Math.round(bestCandidate.left + scrollX)}px`,
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
        left: `${Math.round(clampedLeft + scrollX)}px`,
      };
    }

    if (bestStyle) {
      setBubbleStyle((prev) => {
        if (
          prev.top === bestStyle!.top &&
          prev.left === bestStyle!.left &&
          !("transform" in prev)
        ) {
          return prev;
        }
        return bestStyle!;
      });
      return;
    }

    setBubbleStyle((prev) => (prev === DEFAULT_BUBBLE_STYLE ? prev : DEFAULT_BUBBLE_STYLE));
  }, [anchor, bubbleSize, chat.pointer]);

  const isSubmitting = chat.status === "submitting";
  const hasInput = chat.instruction.trim().length > 0;
  const showExpandedLayout = hasInput || chat.status !== "idle";
  const disableEditing = isSubmitting;
  const computedStatusLabel =
    chat.statusLabel ?? statusSequence[chat.statusPhase] ?? statusSequence[0] ?? null;

  const handleUndo = useCallback(() => {
    if (chat.statusAddonMode !== "summary") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(EVENT_UNDO, {
        detail: {
          instruction: chat.instruction,
          summary: chat.summary ?? null,
          filePath: chat.filePath,
        },
      }),
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
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter") return;
      if (event.shiftKey) {
        return;
      }
      event.preventDefault();
      if (!isSubmitting && hasInput) {
        onSubmit();
      }
    },
    [hasInput, isSubmitting, onSubmit],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onInstructionChange(event.target.value);
    },
    [onInstructionChange],
  );

  return (
    <div
      ref={bubbleRef}
      className={cn(
        "absolute z-[2147483647] flex w-full max-w-[400px] flex-col overflow-hidden rounded-xl border border-neutral-200/40 bg-neutral-50/60 text-neutral-900 shadow-2xl backdrop-blur-2xl font-sans dark:border-neutral-700/40 dark:bg-neutral-900/60 dark:text-neutral-50",
        "animate-in fade-in-0 zoom-in-95 duration-100 ease-out",
      )}
      style={bubbleStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Shipflow overlay request"
      data-react-grab-chat-bubble="true"
      data-react-grab="true"
    >
      <div
        className={cn(
          "flex w-full flex-col p-3",
          showExpandedLayout ? "gap-2" : "gap-0",
        )}
      >
        <div className="relative flex w-full items-center gap-3">
          <textarea
            ref={textareaRef}
            data-react-grab-chat-input="true"
            rows={showExpandedLayout ? 2 : 1}
            className={cn(
              "w-full resize-none bg-transparent text-sm font-normal leading-relaxed text-neutral-800 placeholder:text-neutral-400 outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500",
              disableEditing && "opacity-50",
              !showExpandedLayout && "pr-10",
            )}
            placeholder="Change anything"
            value={chat.instruction}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disableEditing}
          />

          {!showExpandedLayout ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!hasInput || isSubmitting}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-300/50 text-neutral-600 transition hover:bg-neutral-300/80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-700/50 dark:text-neutral-300 dark:hover:bg-neutral-700/80",
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {showExpandedLayout ? (
          <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
            <div className="relative inline-flex">
              <select
                aria-label="Model selection"
                className={cn(
                  "h-8 w-auto appearance-none rounded-lg bg-neutral-200/50 pl-3 pr-[26px] text-xs font-medium text-neutral-500 transition hover:bg-neutral-200/70 focus:outline-none focus:ring-2 focus:ring-neutral-300/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:focus:ring-neutral-700/50",
                )}
                value={chat.model}
                onChange={(event) => onModelChange(event.target.value)}
                disabled={disableEditing}
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            <button
              type="button"
              onClick={isSubmitting ? onStop : onSubmit}
              disabled={!hasInput && !isSubmitting}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                isSubmitting
                  ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                  : "bg-neutral-900 text-white shadow-lg hover:bg-neutral-800 hover:scale-105 dark:bg-white dark:text-black dark:hover:bg-neutral-200",
                !hasInput && !isSubmitting && "opacity-0 pointer-events-none",
              )}
            >
              {isSubmitting ? (
                <Square className="h-3 w-3 fill-current" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {chat.statusAddonMode !== "idle" && (
        <div className="flex w-full flex-col border-t border-neutral-200/30 bg-neutral-100/30 px-3 py-2 backdrop-blur-xl dark:border-neutral-800/30 dark:bg-neutral-900/30 animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
          {chat.statusAddonMode === "progress" ? (
            <div className="flex items-center justify-between gap-3 text-xs font-medium">
              <div className="flex items-center gap-2 shrink-0">
                <CursorIcon className="h-3.5 w-3.5 animate-pulse-subtle" />
                <span className="bg-gradient-to-r from-neutral-600 via-neutral-600/40 to-neutral-600 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer dark:from-neutral-400 dark:via-neutral-400/40 dark:to-neutral-400 opacity-60">
                  {computedStatusLabel}
                </span>
              </div>
              {chat.statusContext && (
                <span className="min-w-0 flex-1 truncate text-right text-neutral-400 dark:text-neutral-500">
                  {chat.useTypewriter ? <Typewriter text={chat.statusContext} /> : chat.statusContext}
                </span>
              )}
            </div>
          ) : chat.statusAddonMode === "summary" && chat.summary ? (
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <CursorIcon className="h-3.5 w-3.5" />
                <span>Changes applied</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="flex items-center gap-1 text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-200"
                >
                  Undo <Command className="h-3 w-3 ml-0.5" /> Z
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {chat.error ? (
        <div className="border-t border-red-200/50 bg-red-50/50 px-3 py-2 text-xs font-medium text-red-600 backdrop-blur-xl dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {chat.error}
        </div>
      ) : null}
    </div>
  );
}

export function FlowOverlayProvider(props: FlowOverlayProps = {}) {
  const clipboardOptions = useMemo(
    () => props.clipboardOptions ?? {},
    [props.clipboardOptions],
  );

  const config = useMemo<ShipflowOverlayConfig>(() => {
    const models =
      props.models && props.models.length > 0 ? props.models : DEFAULT_CONFIG.models;
    const statusSequence =
      props.statusSequence && props.statusSequence.length > 0
        ? props.statusSequence
        : DEFAULT_CONFIG.statusSequence;
    const endpoint = props.endpoint ?? DEFAULT_CONFIG.endpoint;

    return {
      endpoint,
      models,
      statusSequence,
    };
  }, [props.endpoint, props.models, props.statusSequence]);

  const [chat, setChat] = useState<ChatState | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fallbackStatusLabel = config.statusSequence[0] ?? null;

  useEffect(() => {
    if (props.enableClipboardInterceptor === false) {
      return;
    }

    let cleanup: (() => void) | undefined;

    loadReactGrabRuntime({
      url: clipboardOptions.reactGrabUrl,
    })
      .then(() => {
        cleanup = registerClipboardInterceptor({
          projectRoot: clipboardOptions.projectRoot,
          highlightColor: clipboardOptions.highlightColor,
          highlightStyleId: clipboardOptions.highlightStyleId,
          logClipboardEndpoint:
            clipboardOptions.logClipboardEndpoint ??
            process.env.SHIPFLOW_OVERLAY_LOG_ENDPOINT ??
            null,
          reactGrabUrl: clipboardOptions.reactGrabUrl,
        });
      })
      .catch((error) => {
        console.error("[shipflow-overlay] Failed to load React Grab runtime", error);
      });

    return () => {
      cleanup?.();
    };
  }, [
    clipboardOptions.highlightColor,
    clipboardOptions.highlightStyleId,
    clipboardOptions.logClipboardEndpoint,
    clipboardOptions.projectRoot,
    clipboardOptions.reactGrabUrl,
    props.enableClipboardInterceptor,
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
    [config.models, config.statusSequence],
  );

  useSelectionEvents(
    useCallback(
      (payload: SelectionPayload) => {
        setChat({
          ...buildInitialState(),
          ...payload,
        });
      },
      [buildInitialState],
    ),
    close,
    Boolean(chat),
  );

  useRecalculateRect(chat, setChat);
  useEscapeToClose(Boolean(chat), close);
  useAutoFocus(Boolean(chat));

  const sendToBackend = useCallback(
    async (payload: {
      filePath: string | null;
      htmlFrame: string | null;
      stackTrace: string | null;
      instruction: string;
      model: string;
    }) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const promotePhase = (phase: number) => {
        const safePhase = Math.min(Math.max(phase, 0), config.statusSequence.length - 1);
        setChat((prev) => {
          if (!prev) return prev;
          if (prev.statusPhase === safePhase && prev.statusLabel) {
            return prev;
          }
          return {
            ...prev,
            statusPhase: safePhase,
            statusLabel: config.statusSequence[safePhase] ?? fallbackStatusLabel,
          };
        });
      };

      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? `Request failed with status ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming response is not supported in this environment.");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let assistantSummary = "";
        let hasPromotedPlanning = false;
        let hasPromotedUpdating = false;

        const processEvent = (event: StreamEvent) => {
          if (event.event === "status") {
            const message = event.message?.trim();
            if (message) {
              if (!hasPromotedPlanning && /plan|analy/i.test(message)) {
                promotePhase(1);
                hasPromotedPlanning = true;
              }
              if (!hasPromotedUpdating && /apply|build|final|update/i.test(message)) {
                promotePhase(2);
                hasPromotedUpdating = true;
              }
              setChat((prev) =>
                prev
                  ? {
                      ...prev,
                      statusContext: message,
                      useTypewriter: true,
                    }
                  : prev,
              );
            }
            if (!hasPromotedPlanning) {
              promotePhase(0);
            }
            return;
          }

          if (event.event === "assistant") {
            const chunk = event.text?.trim();
            if (chunk) {
              assistantSummary += chunk.endsWith("\n") ? chunk : `${chunk} `;
              if (!hasPromotedPlanning) {
                promotePhase(1);
                hasPromotedPlanning = true;
              }
              setChat((prev) =>
                prev
                  ? {
                      ...prev,
                      statusContext: chunk,
                      useTypewriter: false,
                    }
                  : prev,
              );
            }
            return;
          }

          if (event.event === "done") {
            if (event.success) {
              promotePhase(2);
              hasPromotedUpdating = true;
              const summary =
                event.summary?.trim() || assistantSummary.trim() || "Changes applied.";
              setChat((prev) =>
                prev
                  ? {
                      ...prev,
                      status: "success",
                      instruction: "",
                      statusAddonMode: "summary",
                      summary,
                      statusLabel: null,
                      statusContext: null,
                      statusPhase: Math.max(config.statusSequence.length - 1, 0),
                      serverMessage: event.stderr ? event.stderr.trim() : prev.serverMessage,
                    }
                  : prev,
              );
            } else {
              setChat((prev) =>
                prev
                  ? {
                      ...prev,
                      status: "error",
                      error: event.error ?? "Cursor CLI reported an error.",
                      statusAddonMode: "idle",
                      statusLabel: null,
                      statusContext: null,
                      summary: undefined,
                      statusPhase: 0,
                      serverMessage: event.stderr ? event.stderr.trim() : prev.serverMessage,
                    }
                  : prev,
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
                processEvent(JSON.parse(line) as StreamEvent);
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
            processEvent(JSON.parse(finalLine) as StreamEvent);
          } catch (error) {
            console.warn("[shipflow-overlay] Unable to parse final stream line", { finalLine, error });
          }
        }
      } catch (error) {
        if (controller.signal.aborted) {
          setChat((prev) =>
            prev
              ? {
                  ...prev,
                  status: "idle",
                  statusAddonMode: "idle",
                  statusLabel: null,
                  statusContext: null,
                  summary: undefined,
                  error: undefined,
                  serverMessage: undefined,
                  statusPhase: 0,
                }
              : prev,
          );
          return;
        }

        console.error("[shipflow-overlay] Failed to communicate with Cursor CLI backend", error);
        setChat((prev) =>
          prev
            ? {
                ...prev,
                status: "error",
                error: error instanceof Error ? error.message : "Unable to send request.",
                statusAddonMode: "idle",
                statusLabel: null,
                statusContext: null,
                summary: undefined,
              }
            : prev,
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [config.endpoint, config.models, config.statusSequence, fallbackStatusLabel],
  );

  const onInstructionChange = useCallback((value: string) => {
    setChat((current) => {
      if (!current) {
        return current;
      }

      const next: ChatState = {
        ...current,
        instruction: value,
      };

      if (current.status !== "submitting") {
        next.status = "idle";
      }

      if (value.length > 0 && current.statusAddonMode !== "idle") {
        next.statusAddonMode = "idle";
        next.statusLabel = null;
        next.statusContext = null;
        next.summary = undefined;
        next.statusPhase = 0;
      }

      if (current.status === "error") {
        next.error = undefined;
      }

      return next;
    });
  }, []);

  const onSubmit = useCallback(() => {
    let payload:
      | {
          filePath: string | null;
          htmlFrame: string | null;
          stackTrace: string | null;
          instruction: string;
          model: string;
        }
      | null = null;

    setChat((current) => {
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
          summary: undefined,
          statusPhase: 0,
          serverMessage: undefined,
        };
      }

      payload = {
        filePath: current.filePath,
        htmlFrame: current.htmlFrame,
        stackTrace: current.codeLocation,
        instruction: trimmed,
        model: current.model || config.models[0]?.value || "",
      };

      return {
        ...current,
        instruction: trimmed,
        status: "submitting",
        error: undefined,
        serverMessage: undefined,
        statusAddonMode: "progress",
        statusLabel: config.statusSequence[0] ?? fallbackStatusLabel,
        statusContext: "Preparing Cursor CLI request…",
        summary: undefined,
        statusPhase: 0,
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
    (value: string) => {
      setChat((current) => {
        if (!current || current.status === "submitting") {
          return current;
        }
        const nextValue = config.models.some((option) => option.value === value)
          ? value
          : config.models[0]?.value ?? "";
        return { ...current, model: nextValue };
      });
    },
    [config.models],
  );

  const bubble = chat ? (
    <Bubble
      chat={chat}
      onInstructionChange={onInstructionChange}
      onSubmit={onSubmit}
      onStop={stop}
      onModelChange={onModelChange}
      onClose={close}
      modelOptions={config.models}
      statusSequence={config.statusSequence}
    />
  ) : null;

  if (!bubble) return null;

  return createPortal(bubble, document.body);
}

export { Typewriter };
