import { useState } from "react";
import { supabase } from "@/integrations/supabase/external";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  courseId?: string | null;
  defaultType?: "new_course" | "correction" | "question";
  defaultSubject?: string;
};

export function MessageAdminDialog({ open, onClose, userId, courseId, defaultType = "question", defaultSubject = "" }: Props) {
  const [type, setType] = useState(defaultType);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    if (!subject.trim() || !body.trim()) return;
    setSubmitting(true);
    setErr(null);
    const { error } = await supabase.from("course_requests").insert({
      user_id: userId,
      course_id: courseId ?? null,
      type,
      subject: subject.trim(),
      body: body.trim(),
    });
    setSubmitting(false);
    if (error) { setErr(error.message); return; }
    setSent(true);
    setSubject(""); setBody("");
    setTimeout(() => { setSent(false); onClose(); }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl border border-amber-400/30 bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400">Message the Ari team</div>
            <h3 className="text-base font-semibold text-card-foreground">Request a course or correction</h3>
          </div>
          <button onClick={onClose} className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-card-foreground hover:bg-muted-foreground/20">✕</button>
        </div>

        {sent ? (
          <div className="mt-6 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4 text-center text-sm text-emerald-100">
            ✅ Sent — we'll get back to you soon.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-xs text-muted-foreground">Type
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-amber-400">
                <option value="new_course">Request a new course</option>
                <option value="correction">Suggest a correction</option>
                <option value="question">General question</option>
              </select>
            </label>
            <label className="block text-xs text-muted-foreground">Subject
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-400" />
            </label>
            <label className="block text-xs text-muted-foreground">Message
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Tell us what you need…" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-400" />
            </label>
            {err && <div className="text-xs text-rose-300">{err}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="rounded-md border border-border bg-muted px-3 py-1.5 text-xs text-card-foreground hover:bg-muted-foreground/20">Cancel</button>
              <button onClick={submit} disabled={submitting || !subject.trim() || !body.trim()} className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-40">
                {submitting ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
