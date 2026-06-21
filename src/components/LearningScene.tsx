import { useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { iconForKeyword } from "@/lib/iconMap";

type Props = {
  slideIdx: number;
  title: string;
  bullets: string[];
  revealed: number;
  speaking: boolean;
  currentLine: string;
  accent: string;
  illustrationUrl?: string | null;
  iconKeywords?: string[] | null;
};

const FALLBACK_ICONS = ["sparkles", "diamond", "triangle", "circle", "square", "star", "zap", "flame"];

function toPascal(name: string) {
  return name.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Comp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>)[toPascal(name)]
    ?? LucideIcons.Sparkles;
  return <Comp className={className} />;
}

function iconAt(i: number, keywords?: string[] | null) {
  const kw = keywords?.[i % (keywords?.length || 1)];
  return iconForKeyword(kw ?? FALLBACK_ICONS[i % FALLBACK_ICONS.length]);
}

const SCENE_LABELS = ["Concept", "How it works", "Capabilities", "Example", "Key takeaway"];

const ACCENT_TEXT: Record<string, string> = {
  amber: "text-amber-300",
  sky: "text-sky-300",
  emerald: "text-emerald-300",
  rose: "text-rose-300",
  cyan: "text-cyan-300",
  violet: "text-violet-300",
};

const ACCENT_RING: Record<string, string> = {
  amber: "ring-amber-400/40 bg-amber-500/10",
  sky: "ring-sky-400/40 bg-sky-500/10",
  emerald: "ring-emerald-400/40 bg-emerald-500/10",
  rose: "ring-rose-400/40 bg-rose-500/10",
  cyan: "ring-cyan-400/40 bg-cyan-500/10",
  violet: "ring-violet-400/40 bg-violet-500/10",
};

const ACCENT_SOLID: Record<string, string> = {
  amber: "bg-amber-400 text-slate-900",
  sky: "bg-sky-400 text-slate-900",
  emerald: "bg-emerald-400 text-slate-900",
  rose: "bg-rose-400 text-slate-900",
  cyan: "bg-cyan-400 text-slate-900",
  violet: "bg-violet-400 text-white",
};

