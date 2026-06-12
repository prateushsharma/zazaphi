"use client";

import { useState } from "react";

type TaskResult = {
  task: { task_id: string; title: string; type: string };
  status: string;
  attempts: number;
};
type RunResult = {
  run_id: string;
  spec: { name: string; summary: string; stack: string; features: string[] };
  architecture: { summary: string; routes: string[]; components: string[] };
  manifest: { mode: string; services: { name: string; type: string }[] };
  tasks: TaskResult[];
  preview: { url: string };
  production?: { url: string };
  awaiting_approval: boolean;
  cost: { input_tokens: number; output_tokens: number; cached_tokens: number; calls: number };
};

const STAGES = [
  { key: "requirement", label: "Requirement", desc: "deriving product spec" },
  { key: "architecture", label: "Architecture", desc: "designing technical plan" },
  { key: "schema", label: "Schema", desc: "designing database" },
  { key: "planner", label: "Planner", desc: "breaking into tasks" },
  { key: "build", label: "Build", desc: "generating + sandboxing" },
  { key: "preview", label: "Preview", desc: "publishing preview" },
];

const EXAMPLES = [
  "A CRM for freelancers with clients, invoices and a dashboard",
  "A habit tracker with streaks and weekly charts",
  "A team wiki with markdown pages and search",
];

