import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = { user: User; isAdmin: boolean };
const Ctx = createContext<AuthCtx | null>(null);

export function useAuthCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuthCtx must be used within _authenticated");
  return v;
}

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<AuthCtx | "loading" | "anon">("loading");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!u.user) {
        setState("anon");
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      if (!mounted) return;
      setState({
        user: u.user,
        isAdmin: !!roles?.some((r) => r.role === "admin"),
      });
      if (
        u.user.user_metadata?.must_change_password &&
        location.pathname !== "/change-password"
      ) {
        navigate({ to: "/change-password" });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate, location.pathname]);

  if (state === "loading" || state === "anon") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <Ctx.Provider value={state}>
      <Outlet />
    </Ctx.Provider>
  );
}
