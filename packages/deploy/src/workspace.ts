import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const POLYFILL =
  "// Server-side safety net for generated client components that read\n" +
  "// localStorage during the first (server) render. Provides an in-memory\n" +
  "// stand-in when the real localStorage is absent (i.e. on the server) so the\n" +
  "// production prerender does not crash. The browser localStorage is used on\n" +
  "// the client.\n" +
  "if (typeof (globalThis as any).localStorage === \"undefined\") {\n" +
  "  const store = new Map();\n" +
  "  (globalThis as any).localStorage = {\n" +
  "    getItem(k) { return store.has(k) ? store.get(k) : null; },\n" +
  "    setItem(k, v) { store.set(k, String(v)); },\n" +
  "    removeItem(k) { store.delete(k); },\n" +
  "    clear() { store.clear(); },\n" +
  "    key(i) { return Array.from(store.keys())[i] ?? null; },\n" +
  "    get length() { return store.size; },\n" +
  "  };\n" +
  "}\n" +
  "export {};\n";

const LAYOUT =
  "import \"./zz-localstorage\";\n\n" +
  "export default function RootLayout({ children }: { children: React.ReactNode }) {\n" +
  "  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  );\n}\n";

/** Files that always come from us, so the project runs as Next.js regardless
 * of what the model emitted for them. The forced layout loads the server-side
 * localStorage stub before any page renders. */
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
  "app/layout.tsx": LAYOUT,
  "app/zz-localstorage.ts": POLYFILL,
};

/** Filled only if the generated project does not provide them. */
const FALLBACK: Record<string, string> = {
  "app/page.tsx": "export default function Page() {\n  return <main>Generated app</main>;\n}\n",
};

const SOURCE_FILE = /\.(tsx?|jsx?)$/;

/**
 * Repairs a mangled client-component directive: a bare `use client;` (or
 * `use client`) on the first non-empty line is rewritten to the required string
 * literal `'use client';`, so `next build` does not fail on a syntax error the
 * model occasionally emits. Anything already quoted is left untouched.
 */
export function normalizeClientDirective(content: string): string {
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length && (lines[i] ?? "").trim() === "") i += 1;
  const first = lines[i];
  if (first !== undefined && /^use\s+client\s*;?$/.test(first.trim())) {
    lines[i] = "'use client';";
    return lines.join("\n");
  }
  return content;
}

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
 * Materializes the project for a runnable preview: generated files first (with
 * the client-directive repair applied to source files), then fallback entry
 * files only where missing, then the runtime config + layout + localStorage stub
 * always forced — so `next build` / `next start` reliably boots a server.
 */
export async function materializeForPreview(
  workdir: string,
  fileMap: Record<string, string>,
): Promise<void> {
  await mkdir(workdir, { recursive: true });
  for (const [rel, content] of Object.entries(fileMap)) {
    const out = SOURCE_FILE.test(rel) ? normalizeClientDirective(content) : content;
    await writeInto(workdir, rel, out);
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
