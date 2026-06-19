// Animated SVG avatar that "speaks" while narration is progressing.
// Pure CSS/SVG — no external libs.

type Props = {
  speaking: boolean;
  accent?: string;
  name?: string;
};

export function AIAvatar({ speaking, accent = "amber", name = "Ari" }: Props) {
  const ring = speaking ? "ring-2 ring-amber-400/70" : "ring-1 ring-white/10";
  return (
    <div className="flex items-center gap-3">
      <div className={`relative h-14 w-14 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 ${ring} transition`}>
        {speaking && (
          <span className="absolute inset-0 rounded-full animate-ping bg-amber-400/20" />
        )}
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full p-2">
          {/* head */}
          <circle cx="32" cy="28" r="14" fill="#fde68a" />
          {/* hair */}
          <path d="M18 24 Q32 8 46 24 L46 18 Q32 6 18 18 Z" fill="#1f2937" />
          {/* eyes */}
          <circle cx="27" cy="28" r="1.6" fill="#0f172a">
            <animate attributeName="r" values="1.6;1.6;0.2;1.6;1.6" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="37" cy="28" r="1.6" fill="#0f172a">
            <animate attributeName="r" values="1.6;1.6;0.2;1.6;1.6" dur="4s" repeatCount="indefinite" />
          </circle>
          {/* mouth */}
          {speaking ? (
            <ellipse cx="32" cy="35" rx="3" ry="2" fill="#7f1d1d">
              <animate attributeName="ry" values="0.6;2.2;1;2.4;0.8" dur="0.55s" repeatCount="indefinite" />
              <animate attributeName="rx" values="2.5;3.2;2.8;3.4;2.6" dur="0.55s" repeatCount="indefinite" />
            </ellipse>
          ) : (
            <path d="M28 35 Q32 37 36 35" stroke="#7f1d1d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          )}
          {/* shoulders */}
          <path d="M10 60 Q32 44 54 60 Z" fill="#0ea5e9" />
        </svg>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300">AI Trainer</div>
        <div className="text-sm font-semibold text-slate-100">{name}</div>
        <div className="mt-0.5 flex items-end gap-0.5 h-3">
          {[0,1,2,3,4].map((i) => (
            <span
              key={i}
              className={`w-0.5 bg-amber-400 rounded-full transition-all ${speaking ? "animate-pulse" : ""}`}
              style={{
                height: speaking ? `${4 + ((i*7+3)%10)}px` : "2px",
                animationDelay: `${i * 90}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
