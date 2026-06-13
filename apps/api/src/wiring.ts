import { ProjectSpec } from "@zazaphi/contracts";
import { Orchestrator, ConsoleLogger, InMemoryProjectStore } from "@zazaphi/core";
import type { OrchestratorPorts, EconomicsPort, Logger } from "@zazaphi/core";
import { createGateway } from "@zazaphi/gateway";
import { StubContextBuilder } from "@zazaphi/context";
import { DefaultEconomics } from "@zazaphi/economics";
import { StubSandbox } from "@zazaphi/sandbox";
import { ManifestBuilder } from "@zazaphi/services";
import { StubDeploy } from "@zazaphi/deploy";

export interface Wired {
  orchestrator: Orchestrator;
  economics: EconomicsPort;
}

export interface WiringOptions {
  logger?: Logger;
  failFirstAttempt?: boolean;
}

const PLACEHOLDER_SPEC = ProjectSpec.parse({
  project_id: "proj_pending",
  name: "pending",
  summary: "",
  stack: "",
});

/**
 * The only place concrete implementations are chosen. Swapping any subsystem
 * for its real version is a one-line change here; nothing else in the system
 * references a concrete class. The gateway resolves to the real Groq provider
 * when GROQ_API_KEY is set and to the offline stub otherwise.
 */
export function wire(options: WiringOptions = {}): Wired {
  const economics = new DefaultEconomics();
  const logger = options.logger ?? new ConsoleLogger();
  const ports: OrchestratorPorts = {
    gateway: createGateway({ onFallback: (reason) => logger.warn(reason) }),
    context: new StubContextBuilder(),
    economics,
    sandbox: new StubSandbox(options.failFirstAttempt ?? false),
    services: new ManifestBuilder(),
    deploy: new StubDeploy(),
    store: new InMemoryProjectStore(PLACEHOLDER_SPEC),
    logger,
  };
  return { orchestrator: new Orchestrator(ports), economics };
}
