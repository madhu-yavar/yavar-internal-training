export function BrandFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-border bg-muted/40 ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
        <div className="flex items-center gap-2">
          <img src="/yavar-logo.png" alt="Yavar" className="h-6 w-auto opacity-80" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Yavar Learn</span>
        </div>
        <div>Copyright © 2026 Yavar techworks Pte Ltd. All rights reserved.</div>
      </div>
    </footer>
  );
}
