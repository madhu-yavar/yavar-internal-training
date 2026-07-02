import { useEffect, useState } from "react";

/**
 * Fixed-corner light/dark toggle. Flips `html.light` class + persists to localStorage.
 * Works globally because src/styles.css remaps the slate palette under `html.light`.
 */
export function ThemeSwitch() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("yavar-theme");
    const useLight = stored === "light";
    document.documentElement.classList.toggle("light", useLight);
    setLight(useLight);
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("yavar-theme", next ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      title={light ? "Switch to dark theme" : "Switch to light theme"}
      aria-label="Toggle theme"
      className="fixed bottom-4 right-4 z-[9999] grid h-10 w-10 place-items-center rounded-full border border-amber-400/50 bg-amber-500/10 text-lg shadow-lg backdrop-blur hover:bg-amber-500/20"
    >
      {light ? "🌙" : "☀️"}
    </button>
  );
}
