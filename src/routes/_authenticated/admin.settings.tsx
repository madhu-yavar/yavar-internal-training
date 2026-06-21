import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuthCtx } from "@/lib/auth-context";
import { getAdminSettings, saveGlobalTemplate } from "@/lib/narration.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  const fetchSettings = useServerFn(getAdminSettings);
  const saveTpl = useServerFn(saveGlobalTemplate);

  const [template, setTemplate] = useState<string>("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) navigate({ to: "/learn" });
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const s = await fetchSettings();
        setTemplate(s.template);
        setHasGeminiKey(s.hasGeminiKey);
        setUpdatedAt(s.updatedAt);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, fetchSettings]);

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
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {err && <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{err}</div>}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-base font-semibold">Generation model</h2>
          <p className="mt-1 text-xs text-slate-400">
            When a Google Gemini API key is set, narrations are generated with <strong>Gemini 3.1 Pro Preview</strong> using your own key.
            Otherwise we fall back to Lovable's Gemini Flash gateway.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                hasGeminiKey ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/60 text-slate-300"
              }`}
            >
              {hasGeminiKey ? "✓ Gemini 3.1 Pro active (your key)" : "Using Lovable Gemini Flash (fallback)"}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            To add or rotate your <code className="text-slate-300">GEMINI_API_KEY</code>, ask the assistant to add the secret —
            you'll get a secure form to paste it. The key is never shown in chat or code.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Global narration prompt template</h2>
              <p className="mt-1 text-xs text-slate-400">
                Placeholders: <code>{`{{courseTitle}}`}</code> <code>{`{{tone}}`}</code> <code>{`{{audience}}`}</code>{" "}
                <code>{`{{depth}}`}</code> <code>{`{{slideCount}}`}</code> <code>{`{{deck}}`}</code>.
                The model MUST return JSON like <code>{`{"narrations":[...],"keywords":[[...]]}`}</code>.
              </p>
              {updatedAt && <p className="mt-1 text-xs text-slate-500">Last updated {new Date(updatedAt).toLocaleString()}</p>}
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
            rows={18}
            className="mt-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-amber-400"
            placeholder="Loading…"
          />
        </section>
      </main>
    </div>
  );
}
