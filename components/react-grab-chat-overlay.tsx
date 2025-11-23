'use client';

import {
  type CSSProperties,
  type ChangeEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ArrowUp, Square, Command } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectionPayload = {
  htmlFrame: string | null;
  codeLocation: string | null;
  filePath: string | null;
  clipboardData: string;
  pointer: {
    x: number;
    y: number;
  } | null;
  boundingRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
};

type StatusAddonMode = "idle" | "progress" | "summary";

type StreamEvent =
  | { event: "status"; message: string }
  | { event: "assistant"; text: string }
  | {
      event: "done";
      success: boolean;
      summary: string;
      exitCode: number | null;
      error?: string;
      stderr?: string;
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
  summary?: string;
  statusStartedAt: number | null;
  statusCompletedAt: number | null;
};

const STATUS_SEQUENCE = ["Thinking", "Planning next moves", "Updating UI"] as const;
const MODEL_OPTIONS = [
  { value: "composer-1", label: "Composer 1" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "sonnet-4.5", label: "Sonnet 4.5" },
  { value: "gemini-3", label: "Gemini 3" },
] as const;

const HIGHLIGHT_QUERY = "[data-react-grab-chat-highlighted='true']";
const EVENT_OPEN = "react-grab-chat:open";
const EVENT_CLOSE = "react-grab-chat:close";
const EVENT_UNDO = "react-grab-chat:undo";

function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs)) {
    return "0s";
  }

  const clamped = Math.max(0, durationMs);
  if (clamped < 1000) {
    return "<1s";
  }

  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const segments: string[] = [];
  if (hours > 0) {
    segments.push(`${hours}h`);
  }
  if (minutes > 0) {
    segments.push(`${minutes}m`);
  }
  if (segments.length < 2 && (seconds > 0 || segments.length === 0)) {
    segments.push(`${seconds}s`);
  }

  return segments.join(" ");
}

function deriveActiveVerb(label: string | null): string {
  if (!label) {
    return "Working";
  }

  const normalized = label.toLowerCase();
  if (normalized.includes("think")) {
    return "Thinking";
  }
  if (normalized.includes("plan")) {
    return "Planning";
  }
  if (normalized.includes("update") || normalized.includes("apply") || normalized.includes("build")) {
    return "Updating";
  }
  if (normalized.includes("review") || normalized.includes("inspect") || normalized.includes("check")) {
    return "Reviewing";
  }
  return "Working";
}

function formatActiveElapsed(label: string | null, durationMs: number): string {
  return `${deriveActiveVerb(label)} for ${formatDuration(durationMs)}`;
}

function formatCompletedElapsed(durationMs: number): string {
  return `Completed in ${formatDuration(durationMs)}`;
}

function useStatusElapsedLabel({
  mode,
  label,
  startedAt,
  completedAt,
}: {
  mode: StatusAddonMode;
  label: string | null;
  startedAt: number | null;
  completedAt: number | null;
}): string | null {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "progress" && startedAt) {
      const update = () => {
        const elapsed = Date.now() - startedAt;
        setValue(formatActiveElapsed(label, elapsed));
      };

      update();
      const interval = window.setInterval(update, 1000);
      return () => {
        window.clearInterval(interval);
      };
    }

    if (mode === "summary" && startedAt && completedAt) {
      const elapsed = Math.max(0, completedAt - startedAt);
      setValue(formatCompletedElapsed(elapsed));
      return;
    }

    setValue(null);
  }, [mode, label, startedAt, completedAt]);

  return value;
}

