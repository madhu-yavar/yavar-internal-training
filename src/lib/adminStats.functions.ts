import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LearnerRow = {
  user_id: string;
  email: string | null;
  enrollments: number;
  completed: number;
  attempts: number;
  best_score: number | null; // percentage 0-100
  last_active: string | null;
};

export type CourseStat = {
  course_id: string;
  title: string;
  published: boolean;
  enrolled: number;
  completed: number;
  attempts: number;
  avg_score: number | null; // percentage 0-100
};

export type DashboardData = {
  totals: { learners: number; courses: number; published: number; attempts: number; completions: number };
  courses: CourseStat[];
  learners: LearnerRow[];
  recent: Array<{ user_id: string; email: string | null; course_id: string; course_title: string; score: number; total: number; taken_at: string }>;
};

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // admin gate
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = !!roles?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [coursesRes, enrollsRes, attemptsRes] = await Promise.all([
      supabaseAdmin.from("courses").select("id,title,published"),
      supabaseAdmin.from("enrollments").select("user_id,course_id,completed_at,started_at"),
      supabaseAdmin.from("quiz_attempts").select("user_id,course_id,score,total,taken_at").order("taken_at", { ascending: false }),
    ]);

    const courses = coursesRes.data ?? [];
    const enrolls = enrollsRes.data ?? [];
    const attempts = attemptsRes.data ?? [];

    // Lookup emails
    const userIds = new Set<string>([...enrolls.map((e) => e.user_id), ...attempts.map((a) => a.user_id)]);
    const emails: Record<string, string | null> = {};
    // Page through up to ~1000 users
    let page = 1;
    while (page <= 10) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        if (userIds.has(u.id)) emails[u.id] = u.email ?? null;
      }
      if (data.users.length < 200) break;
      page++;
    }

    const courseById = new Map(courses.map((c) => [c.id, c]));

    // Per-course stats
    const courseStats: CourseStat[] = courses.map((c) => {
      const cEnr = enrolls.filter((e) => e.course_id === c.id);
      const cAtt = attempts.filter((a) => a.course_id === c.id);
      const pcts = cAtt.map((a) => (a.total ? (a.score / a.total) * 100 : 0));
      return {
        course_id: c.id,
        title: c.title,
        published: !!c.published,
        enrolled: cEnr.length,
        completed: cEnr.filter((e) => !!e.completed_at).length,
        attempts: cAtt.length,
        avg_score: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
      };
    });

    // Per-learner stats
    const learnerMap = new Map<string, LearnerRow>();
    for (const uid of userIds) {
      learnerMap.set(uid, {
        user_id: uid,
        email: emails[uid] ?? null,
        enrollments: 0,
        completed: 0,
        attempts: 0,
        best_score: null,
        last_active: null,
      });
    }
    for (const e of enrolls) {
      const row = learnerMap.get(e.user_id)!;
      row.enrollments++;
      if (e.completed_at) row.completed++;
      const t = e.completed_at || e.started_at;
      if (t && (!row.last_active || t > row.last_active)) row.last_active = t;
    }
    for (const a of attempts) {
      const row = learnerMap.get(a.user_id)!;
      row.attempts++;
      const pct = a.total ? (a.score / a.total) * 100 : 0;
      if (row.best_score == null || pct > row.best_score) row.best_score = Math.round(pct);
      if (a.taken_at && (!row.last_active || a.taken_at > row.last_active)) row.last_active = a.taken_at;
    }

    const learners = Array.from(learnerMap.values()).sort((a, b) =>
      (b.last_active || "").localeCompare(a.last_active || ""),
    );

    const recent = attempts.slice(0, 25).map((a) => ({
      user_id: a.user_id,
      email: emails[a.user_id] ?? null,
      course_id: a.course_id,
      course_title: courseById.get(a.course_id)?.title ?? "—",
      score: a.score,
      total: a.total,
      taken_at: a.taken_at,
    }));

    const data: DashboardData = {
      totals: {
        learners: learnerMap.size,
        courses: courses.length,
        published: courses.filter((c) => c.published).length,
        attempts: attempts.length,
        completions: enrolls.filter((e) => !!e.completed_at).length,
      },
      courses: courseStats.sort((a, b) => b.enrolled - a.enrolled),
      learners,
      recent,
    };
    return data;
  });