export function LearningScene({ slideIdx, title, bullets, revealed, speaking, currentLine, accent, illustrationUrl, iconKeywords }: Props) {
  const mode = useMemo<"hero" | "flow" | "grid" | "spotlight" | "takeaway">(() => {
    if (bullets.length === 0) return "hero";
    if (bullets.length === 1) return "spotlight";
    const variants = ["flow", "grid", "spotlight", "takeaway"] as const;
    return variants[slideIdx % variants.length];
  }, [slideIdx, bullets.length]);

  const label = SCENE_LABELS[slideIdx % SCENE_LABELS.length];
  const textAccent = ACCENT_TEXT[accent] ?? "text-amber-300";
  const ringAccent = ACCENT_RING[accent] ?? "ring-amber-400/40 bg-amber-500/10";
  const solidAccent = ACCENT_SOLID[accent] ?? "bg-amber-400 text-slate-900";

  const illustration = illustrationUrl ? (
    <img
      src={illustrationUrl}
      alt=""
      className="mx-auto mb-4 max-h-48 w-auto rounded-2xl border border-white/10 bg-white/5 object-contain"
    />
  ) : null;

  if (bullets.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <div className={`text-[10px] uppercase tracking-[0.3em] ${textAccent}`}>{label}</div>
        {illustration}
        <h3 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{title}</h3>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">{currentLine}</p>
      </div>
    );
  }

  if (mode === "flow") {
    return (
      <div>
        {illustration}
        <div className={`text-[10px] uppercase tracking-[0.3em] ${textAccent}`}>{label} · Process</div>
        <p className="mt-2 text-sm text-slate-300">Follow the stages from left to right — each step builds on the last.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bullets.map((b, i) => {
            const visible = i <= revealed;
            const active = i === Math.min(revealed, bullets.length - 1) && speaking;
            return (
              <div
                key={i}
                className={`relative rounded-2xl border p-4 transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"} ${active ? `ring-2 ${ringAccent} border-transparent` : "border-white/10 bg-slate-950/60"}`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${active ? solidAccent : "bg-white/10 text-slate-200"}`}>{i + 1}</span>
                  <span className={`text-[10px] uppercase tracking-[0.2em] ${textAccent}`}>Step {i + 1}</span>
                </div>
                <div className="mt-3 text-[15px] font-medium leading-snug text-slate-100">{b}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === "grid") {
    return (
      <div>
        {illustration}
        <div className={`text-[10px] uppercase tracking-[0.3em] ${textAccent}`}>{label}</div>
        <p className="mt-2 text-sm text-slate-300">Each tile is one idea — tap into them one at a time.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {bullets.map((b, i) => {
            const visible = i <= revealed;
            const active = i === Math.min(revealed, bullets.length - 1) && speaking;
            return (
              <div
                key={i}
                className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-500 ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"} ${active ? `ring-2 ${ringAccent} border-transparent` : "border-white/10 bg-slate-950/60"}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={`absolute -right-4 -top-4 opacity-10 ${textAccent}`}>
                  <LucideIcon name={iconAt(i, iconKeywords)} className="h-20 w-20" />
                </div>
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${active ? solidAccent : `${ringAccent} ring-1`}`}>
                  <LucideIcon name={iconAt(i, iconKeywords)} className="h-5 w-5" />
                </div>
                <div className="mt-3 text-[15px] font-semibold leading-snug text-slate-100">{b}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === "spotlight") {
    const focusIdx = Math.min(Math.max(0, revealed), bullets.length - 1);
    const focus = bullets[focusIdx] ?? bullets[0];
    return (
      <div>
        {illustration}
        <div className={`text-[10px] uppercase tracking-[0.3em] ${textAccent}`}>{label} · In focus</div>
        <div className={`mt-4 rounded-2xl border p-6 ring-2 ${ringAccent}`}>
          <div className={`text-[11px] uppercase tracking-[0.25em] ${textAccent}`}>Idea {focusIdx + 1} of {bullets.length}</div>
          <p key={focusIdx} className="mt-3 text-2xl font-semibold leading-snug text-slate-50 animate-fade-in sm:text-3xl">
            {focus}
          </p>
        </div>
        {bullets.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {bullets.map((b, i) => {
              const visited = i <= revealed;
              const isCurrent = i === focusIdx;
              return (
                <div
                  key={i}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${isCurrent ? `${solidAccent} border-transparent font-semibold` : visited ? "border-white/20 bg-white/5 text-slate-200" : "border-white/5 bg-white/0 text-slate-500"}`}
                >
                  <span className="mr-1.5 font-mono opacity-70">{i + 1}</span>
                  <span className="line-clamp-1 max-w-[200px] align-middle">{b}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // takeaway
  return (
    <div>
      {illustration}
      <div className={`text-[10px] uppercase tracking-[0.3em] ${textAccent}`}>{label}</div>
      <h3 className="mt-2 text-xl font-bold text-slate-100">What to remember about {title}</h3>
      <ul className="mt-5 space-y-2.5">
        {bullets.map((b, i) => {
          const visible = i <= revealed;
          const active = i === Math.min(revealed, bullets.length - 1) && speaking;
          return (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-500 ${visible ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"} ${active ? `ring-2 ${ringAccent} border-transparent` : "border-white/10 bg-slate-950/60"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${visible ? solidAccent : "bg-white/10 text-slate-400"}`}>✓</span>
              <span className="text-[15px] leading-relaxed text-slate-100">{b}</span>
            </li>
          );
        })}
      </ul>
      {revealed >= bullets.length - 1 && (
        <div className={`mt-5 rounded-xl border-l-4 p-4 text-sm italic text-slate-200 ${ringAccent} border-l-current ${textAccent}`}>
          <span className="not-italic text-slate-100">In one line — </span>
          <span className="text-slate-200">{currentLine}</span>
        </div>
      )}
    </div>
  );
}
