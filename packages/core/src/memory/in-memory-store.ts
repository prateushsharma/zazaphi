import type {
  ProjectSpec,
  ArchitecturePlan,
  DatabaseSchema,
  ServiceManifest,
  GeneratedFile,
} from "@zazaphi/contracts";
import type { ProjectMemory, ProjectStorePort } from "../ports.js";

const MAX_RECENT_ERRORS = 10;

export class InMemoryProjectStore implements ProjectStorePort {
  private memory: ProjectMemory;

  constructor(spec: ProjectSpec) {
    this.memory = { spec, fileMap: {}, recentErrors: [] };
  }

  load(): ProjectMemory {
    return this.memory;
  }

  saveSpec(spec: ProjectSpec): void {
    this.memory.spec = spec;
  }

  saveArchitecture(arch: ArchitecturePlan, manifest: ServiceManifest): void {
    this.memory.architecture = arch;
    this.memory.manifest = manifest;
  }

  saveSchema(schema: DatabaseSchema): void {
    this.memory.schema = schema;
  }

  recordFiles(files: GeneratedFile[]): void {
    for (const file of files) {
      this.memory.fileMap[file.path] = file.content;
    }
  }

  recordError(error: string): void {
    this.memory.recentErrors.unshift(error);
    this.memory.recentErrors = this.memory.recentErrors.slice(0, MAX_RECENT_ERRORS);
  }
}
