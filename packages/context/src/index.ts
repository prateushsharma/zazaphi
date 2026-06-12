import type { TaskSpec, ContextPacket } from "@zazaphi/contracts";
import type { ContextPort, ProjectMemory } from "@zazaphi/core";

const STATIC_PREFIX_ID = "zazaphi.system.v1";
const MAX_FILES = 4;

/**
 * Assembles the smallest context that can satisfy a task. It never sends the
 * full repo: it selects the task's target files at the lowest fidelity that
 * works and attaches a short project + schema summary. The static prefix id is
 * fixed so the cacheable system prefix stays first and identical across calls.
 *
 * Retrieval ranking, fidelity selection and the memory tiers are filled in by
 * the @zazaphi/context implementation. This stub keeps the contract honest.
 */
export class StubContextBuilder implements ContextPort {
  build(
    task: TaskSpec,
    project: ProjectMemory,
    options: { includeErrors?: boolean } = {},
  ): ContextPacket {
    const relevant = task.target_files
      .slice(0, MAX_FILES)
      .map((path) => ({
        path,
        mode: "signature" as const,
        content: project.fileMap[path] ?? "",
      }));

    return {
      static_prefix_id: STATIC_PREFIX_ID,
      project_summary: project.spec.summary,
      current_task: {
        task_id: task.task_id,
        title: task.title,
        constraints: task.constraints,
      },
      schema_summary: project.schema?.summary ?? "",
      relevant_files: relevant,
      recent_errors: options.includeErrors ? project.recentErrors.slice(0, 3) : [],
    };
  }
}
