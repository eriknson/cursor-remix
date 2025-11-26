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

// WeakRef type declaration for older TypeScript configs
declare const WeakRef: {
  prototype: WeakRef<object>;
  new <T extends object>(target: T): WeakRef<T>;
};
interface WeakRef<T extends object> {
  readonly [Symbol.toStringTag]: "WeakRef";
  deref(): T | undefined;
}

import { DEFAULT_MODEL_OPTIONS, DEFAULT_STATUS_SEQUENCE } from "./constants";
import type {
  ModelOption,
  Rect,
  SelectionPayload,
  ShipflowOverlayConfig,
  StatusAddonMode,
  StatusSequence,
  StreamEvent,
} from "./types";
import { initReactGrab, disposeReactGrab, SELECTION_ID_ATTR, type InitReactGrabOptions } from "./initReactGrab";

const HIGHLIGHT_ATTR = "data-react-grab-chat-highlighted";
const HIGHLIGHT_QUERY = `[${HIGHLIGHT_ATTR}='true']`;
const CHAT_ID_ATTR = "data-sf-chat-id";
const LOADING_ATTR = "data-react-grab-loading";
const SHIMMER_ATTR = "data-sf-shimmer-overlay";
const OVERLAY_STYLE_ID = "shipflow-overlay-styles";
const OVERLAY_ROOT_ID = "shipflow-overlay-root";

type OverlayMount = {
  container: HTMLElement;
  root: ShadowRoot | HTMLElement;
};

