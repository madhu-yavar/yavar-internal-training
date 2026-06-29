import { useEffect, useState } from "react";

type Question = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
  hint?: string;
  difficulty?: string;
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
  const [hintsShown, setHintsShown] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [current, setCurrent] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    setAnswers({});
    setHintsShown({});
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-card to-muted shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400">
              Final Assessment
            </div>
            <div className="text-base font-semibold text-card-foreground">
              Enterprise AI · 20-Question Quiz
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-muted px-3 py-1 text-xs text-card-foreground hover:bg-muted-foreground/20"
          >
            ✕ Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {!participant && (
            <form onSubmit={startQuiz} className="mx-auto max-w-md space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  Before you begin
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We need a few details to record your assessment. All fields are mandatory.
                </p>
              </div>

              {(["name", "employeeId", "email"] as const).map((field) => {
                const labels: Record<typeof field, string> = {
                  name: "Full name",
                  employeeId: "Employee ID",
                  email: "Official company email",
                };
                const placeholders: Record<typeof field, string> = {
                  name: "Jane Doe",
                  employeeId: "EMP-12345",
                  email: "jane.doe@yourcompany.com",
                };
                return (
                  <div key={field}>
                    <label className="mb-1 block text-xs uppercase tracking-wider text-card-foreground">
                      {labels[field]} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type={field === "email" ? "email" : "text"}
                      value={form[field]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [field]: e.target.value }))
                      }
                      placeholder={placeholders[field]}
                      maxLength={field === "name" ? 80 : field === "email" ? 120 : 40}
                      required
                      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-card-foreground outline-none transition focus:ring-2 ${
                        formErrors[field]
                          ? "border-rose-500/60 focus:ring-rose-400/30"
                          : "border-border focus:border-amber-400/60 focus:ring-amber-400/20"
                      }`}
                    />
                    {formErrors[field] && (
                      <p className="mt-1 text-xs text-rose-300">{formErrors[field]}</p>
                    )}
                  </div>
                );
              })}

              <p className="text-[11px] text-muted-foreground">
                Personal email domains (gmail, yahoo, outlook, etc.) are not accepted —
                please use your work email.
              </p>

              <button
                type="submit"
                className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
              >
                Continue to quiz →
              </button>
            </form>
          )}

          {participant && loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-card-foreground">
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
              <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Question {current + 1} of {questions.length}
                </span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">
                  {q.topic}
                </span>
              </div>
              <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${((current + 1) / questions.length) * 100}%` }}
                />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                {q.question}
              </h3>

              {(() => {
                const answered = answers[current] !== undefined;
                const hintShown = hintsShown[current];
                if (answered || !q.hint) return null;
                return (
                  <div className="mt-3">
                    {hintShown ? (
                      <div className="rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
                        💡 <span className="font-semibold">Hint:</span> {q.hint}
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setHintsShown((h) => ({ ...h, [current]: true }))
                        }
                        className="rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200 hover:bg-sky-500/20"
                      >
                        💡 Show hint
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="mt-4 space-y-2">
                {q.options.map((opt, i) => {
                  const chosen = answers[current] === i;
                  const answered = answers[current] !== undefined;
                  const isCorrect = i === q.answerIndex;
                  let cls =
                    "border-border bg-muted text-card-foreground hover:bg-muted-foreground/20";
                  if (answered) {
                    if (isCorrect)
                      cls =
                        "border-emerald-400 bg-emerald-500/15 text-emerald-100";
                    else if (chosen)
                      cls = "border-rose-400 bg-rose-500/15 text-rose-100";
                    else cls = "border-border bg-transparent text-muted-foreground";
                  } else if (chosen) {
                    cls = "border-amber-400 bg-amber-500/15 text-amber-100";
                  }
                  return (
                    <button
                      key={i}
                      disabled={answered}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [current]: i }))
                      }
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${cls} ${
                        answered ? "cursor-default" : ""
                      }`}
                    >
                      <span className="mr-2 font-semibold">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                      {answered && isCorrect && (
                        <span className="ml-2 text-xs">✓ correct</span>
                      )}
                      {answered && chosen && !isCorrect && (
                        <span className="ml-2 text-xs">✗ your pick</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {answers[current] !== undefined && (
                <div
                  className={`mt-4 rounded-lg border p-3 text-sm ${
                    answers[current] === q.answerIndex
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-100"
                  }`}
                >
                  <div className="font-semibold">
                    {answers[current] === q.answerIndex
                      ? "✅ Correct!"
                      : "❌ Not quite — let's learn this one"}
                  </div>
                  {answers[current] !== q.answerIndex && (
                    <div className="mt-1 text-xs text-card-foreground">
                      Correct answer:{" "}
                      <span className="font-semibold text-emerald-200">
                        {String.fromCharCode(65 + q.answerIndex)}.{" "}
                        {q.options[q.answerIndex]}
                      </span>
                    </div>
                  )}
                  {q.explanation && (
                    <div className="mt-2 text-xs leading-relaxed text-slate-100/90">
                      📘 {q.explanation}
                    </div>
                  )}
                </div>
              )}


              <div className="mt-6 flex items-center justify-between">
                <button
                  disabled={current === 0}
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-card-foreground disabled:opacity-30 hover:bg-muted-foreground/20"
                >
                  ← Prev
                </button>
                <div className="text-xs text-muted-foreground">
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
                  {participant?.name ? `Well done, ${participant.name.split(" ")[0]}!` : "Your Result"}
                </div>
                <div className="mt-2 text-5xl font-bold text-amber-100">
                  {score}/{questions.length}
                </div>
                <div className="mt-1 text-2xl font-semibold text-amber-200">{pct}%</div>
                <div className="mt-3 text-lg font-semibold text-card-foreground">
                  {badge.label}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{badge.note}</p>
                {participant && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {participant.name} · {participant.employeeId} · {participant.email}
                  </p>
                )}
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={load}
                    className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                  >
                    ↻ New quiz
                  </button>
                  <button
                    onClick={onClose}
                    className="rounded-md border border-border bg-muted px-4 py-1.5 text-sm text-card-foreground hover:bg-muted-foreground/20"
                  >
                    Done
                  </button>
                </div>
              </div>

              <h4 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
                      <div className="font-medium text-card-foreground">
                        {i + 1}. {qq.question}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
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
                      <div className="mt-1 text-xs text-muted-foreground">{qq.explanation}</div>
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
