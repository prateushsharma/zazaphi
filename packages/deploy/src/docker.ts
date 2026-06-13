import { spawn } from "node:child_process";

const MAX_CAPTURE = 16_000;

export interface DockerExec {
  exitCode: number;
  output: string;
  spawnError?: string;
}

/** Awaits a docker invocation. Never throws; a missing binary is reported. */
export function docker(args: string[], timeoutMs: number): Promise<DockerExec> {
  return new Promise((resolve) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let settled = false;
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    const onData = (chunk: Buffer): void => {
      output += chunk.toString("utf8");
      if (output.length > MAX_CAPTURE) output = output.slice(-MAX_CAPTURE);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: -1, output, spawnError: err.message });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: code ?? -1, output });
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Polls a URL until it answers (any HTTP status) or the deadline passes. */
export async function waitForHttp(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status > 0) return true;
    } catch {
      /* not ready yet */
    }
    await delay(1500);
  }
  return false;
}
