import { z } from "zod";

export const ServiceType = z.enum(["web", "api", "worker", "cache", "database"]);
export type ServiceType = z.infer<typeof ServiceType>;

export const ServiceDefinition = z.object({
  name: z.string().min(1),
  type: ServiceType,
  framework: z.string().optional(),
  image: z.string().optional(),
  port: z.number().int().positive().optional(),
  start_command: z.string().optional(),
});
export type ServiceDefinition = z.infer<typeof ServiceDefinition>;

export const ServiceManifest = z.object({
  mode: z.enum(["single", "multi"]),
  services: z.array(ServiceDefinition).min(1),
});
export type ServiceManifest = z.infer<typeof ServiceManifest>;
