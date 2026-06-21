// Structured learning scenes — produced by the AI per source slide.
// The learner player plays one scene at a time, each scene with 5 narrated phases.

export type DiagramBlock = {
  caption: string;
  nodes: string[];
};

export type LearningScene = {
  concept: string;
  intro: string;
  analogy?: DiagramBlock | null;
  example?: DiagramBlock | null;
  technical?: DiagramBlock | null;
  takeaway: string;
  narration: {
    intro: string;
    analogy?: string;
    example?: string;
    technical?: string;
    takeaway: string;
  };
  keywords?: string[];
};

export type SlideScenes = {
  sourceSlideIdx: number;
  scenes: LearningScene[];
};

export const SCENES_PREFIX = "<!-- learning-scenes-v1";
export const SCENES_SUFFIX = "learning-scenes-v1 -->";

export function embedScenes(body: string, scenes: LearningScene[]): string {
  const stripped = stripScenes(body);
  const payload = JSON.stringify({ scenes });
  return `${stripped}\n\n${SCENES_PREFIX}\n${payload}\n${SCENES_SUFFIX}`.trim();
}

export function stripScenes(body: string | null | undefined): string {
  return (body ?? "").replace(/\n?<!-- learning-scenes-v1[\s\S]*?learning-scenes-v1 -->/g, "").trim();
}

export function readScenes(body: string | null | undefined): LearningScene[] | null {
  const m = (body ?? "").match(/<!-- learning-scenes-v1\s*([\s\S]*?)\s*learning-scenes-v1 -->/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]) as { scenes?: LearningScene[] };
    return Array.isArray(parsed.scenes) && parsed.scenes.length > 0 ? parsed.scenes : null;
  } catch {
    return null;
  }
}

export const SCENE_PHASES = ["intro", "analogy", "example", "technical", "takeaway"] as const;
export type ScenePhase = (typeof SCENE_PHASES)[number];

export function scenePhaseLines(scene: LearningScene): { phase: ScenePhase; text: string }[] {
  const out: { phase: ScenePhase; text: string }[] = [];
  const n = scene.narration ?? ({} as LearningScene["narration"]);
  if (n.intro || scene.intro) out.push({ phase: "intro", text: n.intro || scene.intro });
  if (scene.analogy && (n.analogy || scene.analogy.caption))
    out.push({ phase: "analogy", text: n.analogy || `Think of it like this. ${scene.analogy.nodes.join(" then ")}.` });
  if (scene.example && (n.example || scene.example.caption))
    out.push({ phase: "example", text: n.example || `Here's a real example. ${scene.example.nodes.join(" then ")}.` });
  if (scene.technical && (n.technical || scene.technical.caption))
    out.push({ phase: "technical", text: n.technical || `Under the hood. ${scene.technical.nodes.join(" then ")}.` });
  if (n.takeaway || scene.takeaway) out.push({ phase: "takeaway", text: n.takeaway || scene.takeaway });
  return out;
}
