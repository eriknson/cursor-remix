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
};

const CURSOR_BINARY_HINT = process.env.CURSOR_AGENT_BIN ?? "cursor-agent";
const MODEL = "composer-1";
const HOME_DIR = process.env.HOME ?? process.env.USERPROFILE ?? "";

let cachedCursorAgentBinary: string | null = null;
let cachedCursorAgentEnv: NodeJS.ProcessEnv | null = null;
let resolveBinaryPromise: Promise<string> | null = null;

const normalizeFilePath = (filePath: string | null) => {
  if (!filePath) return null;
  const trimmed = filePath.trim();
  if (!trimmed) return null;

  const cwd = process.cwd();
  if (path.isAbsolute(trimmed)) {
    const relative = path.relative(cwd, trimmed);
    return relative.startsWith("..") ? trimmed : relative;
  }

  return trimmed;
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

async function runCursorAgent(prompt: string) {
  const binary = await resolveCursorAgentBinary();

  return await new Promise<{ exitCode: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    try {
      const args = ["--print", "--force", "--model", MODEL, prompt];

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

      let stdout = "";
      let stderr = "";
      let settled = false;
      const timeoutMs = Number(process.env.REACT_GRAB_AGENT_TIMEOUT_MS ?? 4 * 60 * 1000);

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;

        console.warn("[react-grab-chat] cursor-agent exceeded timeout; terminating process", {
          timeoutMs,
        });

        try {
          child.kill("SIGTERM");
        } catch (killError) {
          console.warn("[react-grab-chat] Failed to terminate cursor-agent process", killError);
        }

        const trimmedStdout = stdout.trim();
        const trimmedStderr = stderr.trim();
        if (trimmedStdout) {
          console.log("[react-grab-chat] cursor-agent stdout (timeout):", trimmedStdout);
        }
        if (trimmedStderr) {
          console.error("[react-grab-chat] cursor-agent stderr (timeout):", trimmedStderr);
        }

        resolve({
          exitCode: null,
          stdout,
          stderr: `${stderr}\nProcess timed out after ${timeoutMs}ms`.trim(),
        });
      }, timeoutMs);

      child.stdout.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        console.log("[react-grab-chat] cursor-agent stdout:", text);
      });

      child.stderr.on("data", (data) => {
        const text = data.toString();
        stderr += text;
        console.error("[react-grab-chat] cursor-agent stderr:", text);
      });

      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        console.error("[react-grab-chat] cursor-agent failed to start", error);
        reject(error);
      });

      child.on("close", (exitCode) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        const trimmedStdout = stdout.trim();
        const trimmedStderr = stderr.trim();

        console.log("[react-grab-chat] cursor-agent exited", { exitCode });
        if (trimmedStdout) {
          console.log("[react-grab-chat] cursor-agent stdout (final):", trimmedStdout);
        } else {
          console.log("[react-grab-chat] cursor-agent stdout (final): <empty>");
        }
        if (trimmedStderr) {
          console.error("[react-grab-chat] cursor-agent stderr (final):", trimmedStderr);
        }

        resolve({ exitCode, stdout, stderr });
      });
    } catch (error) {
      console.error("[react-grab-chat] Unexpected error launching cursor-agent", error);
      reject(error);
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
  });

  const instruction = payload.instruction?.trim();
  if (!instruction) {
    return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
  }

  const normalizedFilePath = normalizeFilePath(payload.filePath);
  if (!normalizedFilePath) {
    return NextResponse.json({ error: "Unable to determine target file path from stack trace." }, { status: 400 });
  }

  const prompt = buildPrompt(normalizedFilePath, payload.htmlFrame, payload.stackTrace, instruction);
  console.log("[react-grab-chat] Built prompt for cursor-agent", {
    filePath: normalizedFilePath,
    hasHtmlFrame: Boolean(payload.htmlFrame),
    hasStackTrace: Boolean(payload.stackTrace),
    prompt,
  });

  try {
    const result = await runCursorAgent(prompt);

    if (result.exitCode !== 0) {
      console.error("[react-grab-chat] cursor-agent exited with error", {
        exitCode: result.exitCode,
        stderr: result.stderr,
      });
      return NextResponse.json(
        {
          error: "Cursor CLI exited with a non-zero status.",
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          prompt,
        },
        { status: 500 },
      );
    }

    console.log("[react-grab-chat] cursor-agent completed successfully");

    return NextResponse.json({
      success: true,
      stdout: result.stdout,
      exitCode: result.exitCode,
      prompt,
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
