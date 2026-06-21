import { Fragment } from "react";
import * as LucideIcons from "lucide-react";
import { iconForKeyword } from "@/lib/iconMap";
import type { LearningScene as Scene, ScenePhase } from "@/lib/learningScenes";

type Props = {
  scene: Scene;
  phase: ScenePhase;
  speaking: boolean;
  accent: string;
  illustrationUrl?: string | null;
  slideImageUrl?: string | null;
  sceneNumber: number;
  totalScenes: number;
  sourceSlideTitle: string;
};

function toPascal(name: string) {
  return name.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Comp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[toPascal(name)]
    ?? LucideIcons.Sparkles;
  return <Comp className={className} />;
}

const ACCENT_TEXT: Record<string, string> = {
  amber: "text-amber-300", sky: "text-sky-300", emerald: "text-emerald-300",
  rose: "text-rose-300", cyan: "text-cyan-300", violet: "text-violet-300",
};
const ACCENT_RING: Record<string, string> = {
  amber: "ring-amber-400/50 bg-amber-500/10", sky: "ring-sky-400/50 bg-sky-500/10",
  emerald: "ring-emerald-400/50 bg-emerald-500/10", rose: "ring-rose-400/50 bg-rose-500/10",
  cyan: "ring-cyan-400/50 bg-cyan-500/10", violet: "ring-violet-400/50 bg-violet-500/10",
};

const PHASE_ORDER: ScenePhase[] = ["intro", "analogy", "example", "technical", "takeaway"];
const PHASE_LABELS: Record<ScenePhase, string> = {
  intro: "Concept",
  analogy: "Analogy",
  example: "Real-world example",
  technical: "How it works",
  takeaway: "Key takeaway",
};

function Diagram({
  caption, nodes, accent, active,
}: { caption: string; nodes: string[]; accent: string; active: boolean }) {
  const textAccent = ACCENT_TEXT[accent] ?? "text-amber-300";
  const ring = ACCENT_RING[accent] ?? "ring-amber-400/50 bg-amber-500/10";
  return (
    <div className={`rounded-2xl border p-5 transition-all duration-500 ${active ? `ring-2 ${ring} border-transparent` : "border-white/10 bg-slate-950/60"}`}>
      <div className={`text-[10px] uppercase tracking-[0.3em] ${textAccent}`}>{caption}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
        {nodes.map((n, i) => (
          <Fragment key={i}>
            <div
              className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-slate-100 transition-all duration-500 ${active ? `${ring} border-transparent ring-1` : "border-white/10 bg-slate-900"}`}
              style={{ animation: active ? `fadeIn 0.5s ${i * 0.15}s both` : undefined }}
            >
              <LucideIcon name={iconForKeyword(n)} className={`h-4 w-4 ${textAccent}`} />
              <span>{n}</span>
            </div>
            {i < nodes.length - 1 && <span className={`text-xl font-bold ${textAccent}`}>→</span>}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function LearningScene({
  scene, phase, speaking, accent, illustrationUrl, sceneNumber, totalScenes, sourceSlideTitle,
}: Props) {
  const textAccent = ACCENT_TEXT[accent] ?? "text-amber-300";
  const ring = ACCENT_RING[accent] ?? "ring-amber-400/50 bg-amber-500/10";
  const phaseIdx = PHASE_ORDER.indexOf(phase);

  const showAnalogy = !!scene.analogy && phaseIdx >= 1;
  const showExample = !!scene.example && phaseIdx >= 2;
  const showTechnical = !!scene.technical && phaseIdx >= 3;
  const showTakeaway = phaseIdx >= 4;

  return (
    <div className="space-y-4">
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      <div className="flex items-center justify-between">
        <div>
          <div className={`text-[10px] uppercase tracking-[0.3em] ${textAccent}`}>
            {PHASE_LABELS[phase]} · Scene {sceneNumber} of {totalScenes}
          </div>
          <h3 className="mt-1 text-2xl font-bold leading-tight text-slate-50 sm:text-3xl">
            {scene.concept}
          </h3>
          {sourceSlideTitle && sourceSlideTitle !== scene.concept && (
            <div className="mt-1 text-[11px] text-slate-500">from "{sourceSlideTitle}"</div>
          )}
        </div>
        {illustrationUrl && (
          <img src={illustrationUrl} alt="" className="hidden h-24 w-auto rounded-xl border border-white/10 bg-white/5 object-contain sm:block" />
        )}
      </div>

      {/* Intro card — always visible once scene starts */}
      <div className={`rounded-2xl border p-5 transition-all ${phase === "intro" && speaking ? `ring-2 ${ring} border-transparent` : "border-white/10 bg-slate-950/40"}`}>
        <div className={`text-[10px] uppercase tracking-[0.3em] ${textAccent}`}>Introduction</div>
        <p className="mt-2 text-base leading-relaxed text-slate-100 sm:text-lg">{scene.intro}</p>
      </div>

      {showAnalogy && scene.analogy && (
        <Diagram caption={scene.analogy.caption || "Analogy"} nodes={scene.analogy.nodes} accent={accent} active={phase === "analogy" && speaking} />
      )}

      {showExample && scene.example && (
        <Diagram caption={scene.example.caption || "Real-world example"} nodes={scene.example.nodes} accent={accent} active={phase === "example" && speaking} />
      )}

      {showTechnical && scene.technical && (
        <Diagram caption={scene.technical.caption || "How it works"} nodes={scene.technical.nodes} accent={accent} active={phase === "technical" && speaking} />
      )}

      {showTakeaway && (
        <div className={`rounded-2xl border-l-4 border-l-current p-5 ${ring} ${textAccent} transition-all ${phase === "takeaway" && speaking ? `ring-2 border-transparent` : ""}`}>
          <div className="text-[10px] uppercase tracking-[0.3em]">Key takeaway</div>
          <p className="mt-2 text-base font-medium leading-relaxed text-slate-50 sm:text-lg">
            {scene.takeaway}
          </p>
        </div>
      )}

      {/* Progress chips */}
      <div className="flex flex-wrap gap-1.5 pt-2">
        {PHASE_ORDER.filter((p) => {
          if (p === "analogy") return !!scene.analogy;
          if (p === "example") return !!scene.example;
          if (p === "technical") return !!scene.technical;
          return true;
        }).map((p) => {
          const idx = PHASE_ORDER.indexOf(p);
          const isCurrent = p === phase;
          const visited = idx <= phaseIdx;
          return (
            <span
              key={p}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider transition ${isCurrent ? `${ring} border-transparent ring-1 font-bold ${textAccent}` : visited ? "border-white/20 bg-white/5 text-slate-300" : "border-white/5 text-slate-600"}`}
            >
              {PHASE_LABELS[p]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
