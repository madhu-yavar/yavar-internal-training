import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/external-auth-middleware";

export type LearnerRow = {
  user_id: string;
  email: string | null;
  enrollments: number;
  completed: number;
  attempts: number;
  best_score: number | null; // percentage 0-100
  last_active: string | null;
  created_at: string; // when user joined
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

export type DailyPoint = { date: string; attempts: number; completions: number; enrollments: number };

export type DashboardData = {
  totals: { learners: number; courses: number; published: number; attempts: number; completions: number };
  courses: CourseStat[];
  learners: LearnerRow[];
  recent: Array<{ user_id: string; email: string | null; course_id: string; course_title: string; score: number; total: number; taken_at: string }>;
  daily: DailyPoint[]; // last 30 days
};


export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // admin gate
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = !!roles?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/external.server");

    // Fetch ALL users first (for e2e admin visibility)
    const allUsers: Array<{ id: string; email: string | null; created_at: string }> = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        allUsers.push({ id: u.id, email: u.email ?? null, created_at: u.created_at });
      }
      if (data.users.length < 200) break;
      page++;
    }

    const [coursesRes, enrollsRes, attemptsRes] = await Promise.all([
      supabaseAdmin.from("courses").select("id,title,published"),
      supabaseAdmin.from("enrollments").select("user_id,course_id,completed_at,started_at"),
      supabaseAdmin.from("quiz_attempts").select("user_id,course_id,score,total,taken_at").order("taken_at", { ascending: false }),
    ]);

    const courses = coursesRes.data ?? [];
    const enrolls = enrollsRes.data ?? [];
    const attempts = attemptsRes.data ?? [];

    // Build email and created_at lookup for all users
    const emails: Record<string, string | null> = {};
    const userCreatedAt: Record<string, string> = {};
    for (const u of allUsers) {
      emails[u.id] = u.email;
      userCreatedAt[u.id] = u.created_at;
    }

    // All user IDs for learner stats
    const allUserIds = new Set(allUsers.map((u) => u.id));

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

    // Per-learner stats - initialize ALL users
    const learnerMap = new Map<string, LearnerRow>();
    for (const uid of allUserIds) {
      learnerMap.set(uid, {
        user_id: uid,
        email: emails[uid] ?? null,
        enrollments: 0,
        completed: 0,
        attempts: 0,
        best_score: null,
        last_active: null,
        created_at: userCreatedAt[uid] || "",
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

    // Sort: active users first (by last_active desc), then inactive (by joined desc)
    const learners = Array.from(learnerMap.values()).sort((a, b) => {
      if (a.last_active && b.last_active) return b.last_active.localeCompare(a.last_active);
      if (a.last_active) return -1; // a is active, b is not
      if (b.last_active) return 1;  // b is active, a is not
      return b.created_at.localeCompare(a.created_at); // both inactive, sort by joined
    });

    const recent = attempts.slice(0, 25).map((a) => ({
      user_id: a.user_id,
      email: emails[a.user_id] ?? null,
      course_id: a.course_id,
      course_title: courseById.get(a.course_id)?.title ?? "—",
      score: a.score,
      total: a.total,
      taken_at: a.taken_at,
    }));

    // Build last-30-days activity series
    const daily: DailyPoint[] = [];
    const dayMap = new Map<string, DailyPoint>();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const p: DailyPoint = { date: key, attempts: 0, completions: 0, enrollments: 0 };
      dayMap.set(key, p);
      daily.push(p);
    }
    const bump = (iso: string | null, field: "attempts" | "completions" | "enrollments") => {
      if (!iso) return;
      const k = iso.slice(0, 10);
      const p = dayMap.get(k);
      if (p) p[field]++;
    };
    for (const a of attempts) bump(a.taken_at, "attempts");
    for (const e of enrolls) {
      bump(e.started_at, "enrollments");
      bump(e.completed_at, "completions");
    }

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
      daily,
    };

    return data;
  });
