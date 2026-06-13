import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, sep } from "node:path";

/** Files that always come from us, so the project runs as Next.js regardless
 * of what the model emitted for them. */
const RUNTIME: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "zazaphi-generated-app",
      private: true,
      version: "0.1.0",
      scripts: {
        dev: "next dev -H 0.0.0.0 -p 3000",
        build: "next build",
        start: "next start -H 0.0.0.0 -p 3000",
      },
      dependencies: { next: "14.2.5", react: "18.3.1", "react-dom": "18.3.1" },
      devDependencies: {
        typescript: "5.5.4",
        "@types/node": "20.14.0",
        "@types/react": "18.3.3",
        "@types/react-dom": "18.3.0",
      },
    },
    null,
    2,
  ),
  "next.config.mjs":
    "/** @type {import('next').NextConfig} */\n" +
    "const nextConfig = {\n" +
    "  typescript: { ignoreBuildErrors: true },\n" +
    "  eslint: { ignoreDuringBuilds: true },\n" +
    "};\n" +
    "export default nextConfig;\n",
  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "ES2022"],
        allowJs: true,
        skipLibCheck: true,
        strict: false,
        noEmit: true,
        esModuleInterop: true,
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "preserve",
        plugins: [{ name: "next" }],
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    },
    null,
    2,
  ),
};

/** Filled only if the generated project does not provide them. */
const FALLBACK: Record<string, string> = {
  "app/layout.tsx":
    "export default function RootLayout({ children }: { children: React.ReactNode }) {\n" +
    "  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  );\n}\n",
  "app/page.tsx": "export default function Page() {\n  return <main>Generated app</main>;\n}\n",
};

function safeJoin(root: string, rel: string): string {
  const target = resolve(root, rel);
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`unsafe path rejected: ${rel}`);
  }
  return target;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function writeInto(root: string, rel: string, content: string): Promise<void> {
  const target = safeJoin(root, rel);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

/**
 * Materializes the project for a runnable preview: generated files first, then
 * fallback entry files only where missing, then the runtime config files always
 * forced — so `next dev` / `next start` reliably boots a server.
 */
export async function materializeForPreview(
  workdir: string,
  fileMap: Record<string, string>,
): Promise<void> {
  await mkdir(workdir, { recursive: true });
  for (const [rel, content] of Object.entries(fileMap)) {
    await writeInto(workdir, rel, content);
  }
  for (const [rel, content] of Object.entries(FALLBACK)) {
    if (!(await exists(safeJoin(workdir, rel)))) {
      await writeInto(workdir, rel, content);
    }
  }
  for (const [rel, content] of Object.entries(RUNTIME)) {
    await writeInto(workdir, rel, content);
  }
}
