export interface DeployConfig {
  image: string;
  previewPort: number;
  prodPort: number;
  memory: string;
  cpus: string;
  pidsLimit: number;
  pullTimeoutMs: number;
  installTimeoutMs: number;
  readinessTimeoutMs: number;
  workRoot: string;
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Deploy configuration, env-overridable. No secrets here. */
export function resolveDeployConfig(env: Record<string, string | undefined> = process.env): DeployConfig {
  return {
    image: env.ZAZAPHI_DEPLOY_IMAGE?.trim() || "node:20-bookworm",
    previewPort: num(env.ZAZAPHI_PREVIEW_PORT, 4100),
    prodPort: num(env.ZAZAPHI_PROD_PORT, 4200),
    memory: env.ZAZAPHI_DEPLOY_MEMORY?.trim() || "1g",
    cpus: env.ZAZAPHI_DEPLOY_CPUS?.trim() || "2",
    pidsLimit: num(env.ZAZAPHI_DEPLOY_PIDS, 512),
    pullTimeoutMs: num(env.ZAZAPHI_DEPLOY_PULL_TIMEOUT_MS, 600_000),
    installTimeoutMs: num(env.ZAZAPHI_DEPLOY_INSTALL_TIMEOUT_MS, 60_000),
    readinessTimeoutMs: num(env.ZAZAPHI_DEPLOY_READY_TIMEOUT_MS, 240_000),
    workRoot: env.ZAZAPHI_DEPLOY_WORKROOT?.trim() || "/tmp/zazaphi-deploy",
  };
}
