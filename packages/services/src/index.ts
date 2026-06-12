import { ServiceManifest } from "@zazaphi/contracts";
import type { ArchitecturePlan } from "@zazaphi/contracts";
import type { ServicesPort } from "@zazaphi/core";

/**
 * Turns an architecture plan into a validated service_manifest. MVP emits
 * `mode: single`, but the manifest is produced either way so multi-service is a
 * later config change, not a rewrite. The compose generation lives in the full
 * @zazaphi/services implementation.
 */
export class ManifestBuilder implements ServicesPort {
  manifestFor(arch: ArchitecturePlan): ServiceManifest {
    if (arch.manifest) {
      return ServiceManifest.parse(arch.manifest);
    }
    return ServiceManifest.parse({
      mode: "single",
      services: [
        { name: "web", type: "web", framework: "nextjs", port: 3000, start_command: "npm run dev" },
        { name: "postgres", type: "database", image: "postgres:16" },
      ],
    });
  }
}
