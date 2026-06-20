import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCtx, type AuthState } from "@/lib/auth-context";

export { useAuthCtx, useAuthReady } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<AuthState>({ value: null, ready: false });

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
      setState({ value: { user: u.user, isAdmin }, ready: true });
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
    <AuthCtx.Provider value={state}>
      <Outlet />
    </AuthCtx.Provider>
  );
}
