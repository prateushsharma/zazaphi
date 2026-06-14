import type { TaskSpec, ContextPacket, RelevantFile } from "@zazaphi/contracts";
import type { ContextPort, ProjectMemory } from "@zazaphi/core";

const STATIC_PREFIX_ID = "zazaphi.system.v1";
const MAX_FILES = 6;
const MAX_FILE_CHARS = 4000;

function clip(content: string): string {
  return content.length > MAX_FILE_CHARS
    ? `${content.slice(0, MAX_FILE_CHARS)}\n/* ...truncated... */`
    : content;
}

/**
 * Assembles the context for one task. It pins the chosen stack and architecture
 * into the summary and surfaces the project's actual files so far (target files
 * first, then the rest of the file map) at full fidelity — so each task builds
 * on prior work instead of generating blind. It never sends more than a capped
 * set of files. The static prefix id is fixed so the cacheable system prefix
 * stays first and identical across calls.
 */
export class StubContextBuilder implements ContextPort {
  build(
    task: TaskSpec,
    project: ProjectMemory,
    options: { includeErrors?: boolean } = {},
  ): ContextPacket {
    const stack = project.spec.stack ? ` Stack: ${project.spec.stack}.` : "";
    const arch = project.architecture ? ` Architecture: ${project.architecture.summary}.` : "";
    const projectSummary = `${project.spec.summary}${stack}${arch}`.trim();

    const order = [
      ...task.target_files,
      ...Object.keys(project.fileMap).filter((p) => !task.target_files.includes(p)),
    ];
    const seen = new Set<string>();
    const relevant: RelevantFile[] = [];
    for (const path of order) {
      if (seen.has(path) || relevant.length >= MAX_FILES) continue;
      seen.add(path);
      relevant.push({ path, mode: "full", content: clip(project.fileMap[path] ?? "") });
    }

    return {
      static_prefix_id: STATIC_PREFIX_ID,
      project_summary: projectSummary,
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
