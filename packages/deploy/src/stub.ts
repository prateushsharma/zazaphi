import { DeployResult } from "@zazaphi/contracts";
import type { RunId } from "@zazaphi/contracts";
import type { DeployPort } from "@zazaphi/core";

/** Offline deploy used when ZAZAPHI_DEPLOY=stub. Returns plausible URLs. */
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
