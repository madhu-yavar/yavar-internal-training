import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/seed-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "madhu.r@yavar.ai";

        // Check if user already exists
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (listErr) return Response.json({ ok: false, error: listErr.message }, { status: 500 });
        const existing = list.users.find((u) => u.email?.toLowerCase() === email);

        if (existing) {
          // Reset password to default and force change on next login
          const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: "admin@123",
            email_confirm: true,
            user_metadata: { ...(existing.user_metadata ?? {}), must_change_password: true },
          });
          if (updErr) return Response.json({ ok: false, error: updErr.message }, { status: 500 });

          // Ensure admin role
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: existing.id, role: "admin" }, { onConflict: "user_id,role" });

          return Response.json({ ok: true, action: "updated", user_id: existing.id });
        }

        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: "admin@123",
          email_confirm: true,
          user_metadata: { must_change_password: true },
        });
        if (createErr) return Response.json({ ok: false, error: createErr.message }, { status: 500 });

        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: created.user.id, role: "admin" }, { onConflict: "user_id,role" });

        return Response.json({ ok: true, action: "created", user_id: created.user.id });
      },
    },
  },
});
