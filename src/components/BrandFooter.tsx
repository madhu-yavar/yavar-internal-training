import yavarLogo from "@/assets/yavar-logo.png.asset.json";

export function BrandFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-white/5 bg-slate-950/60 ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left">
        <div className="flex items-center gap-2">
          <img src={yavarLogo.url} alt="Yavar" className="h-6 w-auto opacity-80" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Yavar Learn</span>
        </div>
        <div>Copyright © 2026 Yavar techworks Pte Ltd. All rights reserved.</div>
      </div>
    </footer>
  );
}
