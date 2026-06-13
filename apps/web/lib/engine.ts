import { ProjectSpec } from "@zazaphi/contracts";
import { Orchestrator, InMemoryProjectStore, SilentLogger } from "@zazaphi/core";
import type { OrchestratorPorts } from "@zazaphi/core";
import { createGateway } from "@zazaphi/gateway";
import { StubContextBuilder } from "@zazaphi/context";
import { DefaultEconomics } from "@zazaphi/economics";
import { StubSandbox } from "@zazaphi/sandbox";
import { ManifestBuilder } from "@zazaphi/services";
import { createDeploy } from "@zazaphi/deploy";

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
    sandbox: new StubSandbox(false),
    services: new ManifestBuilder(),
    deploy: createDeploy(store),
    store,
    logger: new SilentLogger(),
  };
  return { orchestrator: new Orchestrator(ports), store };
}

const globalRef = globalThis as unknown as { __zazaphi?: Engine };
const engine: Engine = globalRef.__zazaphi ?? (globalRef.__zazaphi = build());
export const orchestrator: Orchestrator = engine.orchestrator;
export const store: InMemoryProjectStore = engine.store;
