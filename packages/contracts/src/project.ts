import { z } from "zod";
import { ProjectId, RunId } from "./common.js";
import { ServiceManifest } from "./service-manifest.js";

export const ProjectSpec = z.object({
  project_id: ProjectId,
  name: z.string(),
  summary: z.string(),
  stack: z.string(),
  features: z.array(z.string()).default([]),
});
export type ProjectSpec = z.infer<typeof ProjectSpec>;

export const ArchitecturePlan = z.object({
  summary: z.string(),
  routes: z.array(z.string()).default([]),
  components: z.array(z.string()).default([]),
  manifest: ServiceManifest,
});
export type ArchitecturePlan = z.infer<typeof ArchitecturePlan>;

export const DatabaseSchema = z.object({
  summary: z.string(),
  tables: z.array(z.string()).default([]),
});
export type DatabaseSchema = z.infer<typeof DatabaseSchema>;

export const DeployStage = z.enum(["preview", "production"]);
export type DeployStage = z.infer<typeof DeployStage>;

export const DeployResult = z.object({
  run_id: RunId,
  stage: DeployStage,
  url: z.string().url(),
  approved: z.boolean(),
});
export type DeployResult = z.infer<typeof DeployResult>;
