import { DeployResult } from "@zazaphi/contracts";
import type { RunId } from "@zazaphi/contracts";
import type { DeployPort } from "@zazaphi/core";

/**
 * Preview is published automatically. Production requires explicit approval —
 * the orchestrator passes the approval decision through here and nothing ships
 * without it. Real env-var injection, GitHub push and rollback live in the full
 * @zazaphi/deploy implementation.
 */
export class StubDeploy implements DeployPort {
  async preview(runId: RunId): Promise<DeployResult> {
    return DeployResult.parse({
      run_id: runId,
      stage: "preview",
      url: `https://preview.zazaphi.app/${runId}`,
      approved: true,
    });
  }

  async deployProduction(runId: RunId, approved: boolean): Promise<DeployResult> {
    if (!approved) {
      return DeployResult.parse({
        run_id: runId,
        stage: "preview",
        url: `https://preview.zazaphi.app/${runId}`,
        approved: false,
      });
    }
    return DeployResult.parse({
      run_id: runId,
      stage: "production",
      url: `https://${runId}.zazaphi.app`,
      approved: true,
    });
  }
}
