import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuthCtx } from "@/lib/auth-context";
import {
  getAdminSettings,
  saveGlobalTemplate,
  getRecentGenerationLogs,
} from "@/lib/narration.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

type LogRow = {
  id: string;
  created_at: string;
  kind: string;
  model: string;
  provider: string;
  status: string;
  detail: string | null;
  slide_count: number | null;
  duration_ms: number | null;
  course_id: string | null;
};

type Settings = Awaited<ReturnType<typeof getAdminSettings>>;

function AdminSettings() {
  const { isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  const fetchSettings = useServerFn(getAdminSettings);
  const fetchLogs = useServerFn(getRecentGenerationLogs);
  const saveTpl = useServerFn(saveGlobalTemplate);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [template, setTemplate] = useState<string>("");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) navigate({ to: "/learn" });
  }, [isAdmin, navigate]);

  async function refresh() {
    try {
      const [s, l] = await Promise.all([fetchSettings(), fetchLogs()]);
      setSettings(s);
      setTemplate(s.template);
      setLogs((l.logs as LogRow[]) ?? []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) return null;

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      await saveTpl({ data: { template } });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link to="/admin" className="text-xs text-slate-400 hover:text-amber-300">← Back to admin</Link>
            <h1 className="text-lg font-semibold">Admin settings</h1>
          </div>
          <button
            onClick={() => void refresh()}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-amber-400"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {err && <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{err}</div>}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-base font-semibold">Narration model in use</h2>
            <p className="mt-1 text-xs text-slate-400">Used for every slide narration, regeneration and course description.</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Provider</span>
                <span className="font-medium">{settings?.narrationModel.provider ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Model</span>
                <code className="rounded bg-slate-800 px-2 py-0.5 text-xs">{settings?.narrationModel.model ?? "—"}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Admin key</span>
                <span className={settings?.hasGeminiKey ? "text-emerald-300" : "text-amber-300"}>
                  {settings?.hasGeminiKey ? "✓ GEMINI_API_KEY set" : "Not set — falling back to Lovable Flash"}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              To rotate <code className="text-slate-300">GEMINI_API_KEY</code>, ask the assistant to update the secret — never shown in chat.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-base font-semibold">Text-to-speech in use</h2>
            <p className="mt-1 text-xs text-slate-400">Single source of truth — no browser fallback, no other vendors.</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Provider</span>
                <span className="font-medium">{settings?.tts.provider ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Endpoint</span>
                <code className="truncate rounded bg-slate-800 px-2 py-0.5 text-xs">{settings?.tts.endpoint ?? "—"}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Voice</span>
                <code className="rounded bg-slate-800 px-2 py-0.5 text-xs">{settings?.tts.voice ?? "—"}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sample rate</span>
                <span className="text-xs">{settings?.tts.sampleRate ?? "—"} Hz</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Global narration prompt template</h2>
              <p className="mt-1 text-xs text-slate-400">
                Placeholders: <code>{`{{courseTitle}}`}</code> <code>{`{{tone}}`}</code> <code>{`{{audience}}`}</code>{" "}
                <code>{`{{depth}}`}</code> <code>{`{{slideCount}}`}</code> <code>{`{{deck}}`}</code>.
                Must return <code>{`{"narrations":[...],"keywords":[[...]]}`}</code>.
              </p>
              {settings?.updatedAt && (
                <p className="mt-1 text-xs text-slate-500">Last updated {new Date(settings.updatedAt).toLocaleString()}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {savedAt && <span className="text-emerald-400">Saved {savedAt}</span>}
              <button
                onClick={save}
                disabled={saving || loading}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save template"}
              </button>
            </div>
          </div>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            disabled={loading}
            rows={14}
            className="mt-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-amber-400"
            placeholder="Loading…"
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent generation events</h2>
            <span className="text-xs text-slate-500">Last 50 calls</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Kind</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3">Slides</th>
                  <th className="py-2 pr-3">Latency</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-slate-500">No generation events yet.</td></tr>
                )}
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-800/60 align-top">
                    <td className="py-2 pr-3 text-slate-300">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{l.kind}</td>
                    <td className="py-2 pr-3 text-slate-300">{l.provider}</td>
                    <td className="py-2 pr-3"><code className="rounded bg-slate-800 px-1.5 py-0.5">{l.model}</code></td>
                    <td className="py-2 pr-3">{l.slide_count ?? "—"}</td>
                    <td className="py-2 pr-3">{l.duration_ms != null ? `${l.duration_ms} ms` : "—"}</td>
                    <td className="py-2 pr-3">
                      {l.status === "ok" ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">ok</span>
                      ) : (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-300" title={l.detail ?? ""}>error</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
