import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = { user: User; isAdmin: boolean } | null;
const Ctx = createContext<{ value: AuthCtx; ready: boolean }>({ value: null, ready: false });

export function useAuthCtx() {
  const { value, ready } = useContext(Ctx);
  if (!ready || !value) {
    // Safe fallback during loading — components should also handle this
    return { user: null as unknown as User, isAdmin: false, _loading: true } as unknown as {
      user: User; isAdmin: boolean;
    };
  }
  return value;
}

export function useAuthReady() {
  return useContext(Ctx).ready;
}

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<{ value: AuthCtx; ready: boolean }>({ value: null, ready: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!u.user) {
        setState({ value: null, ready: true });
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      if (!mounted) return;
      const isAdmin = !!roles?.some((r) => r.role === "admin");
      console.log("[auth-layout] user:", u.user.email, "roles:", roles, "isAdmin:", isAdmin);
      setState({
        value: { user: u.user, isAdmin },
        ready: true,
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

  if (!state.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  if (!state.value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Redirecting…
      </div>
    );
  }

  return (
    <Ctx.Provider value={state}>
      <Outlet />
    </Ctx.Provider>
  );
}
