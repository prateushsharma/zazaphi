import { ProjectSpec } from "@zazaphi/contracts";
import { Orchestrator, InMemoryProjectStore } from "@zazaphi/core";
import type { OrchestratorPorts } from "@zazaphi/core";
import { createGateway } from "@zazaphi/gateway";
import { StubContextBuilder } from "@zazaphi/context";
import { DefaultEconomics } from "@zazaphi/economics";
import { ManifestBuilder } from "@zazaphi/services";
import { createDeploy, createSandbox } from "@zazaphi/deploy";
import { RegistryLogger, runRegistry } from "./runs";

const PLACEHOLDER = ProjectSpec.parse({
  project_id: "proj_pending",
  name: "pending",
  summary: "",
  stack: "",
});

interface Engine {
  orchestrator: Orchestrator;
  store: InMemoryProjectStore;
}

function build(): Engine {
  const store = new InMemoryProjectStore(PLACEHOLDER);
  let fellBack = false;
  const gateway = createGateway({
    onFallback: (reason) => {
      fellBack = true;
      console.warn(`[zazaphi] ${reason}`);
    },
  });
  console.info(
    `[zazaphi] gateway in use: ${fellBack ? "StubGroqGateway (offline)" : "GroqGateway (live)"}`,
  );
  const ports: OrchestratorPorts = {
    gateway,
    context: new StubContextBuilder(),
    economics: new DefaultEconomics(),
    sandbox: createSandbox(store),
    services: new ManifestBuilder(),
    deploy: createDeploy(store),
    store,
    logger: new RegistryLogger(runRegistry),
  };
  return { orchestrator: new Orchestrator(ports), store };
}

const globalRef = globalThis as unknown as { __zazaphi?: Engine };
const engine: Engine = globalRef.__zazaphi ?? (globalRef.__zazaphi = build());
export const orchestrator: Orchestrator = engine.orchestrator;
export const store: InMemoryProjectStore = engine.store;