const ensureOverlayStyles = (root: Document | ShadowRoot) => {
  if ("getElementById" in root && root.getElementById(OVERLAY_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = OVERLAY_STYLE_ID;
  style.textContent = `
:host {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.5;
  color: var(--sf-text);
  font-size: 14px;
  --sf-bg: rgba(250, 250, 250, 0.7);
  --sf-border: rgba(229, 229, 229, 0.5);
  --sf-text: #171717;
  --sf-muted-text: #6b7280;
  --sf-placeholder: #9ca3af;
  --sf-inline-bg: rgba(212, 212, 212, 0.6);
  --sf-inline-hover-bg: rgba(212, 212, 212, 0.85);
  --sf-inline-text: #4b5563;
  --sf-inline-disabled-opacity: 0.5;
  --sf-select-bg: rgba(0, 0, 0, 0.035);
  --sf-select-hover-bg: rgba(212, 212, 212, 0.25);
  --sf-select-text: #4b5563;
  --sf-focus-ring: rgba(212, 212, 212, 0.5);
  --sf-submit-bg: #171717;
  --sf-submit-hover-bg: #262626;
  --sf-submit-text: #ffffff;
  --sf-status-bg: rgba(245, 245, 245, 0.45);
  --sf-status-border: rgba(229, 229, 229, 0.3);
  --sf-error-bg: rgba(254, 242, 242, 0.6);
  --sf-error-border: rgba(254, 202, 202, 0.5);
  --sf-error-text: #dc2626;
  --sf-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --sf-body-gap: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  :host {
    --sf-bg: rgba(23, 23, 23, 0.75);
    --sf-border: rgba(64, 64, 64, 0.5);
    --sf-text: #f5f5f5;
    --sf-muted-text: #a3a3a3;
    --sf-placeholder: #737373;
    --sf-inline-bg: rgba(64, 64, 64, 0.5);
    --sf-inline-hover-bg: rgba(64, 64, 64, 0.8);
    --sf-inline-text: #e5e5e5;
    --sf-select-bg: rgba(255, 255, 255, 0.045);
    --sf-select-hover-bg: rgba(64, 64, 64, 0.3);
    --sf-select-text: #a3a3a3;
    --sf-focus-ring: rgba(64, 64, 64, 0.5);
    --sf-submit-bg: #f5f5f5;
    --sf-submit-hover-bg: #e5e5e5;
    --sf-submit-text: #111827;
    --sf-status-bg: rgba(23, 23, 23, 0.35);
    --sf-status-border: rgba(64, 64, 64, 0.4);
    --sf-error-bg: rgba(239, 68, 68, 0.18);
    --sf-error-border: rgba(239, 68, 68, 0.35);
    --sf-error-text: #fecaca;
    --sf-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  }
}

:host([data-theme="dark"]),
:host-context(.dark) {
  --sf-bg: rgba(23, 23, 23, 0.75);
  --sf-border: rgba(64, 64, 64, 0.5);
  --sf-text: #f5f5f5;
  --sf-muted-text: #a3a3a3;
  --sf-placeholder: #737373;
  --sf-inline-bg: rgba(64, 64, 64, 0.5);
  --sf-inline-hover-bg: rgba(64, 64, 64, 0.8);
  --sf-inline-text: #e5e5e5;
  --sf-select-bg: rgba(38, 38, 38, 0.6);
  --sf-select-hover-bg: rgba(38, 38, 38, 0.8);
  --sf-select-text: #d4d4d4;
  --sf-focus-ring: rgba(64, 64, 64, 0.5);
  --sf-submit-bg: #f5f5f5;
  --sf-submit-hover-bg: #e5e5e5;
  --sf-submit-text: #111827;
  --sf-status-bg: rgba(23, 23, 23, 0.35);
  --sf-status-border: rgba(64, 64, 64, 0.4);
  --sf-error-bg: rgba(239, 68, 68, 0.18);
  --sf-error-border: rgba(239, 68, 68, 0.35);
  --sf-error-text: #fecaca;
  --sf-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}

:host *,
:host *::before,
:host *::after {
  box-sizing: border-box;
  font-family: inherit;
}

[data-react-grab-chat-bubble="true"] {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  width: 100%;
  max-width: 400px;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--sf-border);
  background: var(--sf-bg);
  color: var(--sf-text);
  box-shadow: var(--sf-shadow);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  animation: shipflow-fade-in 120ms ease-out;
  pointer-events: auto;
}

[data-sf-body="true"] {
  display: flex;
  flex-direction: column;
  gap: var(--sf-body-gap);
  padding: 12px;
}

[data-sf-body="true"][data-expanded="false"] {
  --sf-body-gap: 0;
}

[data-sf-row="input"] {
  display: flex;
  align-items: center;
  position: relative;
}

[data-sf-input="true"] {
  width: 100%;
  resize: none;
  border: none;
  background: transparent;
  color: var(--sf-text);
  font-size: 0.875rem;
  line-height: 1.6;
  padding-right: 2.5rem;
  outline: none;
}

[data-sf-input="true"][data-expanded="true"] {
  padding-right: 0;
}

[data-sf-input="true"]::placeholder {
  color: var(--sf-placeholder);
}

[data-sf-input="true"][disabled] {
  opacity: 0.6;
}

[data-sf-inline-submit="true"] {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 2rem;
  border-radius: 9999px;
  background: var(--sf-inline-bg);
  color: var(--sf-inline-text);
  border: none;
  cursor: pointer;
  transition: background-color 150ms ease, transform 150ms ease, opacity 150ms ease;
}

[data-sf-inline-submit="true"]:hover:not([disabled]) {
  background: var(--sf-inline-hover-bg);
}

[data-sf-inline-submit="true"][disabled] {
  opacity: var(--sf-inline-disabled-opacity);
  cursor: default;
}

[data-sf-toolbar="true"] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

[data-sf-select-wrapper="true"] {
  position: relative;
  display: inline-flex;
  align-items: center;
}

[data-sf-select="true"] {
  height: 2rem;
  appearance: none;
  border-radius: 8px;
  border: none;
  background: var(--sf-select-bg);
  color: var(--sf-select-text);
  padding: 0 26px 0 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease, box-shadow 150ms ease;
}

[data-sf-select="true"]:hover:not([disabled]) {
  background: var(--sf-select-hover-bg);
}

[data-sf-select="true"]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--sf-focus-ring);
}

[data-sf-select="true"][disabled] {
  opacity: 0.55;
  cursor: default;
}

[data-sf-select-chevron="true"] {
  position: absolute;
  pointer-events: none;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sf-placeholder);
}

[data-sf-submit="true"] {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 2rem;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  background: var(--sf-submit-bg);
  color: var(--sf-submit-text);
  transition: transform 150ms ease, background-color 150ms ease, opacity 150ms ease;
}

[data-sf-submit="true"]:hover:not([disabled]) {
  background: var(--sf-submit-hover-bg);
  transform: scale(1.05);
}

[data-sf-submit="true"][disabled] {
  opacity: 0.65;
  cursor: default;
  transform: scale(1);
}

[data-sf-submit="true"][data-hidden="true"] {
  opacity: 0;
  pointer-events: none;
}

[data-sf-status="true"] {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--sf-status-border);
  background: var(--sf-status-bg);
  padding: 10px 12px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

[data-sf-status="true"][data-mode="progress"] {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--sf-muted-text);
}

[data-sf-status-header="true"] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

[data-sf-status-label="true"] {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 0.75rem;
  color: var(--sf-muted-text);
  flex-shrink: 0;
}

[data-sf-status-context="true"] {
  flex: 1 1 auto;
  min-width: 0;
  text-align: right;
  color: var(--sf-muted-text);
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-sf-status="true"][data-mode="summary"] {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--sf-muted-text);
}

[data-sf-status="true"][data-mode="summary"] [data-sf-status-header="true"] {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

[data-sf-status="true"][data-mode="summary"] [data-sf-undo="true"] {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--sf-muted-text);
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
  transition: color 120ms ease;
}

[data-sf-status="true"][data-mode="summary"] [data-sf-undo="true"]:hover {
  color: var(--sf-text);
}

[data-sf-undo-wrapper="true"] {
  display: flex;
  align-items: center;
  gap: 12px;
}

[data-sf-undo="true"] svg {
  width: 12px;
  height: 12px;
}

[data-sf-error="true"] {
  border-top: 1px solid var(--sf-error-border);
  background: var(--sf-error-bg);
  color: var(--sf-error-text);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 10px 12px;
}

[data-sf-icon="cursor"] {
  width: 14px;
  height: 14px;
}

[data-sf-icon="cursor"][data-loading="true"] {
  animation: shipflow-pulse 1.5s ease-in-out infinite;
}

[data-sf-inline-submit="true"] svg,
[data-sf-submit="true"] svg {
  width: 14px;
  height: 14px;
}

[data-sf-submit="true"][data-submitting="true"] svg {
  width: 12px;
  height: 12px;
  fill: currentColor;
}

[data-sf-shimmer="true"] {
  background: linear-gradient(90deg, var(--sf-muted-text), transparent, var(--sf-muted-text));
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shipflow-shimmer 2.4s linear infinite;
  opacity: 0.75;
}

@keyframes shipflow-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shipflow-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes shipflow-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.25; }
}

[data-sf-mini-status="true"] {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--sf-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--sf-border);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--sf-muted-text);
  cursor: pointer;
  z-index: 2147483646;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: shipflow-fade-in 120ms ease-out;
  pointer-events: auto;
}

[data-sf-mini-status="true"]:hover {
  background: var(--sf-bg);
  border-color: var(--sf-border);
}
`;

  const target: ParentNode =
    root instanceof Document
      ? root.head ?? root.body ?? root.documentElement ?? root
      : root;
  target.appendChild(style);
};

const getOrCreateOverlayMount = (): OverlayMount | null => {
  if (typeof document === "undefined") {
    return null;
  }

  let container = document.getElementById(OVERLAY_ROOT_ID) as HTMLElement | null;
  if (!container) {
    container = document.createElement("div");
    container.id = OVERLAY_ROOT_ID;
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "0";
    container.style.height = "0";
    container.style.zIndex = "2147483646";
    document.body.appendChild(container);
  }

  let root: ShadowRoot | HTMLElement;
  if (typeof container.attachShadow === "function") {
    root = container.shadowRoot ?? container.attachShadow({ mode: "open" });
  } else {
    root = container;
  }

  return { container, root };
};
const EVENT_OPEN = "react-grab-chat:open";
const EVENT_CLOSE = "react-grab-chat:close";
const EVENT_UNDO = "react-grab-chat:undo";

const DEFAULT_CONFIG: ShipflowOverlayConfig = {
  endpoint: "/api/shipflow/overlay",
  models: DEFAULT_MODEL_OPTIONS,
  statusSequence: DEFAULT_STATUS_SEQUENCE,
};

type ChatState = SelectionPayload & {
  id: string;
  selectionId: string | null;
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
  sessionId?: string;
  undoStatus?: "idle" | "pending" | "success" | "error";
  undoMessage?: string;
  elementRef?: WeakRef<HTMLElement>;
  elementNode?: HTMLElement | null;
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

let chatIdCounter = 0;
const generateChatId = () => `chat-${++chatIdCounter}-${Date.now()}`;

const createInitialState = (
  models: readonly ModelOption[],
  statusSequence: StatusSequence,
  id?: string,
): ChatState => ({
  id: id ?? generateChatId(),
  selectionId: null,
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
  elementRef: undefined,
  elementNode: null,
});

export type FlowOverlayProps = Partial<ShipflowOverlayConfig> & {
  enableClipboardInterceptor?: boolean;
  clipboardOptions?: InitReactGrabOptions;
};

function CursorIcon({ loading }: { loading?: boolean }) {
  return (
    <svg
      viewBox="0 0 466.73 533.32"
      data-sf-icon="cursor"
      data-loading={loading ? "true" : undefined}
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

function MiniStatus({
  chat,
  label,
  onClick,
  resolveElement,
}: {
  chat: ChatState;
  label: string;
  onClick: () => void;
  resolveElement: (chat: ChatState) => HTMLElement | null;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const chatIdRef = useRef(chat.id);
  chatIdRef.current = chat.id;

  // Compute position from element or fallback to stored rect
  const computePosition = useCallback(() => {
    const element = resolveElement(chat);
    if (process.env.NODE_ENV !== "production") {
      console.log("[shipflow-overlay] MiniStatus computePosition:", {
        chatId: chat.id,
        elementFound: !!element,
        elementConnected: element?.isConnected,
        hasBoundingRect: !!chat.boundingRect,
      });
    }
    if (element && element.isConnected) {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      };
    }

    if (chat.boundingRect) {
      return {
        top: chat.boundingRect.top - 8,
        left: chat.boundingRect.left + chat.boundingRect.width / 2,
      };
    }

    return null;
  }, [chat, resolveElement]);

  // Initialize and update position
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      const newPos = computePosition();
      setPosition(newPos);
    };

    // Initial position
    updatePosition();

    // Update on scroll/resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [computePosition]);

  if (!position) return null;

  const style: CSSProperties = {
    position: "fixed",
    top: position.top,
    left: position.left,
    transform: "translate(-50%, -100%)",
  };

  return (
    <div
      style={style}
      data-sf-mini-status="true"
      data-sf-chat-id={chat.id}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
    >
      <CursorIcon loading />
      <span data-sf-shimmer="true">{label}</span>
    </div>
  );
}

type SelectionEventPayload = SelectionPayload & {
  selectionId?: string | null;
  targetElement?: HTMLElement | null;
};

function useSelectionEvents(
  onOpen: (payload: SelectionEventPayload) => void,
) {
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<SelectionEventPayload>;
      if (!custom.detail) return;
      onOpen(custom.detail);
    };

    window.addEventListener(EVENT_OPEN, handler as EventListener);
    return () => window.removeEventListener(EVENT_OPEN, handler as EventListener);
  }, [onOpen]);
}

function useRecalculateRect(
  chatId: string | null,
  chats: Map<string, ChatState>,
  resolveChatElement: (chat: ChatState) => HTMLElement | null,
  updateChat: (id: string, updater: (chat: ChatState) => ChatState) => void,
) {
  useEffect(() => {
    if (!chatId) return;
    const chat = chats.get(chatId);
    if (!chat) return;

    if (typeof window === "undefined") {
      return;
    }

    let frameId: number | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 120;

    const updateRect = () => {
      const element = resolveChatElement(chat);

      if (!(element instanceof HTMLElement)) {
        if (retryCount < MAX_RETRIES) {
          retryCount += 1;
          if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
          }
          frameId = window.requestAnimationFrame(updateRect);
        }
        return;
      }

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      retryCount = 0;

      const rect = element.getBoundingClientRect();

      const nextRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      updateChat(chatId, (current) => {
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
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [chatId, chats, resolveChatElement, updateChat]);
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

function useAutoFocus(isOpen: boolean, shadowRoot: ShadowRoot | HTMLElement | null) {
  useEffect(() => {
    if (!isOpen || !shadowRoot) return;

    const frame = requestAnimationFrame(() => {
      // Query within shadow root for Shadow DOM support
      const root = shadowRoot instanceof ShadowRoot ? shadowRoot : document;
      const textarea = root.querySelector<HTMLTextAreaElement>(
        "[data-react-grab-chat-input='true']",
      );
      textarea?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen, shadowRoot]);
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
  getHighlightElement?: () => HTMLElement | null,
) {
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Use composedPath to get the full event path including Shadow DOM elements
      const path = event.composedPath();
      const clickedInsideBubble = ref.current && path.includes(ref.current);
      
      if (clickedInsideBubble) {
        return;
      }

      const highlightedElement = getHighlightElement
        ? getHighlightElement()
        : document.querySelector<HTMLElement>(HIGHLIGHT_QUERY);
      const clickedInsideHighlight = highlightedElement && path.includes(highlightedElement);
      
      if (!clickedInsideHighlight) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [ref, isOpen, onClose, getHighlightElement]);
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
  onUndo,
  resolveElement,
  modelOptions,
  statusSequence,
}: {
  chat: ChatState;
  onInstructionChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onModelChange: (value: string) => void;
  onClose: () => void;
  onUndo: () => void;
  resolveElement: (chat: ChatState) => HTMLElement | null;
  modelOptions: readonly ModelOption[];
  statusSequence: StatusSequence;
}) {
  const anchor = chat.boundingRect;
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleSize, setBubbleSize] = useState<{ width: number; height: number } | null>(null);
  const [bubbleStyle, setBubbleStyle] = useState<CSSProperties>(DEFAULT_BUBBLE_STYLE);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightResolver = useCallback(
    () => resolveElement(chat),
    [chat, resolveElement],
  );

  // Get the currently selected model's label
  const selectedModelLabel = useMemo(() => {
    const selected = modelOptions.find((opt) => opt.value === chat.model);
    return selected?.label ?? chat.model;
  }, [modelOptions, chat.model]);

  // Calculate select width based on label length (using ch units + padding)
  const selectWidth = useMemo(() => {
    // Approximate width: character count * ch + padding (12px left + 26px right + buffer)
    const charWidth = selectedModelLabel.length * 0.8;
    return `calc(${charWidth}ch + 44px)`;
  }, [selectedModelLabel]);

  useClickOutside(bubbleRef, true, onClose, highlightResolver);

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

    // Try to get fresh rect from highlighted element, fall back to anchor from state
    const highlightedElement = highlightResolver();
    let anchorViewport: { top: number; left: number; width: number; height: number } | null = null;

    if (highlightedElement) {
      const rect = highlightedElement.getBoundingClientRect();
      anchorViewport = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    } else if (anchor) {
      anchorViewport = {
        top: anchor.top,
        left: anchor.left,
        width: anchor.width,
        height: anchor.height,
      };
    }

    if (anchorViewport) {

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
          top: `${Math.round(perfectCandidate.top)}px`,
          left: `${Math.round(perfectCandidate.left)}px`,
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
            top: `${Math.round(bestCandidate.top)}px`,
            left: `${Math.round(bestCandidate.left)}px`,
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
        top: `${Math.round(clampedTop)}px`,
        left: `${Math.round(clampedLeft)}px`,
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
  }, [
    anchor?.top,
    anchor?.left,
    anchor?.width,
    anchor?.height,
    bubbleSize,
    chat.pointer,
    chat.id,
    highlightResolver,
  ]);

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

    // Call the undo handler
    onUndo();

    // Also dispatch event for backward compatibility
    window.dispatchEvent(
      new CustomEvent(EVENT_UNDO, {
        detail: {
          instruction: chat.instruction,
          summary: chat.summary ?? null,
          filePath: chat.filePath,
          sessionId: chat.sessionId,
        },
      }),
    );
  }, [chat, onUndo]);

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
      style={bubbleStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Shipflow overlay request"
      data-react-grab-chat-bubble="true"
      data-react-grab="true"
    >
      <div
        data-sf-body="true"
        data-expanded={showExpandedLayout ? "true" : "false"}
      >
        <div data-sf-row="input">
          <textarea
            ref={textareaRef}
            data-react-grab-chat-input="true"
            rows={showExpandedLayout ? 2 : 1}
            placeholder="Change anything"
            value={chat.instruction}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disableEditing}
            data-sf-input="true"
            data-expanded={showExpandedLayout ? "true" : "false"}
          />

          {!showExpandedLayout ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!hasInput || isSubmitting}
              data-sf-inline-submit="true"
            >
              <ArrowUp />
            </button>
          ) : null}
        </div>

        {showExpandedLayout ? (
          <div data-sf-toolbar="true">
            <div data-sf-select-wrapper="true">
              <select
                aria-label="Model selection"
                value={chat.model}
                onChange={(event) => onModelChange(event.target.value)}
                disabled={disableEditing}
                data-sf-select="true"
                style={{ width: selectWidth }}
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span data-sf-select-chevron="true">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            <button
              type="button"
              onClick={isSubmitting ? onStop : onSubmit}
              disabled={!hasInput && !isSubmitting}
              data-sf-submit="true"
              data-hidden={!hasInput && !isSubmitting ? "true" : "false"}
              data-submitting={isSubmitting ? "true" : "false"}
            >
              {isSubmitting ? (
                <Square />
              ) : (
                <ArrowUp />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {chat.statusAddonMode !== "idle" && (
        <div
          data-sf-status="true"
          data-mode={chat.statusAddonMode}
        >
          {chat.statusAddonMode === "progress" ? (
            <div data-sf-status-header="true">
              <div data-sf-status-label="true">
                <CursorIcon loading />
                <span data-sf-shimmer="true">
                  {computedStatusLabel}
                </span>
              </div>
              {chat.statusContext && (
                <span data-sf-status-context="true">
                  {chat.useTypewriter ? <Typewriter text={chat.statusContext} /> : chat.statusContext}
                </span>
              )}
            </div>
          ) : chat.statusAddonMode === "summary" && chat.summary ? (
            <div data-sf-status-header="true">
              <div data-sf-status-label="true">
                <CursorIcon />
                <span>Changes applied</span>
              </div>
              <div data-sf-undo-wrapper="true">
                <button
                  type="button"
                  onClick={handleUndo}
                  data-sf-undo="true"
                >
                  Undo <Command /> Z
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {chat.error ? (
        <div data-sf-error="true">
          {chat.error}
        </div>
      ) : null}
    </div>
  );
}

export function FlowOverlayProvider(props: FlowOverlayProps = {}) {
  const [portalTarget, setPortalTarget] = useState<ShadowRoot | HTMLElement | null>(null);
  const overlayContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mount = getOrCreateOverlayMount();
    if (!mount) return;

    overlayContainerRef.current = mount.container;
    if (mount.root instanceof ShadowRoot) {
      ensureOverlayStyles(mount.root);
    } else if (typeof document !== "undefined") {
      ensureOverlayStyles(document);
    }
    setPortalTarget(mount.root);

    return () => {
      if (mount.container.childNodes.length === 0 && mount.container.isConnected) {
        mount.container.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const container = overlayContainerRef.current;
    if (!container) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      const docEl = document.documentElement;
      const hasDark = docEl.classList.contains("dark");
      const hasLight = docEl.classList.contains("light");
      const isDark = hasDark || (!hasLight && media.matches);
      container.dataset.theme = isDark ? "dark" : "light";
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    media.addEventListener("change", updateTheme);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateTheme);
    };
  }, [portalTarget]);

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

  // Multi-chat state
  const [chats, setChats] = useState<Map<string, ChatState>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const fallbackStatusLabel = config.statusSequence[0] ?? null;

  // Helper to update a specific chat
  const updateChat = useCallback((id: string, updater: (chat: ChatState) => ChatState) => {
    setChats((prev) => {
      const chat = prev.get(id);
      if (!chat) return prev;
      const updated = updater(chat);
      if (updated === chat) return prev;
      const next = new Map(prev);
      next.set(id, updated);
      return next;
    });
  }, []);

  // Cache for resolved elements - avoids state updates during render
  const elementCacheRef = useRef<Map<string, HTMLElement>>(new Map());

  // Helper to remove a chat and clean up
  const removeChat = useCallback((id: string) => {
    // Abort any running request
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }

    // Clear from element cache
    elementCacheRef.current.delete(id);

    // Remove highlight from element
    setChats((prev) => {
      const chat = prev.get(id);
      const element =
        chat?.elementNode && chat.elementNode.isConnected
          ? chat.elementNode
          : chat?.elementRef?.deref();
      if (element) {
        element.removeAttribute(HIGHLIGHT_ATTR);
        element.removeAttribute(SELECTION_ID_ATTR);
        element.removeAttribute(CHAT_ID_ATTR);
        element.removeAttribute(LOADING_ATTR);
      }
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    // Clear activeId if this was the active chat
    setActiveId((current) => (current === id ? null : current));
  }, []);

  // Pure element resolver - NO state updates, just returns the element
  const resolveChatElement = useCallback(
    (chat: ChatState): HTMLElement | null => {
      if (typeof document === "undefined") {
        return null;
      }

      // Check cache first
      const cached = elementCacheRef.current.get(chat.id);
      if (cached && cached.isConnected) {
        return cached;
      }

      let element: HTMLElement | null = null;

      // Try stored node
      if (chat.elementNode && chat.elementNode.isConnected) {
        element = chat.elementNode;
      }

      // Try weak ref
      if (!element && chat.elementRef) {
        const deref = chat.elementRef.deref();
        if (deref && deref.isConnected) {
          element = deref;
        }
      }

      // Try selection ID query
      if (!element && chat.selectionId) {
        element = document.querySelector<HTMLElement>(
          `[${SELECTION_ID_ATTR}="${chat.selectionId}"]`,
        );
      }

      // Try chat ID query
      if (!element) {
        element = document.querySelector<HTMLElement>(`[${CHAT_ID_ATTR}="${chat.id}"]`);
      }

      if (element && element.isConnected) {
        // Update cache
        elementCacheRef.current.set(chat.id, element);
        
        // Ensure attributes are set (no state update)
        element.setAttribute(HIGHLIGHT_ATTR, "true");
        if (chat.selectionId) {
          element.setAttribute(SELECTION_ID_ATTR, chat.selectionId);
        }
        element.setAttribute(CHAT_ID_ATTR, chat.id);
        
        return element;
      }

      // Remove from cache if not found
      elementCacheRef.current.delete(chat.id);
      return null;
    },
    [],
  );

  useEffect(() => {
    if (props.enableClipboardInterceptor === false) {
      return;
    }

    let mounted = true;

    initReactGrab({
      projectRoot: clipboardOptions.projectRoot,
      highlightColor: clipboardOptions.highlightColor,
      highlightStyleId: clipboardOptions.highlightStyleId,
    }).catch((error) => {
      if (mounted) {
        console.error("[shipflow-overlay] Failed to initialize React Grab:", error);
      }
    });

    return () => {
      mounted = false;
      disposeReactGrab();
    };
  }, [
    clipboardOptions.highlightColor,
    clipboardOptions.highlightStyleId,
    clipboardOptions.projectRoot,
    props.enableClipboardInterceptor,
  ]);

  // Close just hides the bubble - request continues in background
  const close = useCallback(() => {
    setActiveId(null);
  }, []);

  // Build initial state for a new chat
  const buildInitialState = useCallback(
    (id?: string) => createInitialState(config.models, config.statusSequence, id),
    [config.models, config.statusSequence],
  );

  // Handle new selections - add to chats map without aborting existing
  useSelectionEvents(
    useCallback(
      (payload: SelectionEventPayload) => {
        const newId = generateChatId();

        const {
          selectionId: incomingSelectionId,
          targetElement,
          tagRect: _unusedTagRect,
          ...payloadWithoutExtras
        } = payload as SelectionEventPayload & { tagRect?: unknown };

        let highlightedElement: HTMLElement | null =
          targetElement && targetElement.isConnected ? targetElement : null;

        if (!highlightedElement && incomingSelectionId) {
          highlightedElement = document.querySelector<HTMLElement>(
            `[${SELECTION_ID_ATTR}="${incomingSelectionId}"]`,
          );
        }

        if (highlightedElement && !highlightedElement.isConnected) {
          highlightedElement = null;
        }

        if (!highlightedElement && process.env.NODE_ENV !== "production") {
          console.warn(
            "[shipflow-overlay] Unable to resolve highlighted element for selection",
            incomingSelectionId,
          );
        }

        if (highlightedElement) {
          highlightedElement.setAttribute(CHAT_ID_ATTR, newId);
          highlightedElement.setAttribute(HIGHLIGHT_ATTR, "true");
          if (incomingSelectionId) {
            highlightedElement.setAttribute(SELECTION_ID_ATTR, incomingSelectionId);
          }
          // Cache element immediately
          elementCacheRef.current.set(newId, highlightedElement);
        }

        const weakRef =
          highlightedElement && typeof WeakRef === "function"
            ? new WeakRef(highlightedElement)
            : undefined;

        const nextBoundingRect = (() => {
          if (highlightedElement) {
            const rect = highlightedElement.getBoundingClientRect();
            return {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            };
          }
          if (payloadWithoutExtras.boundingRect) {
            return payloadWithoutExtras.boundingRect;
          }
          return null;
        })();

        const newChat: ChatState = {
          ...buildInitialState(newId),
          ...payloadWithoutExtras,
          selectionId: incomingSelectionId ?? null,
          elementRef: weakRef,
          elementNode: highlightedElement ?? null,
          boundingRect: nextBoundingRect,
        };

        setChats((prev) => {
          const next = new Map(prev);
          next.set(newId, newChat);
          return next;
        });
        setActiveId(newId);
      },
      [buildInitialState],
    ),
  );

  // Get active chat
  const activeChat = activeId ? chats.get(activeId) ?? null : null;

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const chatList = Array.from(chats.entries()).map(([id, c]) => ({
        id,
        status: c.status,
        hasElement: !!c.elementNode,
        hasWeakRef: !!c.elementRef,
        hasBoundingRect: !!c.boundingRect,
        cached: elementCacheRef.current.has(id),
      }));
      console.log("[shipflow-overlay] State update:", {
        activeId,
        chatCount: chats.size,
        chats: chatList,
      });
    }
  }, [activeId, chats]);

  useRecalculateRect(activeId, chats, resolveChatElement, updateChat);
  useEscapeToClose(activeId !== null, close);
  useAutoFocus(activeId !== null, portalTarget);

  // Track shimmer overlays and their listeners
  const shimmerStateRef = useRef<Map<string, {
    overlay: HTMLElement;
    element: HTMLElement;
    scrollHandler: () => void;
    resizeHandler: () => void;
  }>>(new Map());

  // Toggle loading shimmer overlay on highlighted elements
  useEffect(() => {
    const currentShimmers = shimmerStateRef.current;
    const activeChatIds = new Set<string>();

    // Create or update shimmers for loading chats
    chats.forEach((chat) => {
      const element = resolveChatElement(chat);
      if (!element || !element.isConnected) return;

      const isLoading = chat.status === "submitting";
      const shimmerId = `sf-shimmer-overlay-${chat.id}`;

      if (isLoading) {
        activeChatIds.add(chat.id);
        element.setAttribute(LOADING_ATTR, "true");

        // Check if shimmer already exists
        let shimmerState = currentShimmers.get(chat.id);
        
        if (!shimmerState) {
          // Create new shimmer overlay
          const overlay = document.createElement("div");
          overlay.id = shimmerId;
          overlay.setAttribute(SHIMMER_ATTR, "true");
          overlay.setAttribute(CHAT_ID_ATTR, chat.id);
          document.body.appendChild(overlay);

          const updatePosition = () => {
            if (!element.isConnected) return;
            const rect = element.getBoundingClientRect();
            overlay.style.top = `${rect.top}px`;
            overlay.style.left = `${rect.left}px`;
            overlay.style.width = `${rect.width}px`;
            overlay.style.height = `${rect.height}px`;
          };

          updatePosition();

          const scrollHandler = () => updatePosition();
          const resizeHandler = () => updatePosition();
          window.addEventListener("scroll", scrollHandler, true);
          window.addEventListener("resize", resizeHandler);

          shimmerState = { overlay, element, scrollHandler, resizeHandler };
          currentShimmers.set(chat.id, shimmerState);
        } else {
          // Update existing overlay position
          const rect = element.getBoundingClientRect();
          shimmerState.overlay.style.top = `${rect.top}px`;
          shimmerState.overlay.style.left = `${rect.left}px`;
          shimmerState.overlay.style.width = `${rect.width}px`;
          shimmerState.overlay.style.height = `${rect.height}px`;
        }
      } else {
        element.removeAttribute(LOADING_ATTR);
      }
    });

    // Remove shimmers for chats that are no longer loading
    currentShimmers.forEach((shimmerState, chatId) => {
      if (!activeChatIds.has(chatId)) {
        window.removeEventListener("scroll", shimmerState.scrollHandler, true);
        window.removeEventListener("resize", shimmerState.resizeHandler);
        shimmerState.overlay.remove();
        shimmerState.element.removeAttribute(LOADING_ATTR);
        currentShimmers.delete(chatId);
      }
    });

    // Cleanup on unmount only
    return () => {
      // Only clean up everything on full unmount
      // Check if we're actually unmounting vs just re-rendering
    };
  }, [chats, resolveChatElement]);

  // Cleanup all shimmers on unmount
  useEffect(() => {
    return () => {
      shimmerStateRef.current.forEach((shimmerState) => {
        window.removeEventListener("scroll", shimmerState.scrollHandler, true);
        window.removeEventListener("resize", shimmerState.resizeHandler);
        shimmerState.overlay.remove();
        shimmerState.element.removeAttribute(LOADING_ATTR);
      });
      shimmerStateRef.current.clear();
    };
  }, []);

  // Click on highlighted element to focus its chat
  useEffect(() => {
    const handlers: Array<{ element: HTMLElement; handler: (e: MouseEvent) => void }> = [];

    chats.forEach((chat) => {
      const element = resolveChatElement(chat);
      if (!element) return;

      // Only add click handler when this chat is not active
      if (chat.id === activeId) return;

      const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveId(chat.id);
      };

      element.addEventListener("click", handleClick, true);
      element.style.cursor = "pointer";
      handlers.push({ element, handler: handleClick });
    });

    return () => {
      handlers.forEach(({ element, handler }) => {
        element.removeEventListener("click", handler, true);
        element.style.cursor = "";
      });
    };
  }, [chats, activeId, resolveChatElement]);

  const sendToBackend = useCallback(
    async (
      chatId: string,
      payload: {
        filePath: string | null;
        htmlFrame: string | null;
        stackTrace: string | null;
        instruction: string;
        model: string;
      },
    ) => {
      const controller = new AbortController();
      abortControllersRef.current.set(chatId, controller);

      const promotePhase = (phase: number) => {
        const safePhase = Math.min(Math.max(phase, 0), config.statusSequence.length - 1);
        updateChat(chatId, (prev) => {
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
          // Handle session event to store sessionId for undo
          if (event.event === "session") {
            updateChat(chatId, (prev) => ({
              ...prev,
              sessionId: event.sessionId,
              undoStatus: "idle",
              undoMessage: undefined,
            }));
            return;
          }

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
              updateChat(chatId, (prev) => ({
                ...prev,
                statusContext: message,
                useTypewriter: true,
              }));
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
              updateChat(chatId, (prev) => ({
                ...prev,
                statusContext: chunk,
                useTypewriter: false,
              }));
            }
            return;
          }

          if (event.event === "done") {
            if (event.success) {
              promotePhase(2);
              hasPromotedUpdating = true;
              const summary =
                event.summary?.trim() || assistantSummary.trim() || "Changes applied.";
              updateChat(chatId, (prev) => ({
                ...prev,
                status: "success",
                instruction: "",
                statusAddonMode: "summary",
                summary,
                statusLabel: null,
                statusContext: null,
                statusPhase: Math.max(config.statusSequence.length - 1, 0),
                serverMessage: event.stderr ? event.stderr.trim() : prev.serverMessage,
              }));
            } else {
              updateChat(chatId, (prev) => ({
                ...prev,
                status: "error",
                error: event.error ?? "Cursor CLI reported an error.",
                statusAddonMode: "idle",
                statusLabel: null,
                statusContext: null,
                summary: undefined,
                statusPhase: 0,
                serverMessage: event.stderr ? event.stderr.trim() : prev.serverMessage,
              }));
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
          updateChat(chatId, (prev) => ({
            ...prev,
            status: "idle",
            statusAddonMode: "idle",
            statusLabel: null,
            statusContext: null,
            summary: undefined,
            error: undefined,
            serverMessage: undefined,
            statusPhase: 0,
          }));
          return;
        }

        console.error("[shipflow-overlay] Failed to communicate with Cursor CLI backend", error);
        updateChat(chatId, (prev) => ({
          ...prev,
          status: "error",
          error: error instanceof Error ? error.message : "Unable to send request.",
          statusAddonMode: "idle",
          statusLabel: null,
          statusContext: null,
          summary: undefined,
        }));
      } finally {
        abortControllersRef.current.delete(chatId);
      }
    },
    [config.endpoint, config.statusSequence, fallbackStatusLabel, updateChat],
  );

  const onInstructionChange = useCallback(
    (value: string) => {
      if (!activeId) return;
      updateChat(activeId, (current) => {
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
    },
    [activeId, updateChat],
  );

  const onSubmit = useCallback(() => {
    if (!activeId) return;

    const chat = chats.get(activeId);
    if (!chat) return;
    if (chat.status === "submitting") return;

    const trimmed = chat.instruction.trim();
    if (!trimmed) {
      updateChat(activeId, (current) => ({
        ...current,
        error: "Please describe the change.",
        status: "error",
        statusAddonMode: "idle",
        statusLabel: null,
        statusContext: null,
        summary: undefined,
        statusPhase: 0,
        serverMessage: undefined,
      }));
      return;
    }

    const payload = {
      filePath: chat.filePath,
      htmlFrame: chat.htmlFrame,
      stackTrace: chat.codeLocation,
      instruction: trimmed,
      model: chat.model || config.models[0]?.value || "",
    };

    updateChat(activeId, (current) => ({
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
    }));

    void sendToBackend(activeId, payload);
  }, [activeId, chats, config.models, config.statusSequence, fallbackStatusLabel, sendToBackend, updateChat]);

  const onStop = useCallback(() => {
    if (!activeId) return;
    const controller = abortControllersRef.current.get(activeId);
    if (controller) {
      controller.abort();
    }
  }, [activeId]);

  const onModelChange = useCallback(
    (value: string) => {
      if (!activeId) return;
      updateChat(activeId, (current) => {
        if (current.status === "submitting") {
          return current;
        }
        const nextValue = config.models.some((option) => option.value === value)
          ? value
          : config.models[0]?.value ?? "";
        return { ...current, model: nextValue };
      });
    },
    [activeId, config.models, updateChat],
  );

  const onUndo = useCallback(async () => {
    if (!activeId) return;
    const chat = chats.get(activeId);
    const sessionId = chat?.sessionId;
    if (!sessionId) {
      console.warn("[shipflow-overlay] No session ID available for undo");
      return;
    }

    // Update state to show undo is in progress
    updateChat(activeId, (current) => ({
      ...current,
      undoStatus: "pending",
      undoMessage: "Reverting changes...",
    }));

    try {
      // Derive undo endpoint from the main endpoint
      const undoEndpoint = config.endpoint.replace(/\/overlay\/?$/, "/undo");

      const response = await fetch(undoEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        updateChat(activeId, (current) => ({
          ...current,
          undoStatus: "error",
          undoMessage: data.error ?? "Failed to undo changes.",
        }));
        return;
      }

      // Success - update state and close or reset
      updateChat(activeId, (current) => ({
        ...current,
        undoStatus: "success",
        undoMessage: data.message ?? `Reverted ${data.restored?.length ?? 0} file(s).`,
        status: "idle",
        statusAddonMode: "idle",
        summary: undefined,
        sessionId: undefined,
      }));
    } catch (error) {
      console.error("[shipflow-overlay] Undo failed:", error);
      updateChat(activeId, (current) => ({
        ...current,
        undoStatus: "error",
        undoMessage: error instanceof Error ? error.message : "Undo request failed.",
      }));
    }
  }, [activeId, chats, config.endpoint, updateChat]);

  // Handle closing/dismissing the active chat
  const onClose = useCallback(() => {
    if (!activeId) return;
    const chat = chats.get(activeId);
    
    // If chat is not submitting, remove it entirely
    if (chat && chat.status !== "submitting") {
      removeChat(activeId);
      return;
    }
    
    // Otherwise just close the bubble (request continues in background)
    setActiveId(null);
  }, [activeId, chats, removeChat]);

  if (!portalTarget) {
    return null;
  }

  // Get all chats that should show MiniStatus (submitting and not active)
  const miniStatusChats = Array.from(chats.values()).filter(
    (chat) => chat.status === "submitting" && chat.id !== activeId,
  );

  // Show bubble for active chat
  const showBubble = activeChat !== null;

  // Always render the container if we have any chats, to ensure smooth transitions
  if (!showBubble && miniStatusChats.length === 0 && chats.size === 0) {
    return null;
  }

  return createPortal(
    <div 
      data-sf-overlay-container="true" 
      data-chat-count={chats.size} 
      data-active-id={activeId ?? "none"}
      data-mini-status-count={miniStatusChats.length}
      style={{ display: "contents" }}
    >
      {showBubble && activeChat && (
        <Bubble
          chat={activeChat}
          onInstructionChange={onInstructionChange}
          onSubmit={onSubmit}
          onStop={onStop}
          onModelChange={onModelChange}
          onClose={onClose}
          onUndo={onUndo}
          resolveElement={resolveChatElement}
          modelOptions={config.models}
          statusSequence={config.statusSequence}
        />
      )}
      {miniStatusChats.map((chat) => (
        <MiniStatus
          key={chat.id}
          chat={chat}
          label={chat.statusLabel ?? "Working..."}
          onClick={() => setActiveId(chat.id)}
          resolveElement={resolveChatElement}
        />
      ))}
    </div>,
    portalTarget,
  );
}

export { Typewriter };



