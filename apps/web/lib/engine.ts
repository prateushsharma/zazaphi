import { ProjectSpec } from "@zazaphi/contracts";
import { Orchestrator, InMemoryProjectStore, SilentLogger } from "@zazaphi/core";
import type { OrchestratorPorts } from "@zazaphi/core";
import { createGateway } from "@zazaphi/gateway";
import { StubContextBuilder } from "@zazaphi/context";
import { DefaultEconomics } from "@zazaphi/economics";
import { StubSandbox } from "@zazaphi/sandbox";
import { ManifestBuilder } from "@zazaphi/services";
import { StubDeploy } from "@zazaphi/deploy";

const PLACEHOLDER = ProjectSpec.parse({
  project_id: "proj_pending",
  name: "pending",
  summary: "",
  stack: "",
});

function build(): Orchestrator {
  const ports: OrchestratorPorts = {
    gateway: createGateway(),
    context: new StubContextBuilder(),
    economics: new DefaultEconomics(),
    sandbox: new StubSandbox(true),
    services: new ManifestBuilder(),
    deploy: new StubDeploy(),
    store: new InMemoryProjectStore(PLACEHOLDER),
    logger: new SilentLogger(),
  };
  return new Orchestrator(ports);
}

const globalRef = globalThis as unknown as { __zazaphi?: Orchestrator };
export const orchestrator: Orchestrator = globalRef.__zazaphi ?? (globalRef.__zazaphi = build());
