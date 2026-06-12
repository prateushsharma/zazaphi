import type { Logger } from "./ports.js";

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
};

function meta(m?: Record<string, unknown>): string {
  if (!m || Object.keys(m).length === 0) return "";
  return c.dim(" " + JSON.stringify(m));
}

export class ConsoleLogger implements Logger {
  info(msg: string, m?: Record<string, unknown>): void {
    process.stdout.write(`${c.green("●")} ${msg}${meta(m)}\n`);
  }
  warn(msg: string, m?: Record<string, unknown>): void {
    process.stdout.write(`${c.yellow("▲")} ${msg}${meta(m)}\n`);
  }
  error(msg: string, m?: Record<string, unknown>): void {
    process.stdout.write(`${c.red("✖")} ${msg}${meta(m)}\n`);
  }
  stage(name: string, msg: string): void {
    process.stdout.write(`${c.cyan("▸")} ${c.cyan(name.padEnd(12))} ${c.dim(msg)}\n`);
  }
}

export class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  stage(): void {}
}
