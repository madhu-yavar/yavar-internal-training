import { useEffect, useState } from "react";

type Question = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
};

type Participant = { name: string; employeeId: string; email: string };

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "rediffmail.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
]);

export function TrainingQuiz({ onClose }: { onClose: () => void }) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [form, setForm] = useState<Participant>({ name: "", employeeId: "", email: "" });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Participant, string>>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [current, setCurrent] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    setAnswers({});
    setSubmitted(false);
    setCurrent(0);
    try {
      const r = await fetch("/api/quiz", { method: "POST" });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { questions: Question[] };
      setQuestions(data.questions);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errs: Partial<Record<keyof Participant, string>> = {};
    const name = form.name.trim();
    const employeeId = form.employeeId.trim();
    const email = form.email.trim().toLowerCase();

    if (name.length < 2) errs.name = "Please enter your full name";
    else if (name.length > 80) errs.name = "Name is too long";

    if (employeeId.length < 2) errs.employeeId = "Employee ID is required";
    else if (employeeId.length > 40) errs.employeeId = "Employee ID is too long";

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) errs.email = "Enter a valid email address";
    else {
      const domain = email.split("@")[1];
      if (FREE_EMAIL_DOMAINS.has(domain)) {
        errs.email = "Please use your official company email (not a personal one)";
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const startQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setParticipant({
      name: form.name.trim(),
      employeeId: form.employeeId.trim(),
      email: form.email.trim().toLowerCase(),
    });
  };

  useEffect(() => {
    if (participant) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant]);

  const score = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0),
    0,
  );
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;

  const badge =
    pct >= 90
      ? { label: "AI Architect 🏆", note: "Outstanding! You could lead a private-LLM deal end-to-end." }
      : pct >= 75
      ? { label: "Solution Champion 🥇", note: "Excellent grasp of the stack and presales narrative." }
      : pct >= 60
      ? { label: "Rising Specialist 🥈", note: "Strong foundation. Brush up the weak topics and retake." }
      : pct >= 40
      ? { label: "Practitioner 🥉", note: "Good start. Revisit RAG, runtimes, and TCO sections." }
      : { label: "Learner 📘", note: "Re-watch the deck — you've got this. Try again!" };

  const q = questions[current];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400">
              Final Assessment
            </div>
            <div className="text-base font-semibold text-slate-100">
              Enterprise AI · 20-Question Quiz
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
          >
            ✕ Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-300">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <div className="text-sm">Generating 20 fresh questions just for you…</div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
              <button
                onClick={load}
                className="ml-3 rounded bg-rose-500/20 px-2 py-0.5 text-xs hover:bg-rose-500/30"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && !submitted && q && (
            <div>
              <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Question {current + 1} of {questions.length}
                </span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">
                  {q.topic}
                </span>
              </div>
              <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${((current + 1) / questions.length) * 100}%` }}
                />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-100">
                {q.question}
              </h3>
              <div className="mt-4 space-y-2">
                {q.options.map((opt, i) => {
                  const chosen = answers[current] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswers((a) => ({ ...a, [current]: i }))}
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                        chosen
                          ? "border-amber-400 bg-amber-500/15 text-amber-100"
                          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      <span className="mr-2 font-semibold">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  disabled={current === 0}
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm disabled:opacity-30 hover:bg-white/10"
                >
                  ← Prev
                </button>
                <div className="text-xs text-slate-400">
                  Answered: {Object.keys(answers).length}/{questions.length}
                </div>
                {current < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrent((c) => c + 1)}
                    className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    disabled={Object.keys(answers).length < questions.length}
                    onClick={() => setSubmitted(true)}
                    className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-30 hover:bg-emerald-400"
                  >
                    Submit ✓
                  </button>
                )}
              </div>
            </div>
          )}

          {submitted && (
            <div>
              <div className="rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-6 text-center">
                <div className="text-[11px] uppercase tracking-[0.25em] text-amber-300">
                  Your Result
                </div>
                <div className="mt-2 text-5xl font-bold text-amber-100">
                  {score}/{questions.length}
                </div>
                <div className="mt-1 text-2xl font-semibold text-amber-200">{pct}%</div>
                <div className="mt-3 text-lg font-semibold text-slate-100">
                  {badge.label}
                </div>
                <p className="mt-1 text-sm text-slate-300">{badge.note}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={load}
                    className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                  >
                    ↻ New quiz
                  </button>
                  <button
                    onClick={onClose}
                    className="rounded-md border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-200 hover:bg-white/10"
                  >
                    Done
                  </button>
                </div>
              </div>

              <h4 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Review
              </h4>
              <ol className="space-y-3">
                {questions.map((qq, i) => {
                  const userIdx = answers[i];
                  const correct = userIdx === qq.answerIndex;
                  return (
                    <li
                      key={i}
                      className={`rounded-lg border p-3 text-sm ${
                        correct
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-rose-500/30 bg-rose-500/5"
                      }`}
                    >
                      <div className="font-medium text-slate-100">
                        {i + 1}. {qq.question}
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        Your answer:{" "}
                        <span className={correct ? "text-emerald-300" : "text-rose-300"}>
                          {qq.options[userIdx] ?? "—"}
                        </span>
                        {!correct && (
                          <>
                            {" · Correct: "}
                            <span className="text-emerald-300">
                              {qq.options[qq.answerIndex]}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{qq.explanation}</div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
