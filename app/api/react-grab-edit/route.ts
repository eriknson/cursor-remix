import { spawn, spawnSync } from "child_process";
import { access } from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestPayload = {
  filePath: string | null;
  htmlFrame: string | null;
  stackTrace: string | null;
  instruction: string;
  model?: string;
};

const CURSOR_BINARY_HINT = process.env.CURSOR_AGENT_BIN ?? "cursor-agent";
const DEFAULT_MODEL = "composer-1";
const HOME_DIR = process.env.HOME ?? process.env.USERPROFILE ?? "";

let cachedCursorAgentBinary: string | null = null;
let cachedCursorAgentEnv: NodeJS.ProcessEnv | null = null;
let resolveBinaryPromise: Promise<string> | null = null;

const normalizeFilePath = (filePath: string | null) => {
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
  if (path.isAbsolute(sanitized)) {
    const relative = path.relative(cwd, sanitized);
    return relative.startsWith("..") ? sanitized : relative;
  }

  return sanitized;
};

const STACK_TRACE_PATH_PATTERN = /([^\s()]+?\.(?:[jt]sx?|mdx?))/gi;

const extractFilePathFromStackTrace = (stackTrace: string | null) => {
  if (!stackTrace) return null;

  STACK_TRACE_PATH_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = STACK_TRACE_PATH_PATTERN.exec(stackTrace))) {
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

const buildPrompt = (filePath: string, htmlFrame: string | null, stackTrace: string | null, instruction: string) => {
  const lines: string[] = [];
  lines.push(`Open ${filePath}.`);
  lines.push("Target the element matching this HTML:");
  lines.push(htmlFrame ?? "(no HTML frame provided)");
  lines.push("");
  lines.push("and the component stack:");
  lines.push(stackTrace ?? "(no component stack provided)");
  lines.push("");
  lines.push(`User request: ${instruction}`);
  return lines.join("\n");
};

const pathExistsAndExecutable = async (filePath: string) => {
  if (!filePath) return false;
  try {
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    try {
      await access(filePath, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
};

const discoverCursorAgentBinary = async () => {
  const candidateNames = new Set<string>();
  if (CURSOR_BINARY_HINT) {
    candidateNames.add(CURSOR_BINARY_HINT);
  }
  candidateNames.add("cursor-agent");
  if (process.platform === "win32") {
    candidateNames.add("cursor-agent.exe");
  }

  const candidateDirs = new Set<string>(
    (process.env.PATH ?? "")
      .split(path.delimiter)
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  if (HOME_DIR) {
    candidateDirs.add(path.join(HOME_DIR, ".cursor", "bin"));
    candidateDirs.add(path.join(HOME_DIR, "Library", "Application Support", "Cursor", "bin"));
    candidateDirs.add(path.join(HOME_DIR, "AppData", "Local", "Programs", "cursor", "bin"));
  }

  for (const name of candidateNames) {
    if (!name) continue;
    if (path.isAbsolute(name)) {
      if (await pathExistsAndExecutable(name)) {
        return name;
      }
      continue;
    }

    // Attempt to resolve via spawnSync("which") / "where" as a quick check.
    const whichCommand = process.platform === "win32" ? "where" : "which";
    const lookup = spawnSync(whichCommand, [name], { encoding: "utf8" });
    if (!lookup.error && lookup.status === 0 && lookup.stdout) {
      const resolvedPath = lookup.stdout.split(/\r?\n/).find(Boolean);
      if (resolvedPath && (await pathExistsAndExecutable(resolvedPath))) {
        return resolvedPath;
      }
    }

    for (const dir of candidateDirs) {
      const fullPath = path.join(dir, name);
      if (await pathExistsAndExecutable(fullPath)) {
        return fullPath;
      }
    }
  }

  throw new Error(
    "cursor-agent binary not found. Set CURSOR_AGENT_BIN to an absolute path or add cursor-agent to your PATH.",
  );
};

const resolveCursorAgentBinary = async () => {
  if (cachedCursorAgentBinary) {
    return cachedCursorAgentBinary;
  }

  if (!resolveBinaryPromise) {
    resolveBinaryPromise = discoverCursorAgentBinary()
      .then((binaryPath) => {
        cachedCursorAgentBinary = binaryPath;
        const extraDirs: string[] = [];
        if (HOME_DIR) {
          extraDirs.push(path.join(HOME_DIR, ".cursor", "bin"));
          extraDirs.push(path.join(HOME_DIR, "Library", "Application Support", "Cursor", "bin"));
          extraDirs.push(path.join(HOME_DIR, "AppData", "Local", "Programs", "cursor", "bin"));
        }
        extraDirs.push(path.dirname(binaryPath));

        const existingPath = process.env.PATH ?? "";
        const pathSegments = new Set<string>(
          existingPath
            .split(path.delimiter)
            .map((segment) => segment.trim())
            .filter(Boolean),
        );

        for (const dir of extraDirs) {
          if (dir) {
            pathSegments.add(dir);
          }
        }

        cachedCursorAgentEnv = {
          ...process.env,
          PATH: Array.from(pathSegments).join(path.delimiter),
        };

        return binaryPath;
      })
      .catch((error) => {
        resolveBinaryPromise = null;
        throw error;
      });
  }

  return resolveBinaryPromise;
};

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

const STREAM_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
};

const STATUS_KEYS = ["text", "value", "delta", "message", "summary", "label"];

const extractAssistantText = (input: unknown, seen = new WeakSet<object>()): string => {
  if (!input) return "";
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((entry) => extractAssistantText(entry, seen)).join("");
  }
  if (typeof input === "object") {
    if (seen.has(input as object)) return "";
    seen.add(input as object);

    const record = input as Record<string, unknown>;
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

const describeEvent = (event: unknown): string | null => {
  if (!event || typeof event !== "object") {
    return null;
  }

  const payload = event as Record<string, unknown>;
  const type = typeof payload.type === "string" ? payload.type : null;
  const subtype = typeof payload.subtype === "string" ? payload.subtype : null;

  if (type === "system") {
    if (subtype === "init") {
      return "Initializing agent…";
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
    return "Thinking…";
  }

  if (type === "tool_call") {
    const toolName =
      typeof payload.tool === "object" && payload.tool && typeof (payload.tool as Record<string, unknown>).name === "string"
        ? String((payload.tool as Record<string, unknown>).name)
        : "Tool";
    const normalizedName = toolName.toLowerCase();

    if (subtype === "started") {
      if (
        normalizedName.includes("apply") ||
        normalizedName.includes("write") ||
        normalizedName.includes("patch") ||
        normalizedName.includes("build")
      ) {
        return "Building changes…";
      }
      if (normalizedName.includes("plan") || normalizedName.includes("analy")) {
        return "Analyzing project…";
      }
      return `Running ${toolName}…`;
    }
    if (subtype === "completed") {
      if (
        normalizedName.includes("apply") ||
        normalizedName.includes("write") ||
        normalizedName.includes("patch") ||
        normalizedName.includes("build")
      ) {
        return "Build step complete.";
      }
      return `${toolName} finished.`;
    }
    return `${toolName} ${subtype ?? "update"}…`;
  }

  if (type === "result") {
    return "Finalizing changes…";
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

async function runCursorAgentStream(
  binary: string,
  model: string,
  prompt: string,
  send: (event: StreamEvent) => void,
) {
  await new Promise<void>((resolve) => {
    try {
      const args = [
        "--print",
        "--force",
        "--output-format",
        "stream-json",
        "--stream-partial-output",
        "--model",
        model,
        prompt,
      ];

      console.log("[react-grab-chat] Spawning cursor-agent", {
        command: binary,
        args,
        cwd: process.cwd(),
      });

      const child = spawn(binary, args, {
        cwd: process.cwd(),
        env: cachedCursorAgentEnv ?? process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdoutBuffer = "";
      let stderrAggregate = "";
      let assistantSummary = "";
      let settled = false;

      const timeoutMs = Number(process.env.REACT_GRAB_AGENT_TIMEOUT_MS ?? 4 * 60 * 1000);

      const sendStatus = (message: string) => {
        if (!message) return;
        send({ event: "status", message });
      };

      const appendAssistant = (text: string) => {
        if (!text) return;
        assistantSummary += text;
        send({ event: "assistant", text });
      };

      const flushDone = (success: boolean, exitCode: number | null, error?: string) => {
        send({
          event: "done",
          success,
          summary: assistantSummary.trim(),
          exitCode,
          error,
          stderr: stderrAggregate.trim() || undefined,
        });
      };

      const processLine = (line: string) => {
        if (!line.trim()) {
          return;
        }

        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          const status = describeEvent(parsed);
          if (status) {
            sendStatus(status);
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
          console.warn("[react-grab-chat] Failed to parse cursor-agent stream line", {
            line,
            error,
          });
          sendStatus(line);
        }
      };

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;

        console.warn("[react-grab-chat] cursor-agent exceeded timeout; terminating process", {
          timeoutMs,
        });

        sendStatus(`Cursor CLI timed out after ${timeoutMs}ms; terminating process.`);

        try {
          child.kill("SIGTERM");
        } catch (killError) {
          console.warn("[react-grab-chat] Failed to terminate cursor-agent process", killError);
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
        for (const line of text.split(/\r?\n/).map((entry: string) => entry.trim()).filter(Boolean)) {
          sendStatus(`[stderr] ${line}`);
        }
        console.error("[react-grab-chat] cursor-agent stderr:", text);
      });

      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        console.error("[react-grab-chat] cursor-agent failed to start", error);
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

        console.log("[react-grab-chat] cursor-agent exited", { exitCode });

        if (exitCode === 0) {
          flushDone(true, exitCode ?? 0);
        } else {
          const error =
            stderrAggregate.trim() ||
            `Cursor CLI exited with status ${exitCode ?? "unknown"}. Check server logs for details.`;
          flushDone(false, exitCode ?? null, error);
        }

        resolve();
      });
    } catch (error) {
      console.error("[react-grab-chat] Unexpected error launching cursor-agent", error);
      send({
        event: "done",
        success: false,
        summary: "",
        exitCode: null,
        error: error instanceof Error ? error.message : "Unexpected error launching Cursor CLI.",
      });
      resolve();
    }
  });
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "React Grab chat workflow is only available in development." },
      { status: 403 },
    );
  }

  let payload: RequestPayload;
  try {
    payload = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  console.log("[react-grab-chat] Received edit request", {
    filePath: payload.filePath,
    hasHtmlFrame: Boolean(payload.htmlFrame),
    hasStackTrace: Boolean(payload.stackTrace),
    model: payload.model,
  });

  const instruction = payload.instruction?.trim();
  if (!instruction) {
    return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
  }

  const directFilePath = normalizeFilePath(payload.filePath);
  const derivedFilePath =
    directFilePath ??
    (payload.filePath ? null : normalizeFilePath(extractFilePathFromStackTrace(payload.stackTrace)));
  const normalizedFilePath = derivedFilePath;

  if (!directFilePath && normalizedFilePath) {
    console.log("[react-grab-chat] Derived file path from stack trace", {
      stackTracePreview: payload.stackTrace?.slice(0, 200),
      derivedFilePath: normalizedFilePath,
    });
  }

  if (!normalizedFilePath) {
    return NextResponse.json({ error: "Unable to determine target file path from stack trace." }, { status: 400 });
  }

  const prompt = buildPrompt(normalizedFilePath, payload.htmlFrame, payload.stackTrace, instruction);
  const model = payload.model?.trim() || DEFAULT_MODEL;
  console.log("[react-grab-chat] Built prompt for cursor-agent", {
    filePath: normalizedFilePath,
    hasHtmlFrame: Boolean(payload.htmlFrame),
    hasStackTrace: Boolean(payload.stackTrace),
    prompt,
    model,
  });

  try {
    const binary = await resolveCursorAgentBinary();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const state = { isClosed: false };

        const send = (event: StreamEvent) => {
          if (state.isClosed) {
            return;
          }
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch (error) {
            // Controller might be closed, mark it as closed and stop sending
            if (
              error instanceof TypeError &&
              (error.message.includes("closed") || error.message.includes("Invalid state"))
            ) {
              state.isClosed = true;
            }
          }
        };

        // Handle request abort
        request.signal.addEventListener("abort", () => {
          state.isClosed = true;
          try {
            controller.close();
          } catch {
            // Controller might already be closed, ignore
          }
        });

        send({ event: "status", message: `Preparing Cursor CLI request (${model})…` });

        try {
          await runCursorAgentStream(binary, model, prompt, send);
        } catch (error) {
          if (state.isClosed) {
            return;
          }
          console.error("[react-grab-chat] Failed during Cursor CLI streaming", error);
          send({
            event: "done",
            success: false,
            summary: "",
            exitCode: null,
            error:
              error instanceof Error
                ? error.message
                : "Unexpected error streaming from Cursor CLI.",
          });
        } finally {
          if (!state.isClosed) {
            try {
              controller.close();
            } catch {
              // Controller might already be closed, ignore
            }
            state.isClosed = true;
          }
        }
      },
    });

    return new NextResponse(stream, {
      headers: STREAM_HEADERS,
    });
  } catch (error) {
    console.error("[react-grab-chat] Failed to run cursor-agent", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to invoke Cursor CLI. Ensure cursor-agent is installed and available on PATH.",
      },
      { status: 500 },
    );
  }
}
