import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/external-auth-middleware";

const Input = z.object({ courseId: z.string().uuid() });

/**
 * Generate a cover image for a course via Lovable AI image gen (Gemini),
 * upload it to the `course-uploads` bucket, and save the storage path to
 * `courses.cover_url`. Admin only.
 */
export const generateCourseCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("Missing LOVABLE_API_KEY");

    const { supabaseAdmin } = await import("@/integrations/supabase/external.server");

    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .select("id, title, description")
      .eq("id", data.courseId)
      .single();
    if (error || !course) throw new Error("Course not found");

    const prompt = `Editorial cover illustration for an enterprise training course titled "${course.title}". ${course.description ?? ""}
Style: modern flat vector, soft warm palette with amber and slate accents, clean geometric shapes, subtle depth, centered composition, professional and educational tone. No text, no logos, no watermarks. 16:9 landscape.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) throw new Error(`Image gen failed: ${res.status} ${await res.text().catch(() => "")}`);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const dataUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) throw new Error("No image returned by model");

    const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!m) throw new Error("Bad image data URL");
    const mime = m[1];
    const ext = mime.split("/")[1] || "png";
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `${course.id}/cover-${Date.now()}.${ext}`;

    const up = await supabaseAdmin.storage.from("course-uploads").upload(path, bytes, {
      contentType: mime,
      upsert: true,
    });
    if (up.error) throw up.error;

    const { error: updErr } = await supabaseAdmin
      .from("courses")
      .update({ cover_url: path })
      .eq("id", course.id);
    if (updErr) throw updErr;

    return { ok: true, path };
  });