const NAV = [
  { key: "build", label: "New build", icon: "M12 5v14M5 12h14" },
  { key: "builds", label: "Builds", icon: "M4 6h16M4 12h16M4 18h10" },
  { key: "templates", label: "Templates", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { key: "cost", label: "Cost", icon: "M3 3v18h18M7 14l4-4 3 3 5-6" },
  { key: "settings", label: "Settings", icon: "M12 8a4 4 0 100 8 4 4 0 000-8z" },
];

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState("medium");
  const [framework, setFramework] = useState("Next.js");
  const [phase, setPhase] = useState("idle" as "idle" | "running" | "done");
  const [activeStage, setActiveStage] = useState(-1);
  const [result, setResult] = useState(null as RunResult | null);
  const [deploying, setDeploying] = useState(false);
  const [nav, setNav] = useState("build");
  const [error, setError] = useState(null as string | null);

  async function runBuild() {
    if (!prompt.trim() || phase === "running") return;
    setError(null);
    setResult(null);
    setPhase("running");
    setActiveStage(0);

    const stepper = setInterval(() => {
      setActiveStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 520);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = (await res.json()) as RunResult & { error?: string };
      await new Promise((r) => setTimeout(r, 900));
      clearInterval(stepper);
      if (!res.ok) throw new Error(data.error ?? "build failed");
      setActiveStage(STAGES.length);
      setResult(data);
      setPhase("done");
    } catch (e) {
      clearInterval(stepper);
      setError(String(e instanceof Error ? e.message : e));
      setPhase("idle");
      setActiveStage(-1);
    }
  }

  async function approve(ok: boolean) {
    if (!result) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ run_id: result.run_id, approved: ok }),
      });
      const data = (await res.json()) as RunResult;
      setResult(data);
    } finally {
      setDeploying(false);
    }
  }

  function reset() {
    setPhase("idle");
    setActiveStage(-1);
    setResult(null);
    setPrompt("");
    setError(null);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, borderRight: "1px solid var(--border)", padding: 20, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, var(--accent), var(--accent-2))", display: "grid", placeItems: "center", fontWeight: 800 }}>Z</div>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>ZaZaPHI</div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((n) => (
            <div key={n.key} className={`nav-item ${nav === n.key ? "active" : ""}`} onClick={() => setNav(n.key)}>
              <Icon d={n.icon} /> {n.label}
            </div>
          ))}
        </nav>
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Engine</div>
            <div className="pill pill-green"><span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--green)" }} /> Groq · connected</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "24px 32px", maxWidth: 1100 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
              {nav === "build" ? <>Build an app with <span className="gradient-text">ZaZaPHI</span></> : NAV.find((n) => n.key === nav)?.label}
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>The orchestration layer is the product.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="pill pill-violet">v0.1 · MVP</div>
            <div style={{ width: 34, height: 34, borderRadius: 999, background: "var(--panel-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 }}>PS</div>
          </div>
        </header>

        {nav !== "build" && (
          <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 15 }}>{NAV.find((n) => n.key === nav)?.label} — coming in a later build.</div>
          </div>
        )}

        {nav === "build" && (
          <>
            {/* Prompt */}
            <section className="card" style={{ padding: 20, marginBottom: 20 }}>
              <textarea
                className="input" rows={3} placeholder="Describe the app you want to build…"
                value={prompt} onChange={(e) => setPrompt(e.target.value)}
                disabled={phase === "running"}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {EXAMPLES.map((ex) => (
                  <button key={ex} className="pill" style={{ cursor: "pointer", background: "var(--bg-2)" }}
                    onClick={() => setPrompt(ex)} disabled={phase === "running"}>{ex.slice(0, 38)}…</button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <Select label="Model" value={tier} onChange={setTier} options={["small", "medium", "strong"]} />
                  <Select label="Framework" value={framework} onChange={setFramework} options={["Next.js", "Remix", "Astro"]} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {phase === "done" && <button className="btn btn-ghost" onClick={reset}>New build</button>}
                  <button className="btn btn-primary" onClick={runBuild} disabled={phase === "running" || !prompt.trim()}>
                    {phase === "running" ? <><span className="spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: 999 }} /> Building…</> : <><Icon d="M5 3l14 9-14 9V3z" size={14} /> Build app</>}
                  </button>
                </div>
              </div>
              {error && <div style={{ marginTop: 12, color: "var(--red)", fontSize: 13 }}>✖ {error}</div>}
            </section>

            {/* Pipeline */}
            {phase !== "idle" && (
              <section className="card rise" style={{ padding: 20, marginBottom: 20 }}>
                <SectionTitle>Pipeline</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {STAGES.map((st, i) => {
                    const state = i < activeStage ? "done" : i === activeStage && phase === "running" ? "active" : i < activeStage || phase === "done" ? "done" : "wait";
                    return (
                      <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0" }}>
                        <div className={`stage-dot ${state === "active" ? "pulsing" : ""}`} style={{ background: state === "done" ? "rgba(52,211,153,.15)" : state === "active" ? "rgba(168,85,247,.18)" : "var(--panel-2)", color: state === "done" ? "var(--green)" : state === "active" ? "var(--accent)" : "var(--faint)", border: "1px solid " + (state === "wait" ? "var(--border)" : "transparent") }}>
                          {state === "done" ? <Icon d="M5 13l4 4L19 7" size={13} /> : state === "active" ? <span className="spin" style={{ width: 11, height: 11, border: "2px solid rgba(168,85,247,.35)", borderTopColor: "var(--accent)", borderRadius: 999 }} /> : <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--faint)" }} />}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, width: 120, color: state === "wait" ? "var(--faint)" : "var(--text)" }}>{st.label}</div>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>{st.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Results */}
            {result && phase === "done" && (
              <div className="rise" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <section className="card" style={{ padding: 20, gridColumn: "1 / -1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <SectionTitle>{result.spec.name}</SectionTitle>
                      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 10px", maxWidth: 560 }}>{result.spec.summary}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {result.spec.features.map((f) => <span key={f} className="pill" style={{ color: "var(--muted)" }}>{f}</span>)}
                      </div>
                    </div>
                    <div className="pill pill-violet mono">{result.spec.stack}</div>
                  </div>
                </section>

                <Stat label="Calls" value={String(result.cost.calls)} />
                <Stat label="Tokens in" value={result.cost.input_tokens.toLocaleString()} />
                <Stat label="Tokens out" value={result.cost.output_tokens.toLocaleString()} />
                <Stat label="Cached" value={result.cost.cached_tokens.toLocaleString()} accent />

                <section className="card" style={{ padding: 20 }}>
                  <SectionTitle>Tasks</SectionTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.tasks.map((t) => (
                      <div key={t.task.task_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "var(--green)" }}><Icon d="M5 13l4 4L19 7" size={15} /></span>
                        <span className="mono" style={{ fontSize: 12, color: "var(--faint)", width: 48 }}>{t.task.task_id}</span>
                        <span style={{ fontSize: 14, flex: 1 }}>{t.task.title}</span>
                        {t.attempts > 0 && <span className="pill pill-amber">{t.attempts} repair</span>}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card" style={{ padding: 20 }}>
                  <SectionTitle>Services</SectionTitle>
                  <div className="pill pill-violet" style={{ marginBottom: 12 }}>mode: {result.manifest.mode}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.manifest.services.map((s) => (
                      <div key={s.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                        <span className="mono">{s.name}</span><span style={{ color: "var(--muted)" }}>{s.type}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Deploy */}
                <section className="card" style={{ padding: 20, gridColumn: "1 / -1", borderColor: result.production ? "rgba(52,211,153,.4)" : "var(--border-2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                    <div>
                      <SectionTitle>{result.production ? "Live" : "Preview ready"}</SectionTitle>
                      <a className="mono" href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--cyan)", fontSize: 14, textDecoration: "none" }}>
                        {result.production?.url ?? result.preview.url}
                      </a>
                      <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>
                        {result.production ? "deployed to production" : "production deploy is gated — needs approval"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn btn-ghost">Open preview</button>
                      {result.awaiting_approval && !result.production ? (
                        <>
                          <button className="btn btn-danger" onClick={() => approve(false)} disabled={deploying}>Reject</button>
                          <button className="btn btn-primary" onClick={() => approve(true)} disabled={deploying}>
                            {deploying ? "Deploying…" : "Approve & deploy"}
                          </button>
                        </>
                      ) : result.production ? (
                        <span className="pill pill-green"><Icon d="M5 13l4 4L19 7" size={13} /> deployed</span>
                      ) : null}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--faint)", marginBottom: 14 }}>{children}</div>;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <section className="card" style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: accent ? "var(--green)" : "var(--text)" }}>{value}</div>
    </section>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ background: "var(--bg-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13 }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
