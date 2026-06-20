export type MaterialSlide = {
  id?: string;
  idx: number;
  title: string;
  body_md: string | null;
  narration_text: string | null;
};

export type MaterialCue = {
  idx?: number;
  start_ms: number;
  end_ms: number;
  text: string;
};

export type TimedSegment = {
  slideIdx: number;
  startMs: number;
  endMs: number;
  text: string;
};

export const GENERATED_PREFIX = "<!-- generated-learning-material-v1";
export const GENERATED_SUFFIX = "generated-learning-material-v1 -->";

export function stripGeneratedMaterial(markdown: string | null | undefined) {
  return (markdown ?? "").replace(/\n?<!-- generated-learning-material-v1[\s\S]*?generated-learning-material-v1 -->/g, "").trim();
}

export function slideBullets(slide: MaterialSlide) {
  return stripGeneratedMaterial(slide.body_md)
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export function narrationSentences(text: string | null | undefined) {
  return (text ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

function wordCount(text: string | null | undefined) {
  return Math.max(1, (text ?? "").trim().split(/\s+/).filter(Boolean).length);
}

function fallbackSegments(slide: MaterialSlide) {
  const source = slide.narration_text || [slide.title, ...slideBullets(slide)].join(". ");
  const parts = narrationSentences(source);
  const total = Math.max(4_000, wordCount(source) * 430);
  const each = Math.max(1, total / Math.max(1, parts.length));
  return (parts.length ? parts : [slide.title]).map((text, i) => ({
    slideIdx: slide.idx,
    startMs: Math.round(i * each),
    endMs: Math.round((i + 1) * each),
    text,
  }));
}

export function bindCuesToSlides(slides: MaterialSlide[], cues: MaterialCue[]): TimedSegment[][] {
  const orderedSlides = [...slides].sort((a, b) => a.idx - b.idx);
  const orderedCues = [...cues].sort((a, b) => a.start_ms - b.start_ms);
  if (orderedSlides.length === 0) return [];
  if (orderedCues.length === 0) return orderedSlides.map(fallbackSegments);

  const courseStart = orderedCues[0].start_ms;
  const courseEnd = Math.max(...orderedCues.map((c) => c.end_ms), courseStart + orderedSlides.length * 5_000);
  const duration = Math.max(1, courseEnd - courseStart);
  const weights = orderedSlides.map((s) => wordCount(s.narration_text || [s.title, ...slideBullets(s)].join(" ")));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || orderedSlides.length;
  let acc = 0;

  return orderedSlides.map((slide, i) => {
    const start = courseStart + Math.round((acc / totalWeight) * duration);
    acc += weights[i] || 1;
    const end = i === orderedSlides.length - 1 ? courseEnd + 1 : courseStart + Math.round((acc / totalWeight) * duration);
    const matched = orderedCues.filter((cue) => {
      const mid = cue.start_ms + (cue.end_ms - cue.start_ms) / 2;
      return mid >= start && mid < end;
    });
    if (matched.length === 0) return fallbackSegments(slide);
    return matched.map((cue) => ({
      slideIdx: slide.idx,
      startMs: Math.max(0, cue.start_ms - start),
      endMs: Math.max(0, cue.end_ms - start),
      text: cue.text,
    }));
  });
}

export function buildGeneratedSlideBody(slide: MaterialSlide, segments: TimedSegment[], quizCount: number) {
  const base = stripGeneratedMaterial(slide.body_md);
  const payload = JSON.stringify({
    slideIdx: slide.idx,
    generatedAt: new Date().toISOString(),
    quizCount,
    segments,
  });
  return `${base}\n\n${GENERATED_PREFIX}\n${payload}\n${GENERATED_SUFFIX}`.trim();
}

export function readGeneratedSegments(markdown: string | null | undefined): TimedSegment[] | null {
  const match = (markdown ?? "").match(/<!-- generated-learning-material-v1\s*([\s\S]*?)\s*generated-learning-material-v1 -->/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as { segments?: TimedSegment[] };
    return Array.isArray(parsed.segments) ? parsed.segments : null;
  } catch {
    return null;
  }
}

export function formatMs(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}