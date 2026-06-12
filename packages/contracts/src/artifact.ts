import { z } from "zod";
import { FileMode } from "./common.js";

export const GeneratedFile = z.object({
  path: z.string().min(1),
  content: z.string(),
  mode: FileMode.default("full"),
});
export type GeneratedFile = z.infer<typeof GeneratedFile>;

export const PatchSet = z.object({
  files: z.array(GeneratedFile),
  rationale: z.string().default(""),
});
export type PatchSet = z.infer<typeof PatchSet>;
