import type { DeployPort, ProjectStorePort } from "@zazaphi/core";
import { resolveDeployConfig } from "./config.js";
import { DockerDeploy } from "./docker-deploy.js";
import { StubDeploy } from "./stub.js";

export interface CreateDeployOptions {
  env?: Record<string, string | undefined>;
}

/**
 * Selects the real Docker deploy by default, or the offline stub when
 * ZAZAPHI_DEPLOY=stub. The store is injected so the deployer can materialize the
 * full project for the container.
 */
export function createDeploy(store: ProjectStorePort, options: CreateDeployOptions = {}): DeployPort {
  const env = options.env ?? process.env;
  if ((env.ZAZAPHI_DEPLOY?.trim().toLowerCase() ?? "docker") === "stub") {
    return new StubDeploy();
  }
  return new DockerDeploy(store, resolveDeployConfig(env));
}
