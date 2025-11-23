'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SelectionPayload = {
  htmlFrame: string | null;
  codeLocation: string | null;
  filePath: string | null;
  clipboardData: string;
  boundingRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
};

type ChatState = SelectionPayload & {
  instruction: string;
  status: "idle" | "submitting" | "success" | "error";
  error?: string;
  serverMessage?: string;
};

const HIGHLIGHT_QUERY = "[data-react-grab-chat-highlighted='true']";
const EVENT_OPEN = "react-grab-chat:open";
const EVENT_CLOSE = "react-grab-chat:close";

const initialState: ChatState = {
  htmlFrame: null,
  codeLocation: null,
  filePath: null,
  clipboardData: "",
  boundingRect: null,
  instruction: "",
  status: "idle",
  serverMessage: undefined,
  error: undefined,
};

function useSelectionEvents(onOpen: (payload: SelectionPayload) => void) {
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<SelectionPayload>;
      if (!custom.detail) return;
      onOpen(custom.detail);
    };

    window.addEventListener(EVENT_OPEN, handler as EventListener);
    return () => window.removeEventListener(EVENT_OPEN, handler as EventListener);
  }, [onOpen]);
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

function Bubble({
  chat,
  onInstructionChange,
  onSubmit,
  onClose,
}: {
  chat: ChatState;
  onInstructionChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const anchor = chat.boundingRect;

  const style = useMemo(() => {
    if (!anchor) {
      return {
        top: "20%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      } as const;
    }

    const yOffset = Math.max(anchor.height * 0.5, 16);

    return {
      top: `${Math.max(16, anchor.top + anchor.height + yOffset)}px`,
      left: `${anchor.left + anchor.width / 2}px`,
      transform: "translate(-50%, 0)",
    } as const;
  }, [anchor]);

  const isSubmitting = chat.status === "submitting";

  return (
    <div
      className="fixed z-[2147483647] flex max-w-sm flex-col gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xl ring-1 ring-black/5 dark:border-neutral-800 dark:bg-neutral-900"
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label="Composer edit request"
      data-react-grab-chat-bubble="true"
    >
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-neutral-600 dark:text-neutral-200">
          React Grab Chat
        </div>
        {chat.filePath ? (
          <div className="text-xs font-mono text-neutral-500 dark:text-neutral-300">
            {chat.filePath}
          </div>
        ) : null}
        {chat.htmlFrame ? (
          <pre className="max-h-24 overflow-y-auto rounded bg-neutral-950/5 p-2 text-[11px] leading-snug text-neutral-700 dark:bg-white/5 dark:text-neutral-200">
            {chat.htmlFrame}
          </pre>
        ) : null}
      </div>
      <textarea
        data-react-grab-chat-input="true"
        rows={3}
        className={cn(
          "w-full resize-none rounded-md border border-neutral-200 bg-white p-2 text-sm text-neutral-900 shadow-inner outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-600",
          isSubmitting && "opacity-75",
        )}
        placeholder="Describe the edit you want"
        value={chat.instruction}
        onChange={(event) => onInstructionChange(event.target.value)}
        disabled={isSubmitting}
      />
      {chat.status === "submitting" ? (
        <div className="rounded bg-neutral-200/40 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-200">
          Sending request to Cursor CLI…
        </div>
      ) : null}
      {chat.status === "error" ? (
        <div className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 dark:bg-red-500/20 dark:text-red-200">
          {chat.error ?? "Request failed"}
        </div>
      ) : null}
      {chat.status === "success" ? (
        <div className="rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
          Update applied. Check the file in your editor.
        </div>
      ) : null}
      {chat.serverMessage ? (
        <pre className="max-h-24 overflow-y-auto rounded bg-neutral-950/5 p-2 text-[11px] leading-snug text-neutral-600 dark:bg-white/5 dark:text-neutral-200">
          {chat.serverMessage}
        </pre>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={isSubmitting || chat.instruction.trim().length === 0}
        >
          {isSubmitting ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}

export function ReactGrabChatOverlay() {
  const [chat, setChat] = useState<ChatState | null>(null);

  const close = useCallback(() => {
    setChat(null);
    window.dispatchEvent(new Event(EVENT_CLOSE));
  }, []);

  useSelectionEvents(
    useCallback((payload: SelectionPayload) => {
      setChat({
        ...initialState,
        ...payload,
      });
    }, []),
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
    }) => {
      try {
        console.log("[react-grab-chat] Posting request to Cursor CLI backend", {
          filePath: payload.filePath,
          hasHtmlFrame: Boolean(payload.htmlFrame),
          hasStackTrace: Boolean(payload.stackTrace),
        });

        const response = await fetch("/api/react-grab-edit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          console.error("[react-grab-chat] Cursor CLI backend responded with error", {
            status: response.status,
            payload: data,
          });
          throw new Error(data?.error ?? `Request failed with status ${response.status}`);
        }

        console.log("[react-grab-chat] Cursor CLI backend completed successfully", {
          status: response.status,
        });

        setChat((prev) =>
          prev
            ? {
                ...prev,
                status: "success",
                serverMessage: typeof data?.stdout === "string" ? data.stdout.trim() : undefined,
              }
            : prev,
        );

        window.setTimeout(() => {
          close();
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }, 1500);
      } catch (error) {
        console.error("[react-grab-chat] Failed to communicate with Cursor CLI backend", error);
        setChat((prev) =>
          prev
            ? {
                ...prev,
                status: "error",
                error:
                  error instanceof Error ? error.message : "Unable to send request to Cursor CLI.",
              }
            : prev,
        );
      }
    },
    [close],
  );

  const onInstructionChange = useCallback(
    (value: string) => {
      setChat((current) => (current ? { ...current, instruction: value } : current));
    },
    [setChat],
  );

  const onSubmit = useCallback(() => {
    setChat((current) => {
      if (!current) return current;
      if (current.status === "submitting") return current;

      const trimmed = current.instruction.trim();
      if (!trimmed) {
        return {
          ...current,
          error: "Please describe the change.",
          status: "error",
          serverMessage: undefined,
        };
      }

      void sendToBackend({
        filePath: current.filePath,
        htmlFrame: current.htmlFrame,
        stackTrace: current.codeLocation,
        instruction: trimmed,
      });

      return {
        ...current,
        instruction: trimmed,
        status: "submitting",
        error: undefined,
        serverMessage: undefined,
      };
    });
  }, [sendToBackend]);

  const bubble = chat ? (
    <Bubble
      chat={chat}
      onInstructionChange={onInstructionChange}
      onSubmit={onSubmit}
      onClose={close}
    />
  ) : null;

  if (!bubble) return null;

  return createPortal(bubble, document.body);
}