const initialState: ChatState = {
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
  model: MODEL_OPTIONS[0].value,
  statusPhase: 0,
  statusAddonMode: "idle",
  statusLabel: null,
  statusContext: null,
  summary: undefined,
  statusStartedAt: null,
  statusCompletedAt: null,
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

function useSelectionEvents(
  onOpen: (payload: SelectionPayload) => void,
  onClose: () => void,
  isOpen: boolean,
) {
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<SelectionPayload>;
      if (!custom.detail) return;
      
      // If chat is already open, close it first before opening a new one
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
      const nextRect = {
        top: rect.top,
        left: rect.left,
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
        // Check if the click is not on the highlighted element
        const highlightedElement = document.querySelector(HIGHLIGHT_QUERY);
        if (!highlightedElement || !highlightedElement.contains(target)) {
          onClose();
        }
      }
    };

    // Use capture phase to catch clicks before they bubble
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [ref, isOpen, onClose]);
}

function Bubble({
  chat,
  onInstructionChange,
  onSubmit,
  onStop,
  onModelChange,
  onClose,
}: {
  chat: ChatState;
  onInstructionChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onModelChange: (value: string) => void;
  onClose: () => void;
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

    if (pointer) {
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

      const nextStyle: CSSProperties = {
        top: `${Math.round(clampedTop)}px`,
        left: `${Math.round(clampedLeft)}px`,
      };

      setBubbleStyle((prev) => {
        if (prev.top === nextStyle.top && prev.left === nextStyle.left && !("transform" in prev)) {
          return prev;
        }
        return nextStyle;
      });
      return;
    }

    if (!anchor) {
      setBubbleStyle((prev) => (prev === DEFAULT_BUBBLE_STYLE ? prev : DEFAULT_BUBBLE_STYLE));
      return;
    }

    const anchorCenterX = anchor.left + anchor.width / 2;
    const anchorCenterY = anchor.top + anchor.height / 2;

    type CandidateName = "bottom" | "top" | "right" | "left";

    type Candidate = {
      name: CandidateName;
      top: number;
      left: number;
      fits: boolean;
      overflow: number;
    };

    const candidates: Candidate[] = [];

    const bottomTop = anchor.top + anchor.height + verticalGap;
    const bottomLeft = clampHorizontal(anchorCenterX - bubbleSize.width / 2);
    candidates.push({
      name: "bottom",
      top: bottomTop,
      left: bottomLeft,
      fits: bottomTop + bubbleSize.height <= viewportHeight - VIEWPORT_MARGIN,
      overflow: computeOverflow(bottomTop, bottomLeft),
    });

    const topTop = anchor.top - verticalGap - bubbleSize.height;
    const topLeft = clampHorizontal(anchorCenterX - bubbleSize.width / 2);
    candidates.push({
      name: "top",
      top: topTop,
      left: topLeft,
      fits: topTop >= VIEWPORT_MARGIN,
      overflow: computeOverflow(topTop, topLeft),
    });

    const rightLeft = anchor.left + anchor.width + horizontalGap;
    const rightTop = clampVertical(anchorCenterY - bubbleSize.height / 2);
    candidates.push({
      name: "right",
      top: rightTop,
      left: rightLeft,
      fits: rightLeft + bubbleSize.width <= viewportWidth - VIEWPORT_MARGIN,
      overflow: computeOverflow(rightTop, rightLeft),
    });

    const leftLeft = anchor.left - horizontalGap - bubbleSize.width;
    const leftTop = clampVertical(anchorCenterY - bubbleSize.height / 2);
    candidates.push({
      name: "left",
      top: leftTop,
      left: leftLeft,
      fits: leftLeft >= VIEWPORT_MARGIN,
      overflow: computeOverflow(leftTop, leftLeft),
    });

    const baseOrder: CandidateName[] = ["bottom", "top", "right", "left"];
    let orderedNames = baseOrder;

    const orderedCandidates = orderedNames
      .map((name) => candidates.find((candidate) => candidate.name === name))
      .filter((candidate): candidate is Candidate => Boolean(candidate));

    const bestCandidate =
      orderedCandidates.find((candidate) => candidate.fits && candidate.overflow === 0) ??
      orderedCandidates.find((candidate) => candidate.fits) ??
      (orderedCandidates.length > 0
        ? orderedCandidates.reduce((best, candidate) =>
            candidate.overflow < best.overflow ? candidate : best,
          orderedCandidates[0])
        : null);

    if (!bestCandidate) {
      setBubbleStyle(DEFAULT_BUBBLE_STYLE);
      return;
    }

    const nextStyle: CSSProperties = {
      top: `${Math.round(bestCandidate.top)}px`,
      left: `${Math.round(bestCandidate.left)}px`,
    };

    setBubbleStyle((prev) => {
      if (prev.top === nextStyle.top && prev.left === nextStyle.left && !("transform" in prev)) {
        return prev;
      }
      return nextStyle;
    });
  }, [anchor, bubbleSize, chat.pointer]);

  const isSubmitting = chat.status === "submitting";
  const hasInput = chat.instruction.trim().length > 0;
  const showExpandedLayout = hasInput || chat.status !== "idle";
  const disableEditing = isSubmitting;
  const computedStatusLabel =
    chat.statusLabel ?? STATUS_SEQUENCE[chat.statusPhase] ?? STATUS_SEQUENCE[0];

  const statusElapsedLabel = useStatusElapsedLabel({
    mode: chat.statusAddonMode,
    label: computedStatusLabel,
    startedAt: chat.statusStartedAt,
    completedAt: chat.statusCompletedAt,
  });

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
        "fixed z-[2147483647] flex w-full max-w-[480px] flex-col overflow-hidden rounded-3xl border border-white/20 bg-neutral-50/60 text-neutral-900 shadow-2xl backdrop-blur-2xl transition-all duration-200 ease-out dark:border-neutral-800/30 dark:bg-neutral-900/60 dark:text-neutral-50",
      )}
      style={bubbleStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Composer edit request"
      data-react-grab-chat-bubble="true"
      data-react-grab="true"
    >
      {/* Main Content Area */}
      <div className="flex w-full flex-col gap-4 p-4">
        <div className="relative flex w-full items-start gap-3">
          <textarea
            ref={textareaRef}
            data-react-grab-chat-input="true"
            rows={showExpandedLayout ? 2 : 1}
            className={cn(
              "w-full resize-none bg-transparent text-lg font-medium leading-relaxed text-neutral-800 placeholder:text-neutral-400 outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500",
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
                "absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-300/50 text-neutral-600 transition hover:bg-neutral-300/80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-700/50 dark:text-neutral-300 dark:hover:bg-neutral-700/80",
              )}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {showExpandedLayout ? (
          <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
            <div className="relative">
              <select
                aria-label="Model selection"
                className={cn(
                  "h-8 w-auto min-w-[120px] appearance-none rounded-lg bg-neutral-200/50 px-3 pr-8 text-sm font-medium text-neutral-700 transition focus:outline-none focus:ring-2 focus:ring-neutral-300/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-800/50 dark:text-neutral-200 dark:focus:ring-neutral-700/50",
                )}
                value={chat.model}
                onChange={(event) => onModelChange(event.target.value)}
                disabled={disableEditing}
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
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
                (!hasInput && !isSubmitting) && "opacity-0 pointer-events-none"
              )}
            >
              {isSubmitting ? (
                <Square className="h-3 w-3 fill-current" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {/* Status/Summary Bar */}
      {chat.statusAddonMode !== "idle" && (
        <div className="flex w-full flex-col border-t border-neutral-200/30 bg-neutral-100/30 px-4 py-3 backdrop-blur-xl dark:border-neutral-800/30 dark:bg-neutral-900/30 animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
          {chat.statusAddonMode === "progress" ? (
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-neutral-600 dark:text-neutral-400">
                 {chat.statusContext || computedStatusLabel}
              </span>
              <span className="text-neutral-400 dark:text-neutral-500">
                {statusElapsedLabel ? statusElapsedLabel.replace("Working", "Thought") : "Thinking..."}
              </span>
            </div>
          ) : chat.statusAddonMode === "summary" && chat.summary ? (
             <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-neutral-600 dark:text-neutral-400">
                {chat.summary}
              </span>
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
        <div className="border-t border-red-200/50 bg-red-50/50 px-4 py-3 text-xs font-medium text-red-600 backdrop-blur-xl dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {chat.error}
        </div>
      ) : null}
    </div>
  );
}

export function ReactGrabChatOverlay() {
  const [chat, setChat] = useState<ChatState | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setChat(null);
    window.dispatchEvent(new Event(EVENT_CLOSE));
  }, [abortControllerRef]);

  useSelectionEvents(
    useCallback((payload: SelectionPayload) => {
      setChat({
        ...initialState,
        ...payload,
      });
    }, []),
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
        const safePhase = Math.min(Math.max(phase, 0), STATUS_SEQUENCE.length - 1);
        setChat((prev) => {
          if (!prev) return prev;
          if (prev.statusPhase === safePhase && prev.statusLabel) {
            return prev;
          }
          return {
            ...prev,
            statusPhase: safePhase,
            statusLabel: STATUS_SEQUENCE[safePhase],
          };
        });
      };

      try {
        const response = await fetch("/api/react-grab-edit", {
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
                      instruction: "", // Clear instruction on success
                      statusAddonMode: "summary",
                      summary,
                      statusLabel: null,
                      statusContext: null,
                      statusPhase: STATUS_SEQUENCE.length - 1,
                      statusCompletedAt: Date.now(),
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
                      statusCompletedAt: Date.now(),
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
                console.warn("[react-grab-chat] Unable to parse stream line", { line, error });
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
            console.warn("[react-grab-chat] Unable to parse final stream line", { finalLine, error });
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
                  statusStartedAt: null,
                  statusCompletedAt: null,
                }
              : prev,
          );
          return;
        }

        console.error("[react-grab-chat] Failed to communicate with Cursor CLI backend", error);
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
                statusCompletedAt: Date.now(),
              }
            : prev,
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [abortControllerRef],
  );

  const onInstructionChange = useCallback(
    (value: string) => {
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
          next.statusStartedAt = null;
          next.statusCompletedAt = null;
        }

        // If user starts typing, clear the summary/error mode immediately
        if (value.length > 0 && current.statusAddonMode !== "idle") {
          next.statusAddonMode = "idle";
          next.statusLabel = null;
          next.statusContext = null;
          next.summary = undefined;
          next.statusPhase = 0;
          next.statusCompletedAt = null;
        }

        if (current.status === "error") {
          next.error = undefined;
        }

        return next;
      });
    },
    [setChat],
  );

  const onSubmit = useCallback(() => {
    let payload: {
      filePath: string | null;
      htmlFrame: string | null;
      stackTrace: string | null;
      instruction: string;
      model: string;
    } | null = null;

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
          statusStartedAt: null,
          statusCompletedAt: null,
        };
      }

      payload = {
        filePath: current.filePath,
        htmlFrame: current.htmlFrame,
        stackTrace: current.codeLocation,
        instruction: trimmed,
        model: current.model,
      };

      return {
        ...current,
        instruction: trimmed,
        status: "submitting",
        error: undefined,
        serverMessage: undefined,
        statusAddonMode: "progress",
        statusLabel: STATUS_SEQUENCE[0],
        statusContext: "Preparing Cursor CLI request…",
        summary: undefined,
        statusPhase: 0,
        statusStartedAt: Date.now(),
        statusCompletedAt: null,
      };
    });

    if (payload) {
      void sendToBackend(payload);
    }
  }, [sendToBackend]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [abortControllerRef]);

  const onModelChange = useCallback(
    (value: string) => {
      setChat((current) => {
        if (!current || current.status === "submitting") {
          return current;
        }
        return { ...current, model: value };
      });
    },
    [setChat],
  );

  const bubble = chat ? (
    <Bubble
      chat={chat}
      onInstructionChange={onInstructionChange}
      onSubmit={onSubmit}
      onStop={stop}
      onModelChange={onModelChange}
      onClose={close}
    />
  ) : null;

  if (!bubble) return null;

  return createPortal(bubble, document.body);
}
