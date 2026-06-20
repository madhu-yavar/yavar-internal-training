// Browser-side parser for PDF and PPTX decks.
// Extracts structured content (title, bullets, speaker notes, optional embedded image)
// per slide. The app renders the slides itself — we do NOT try to mimic PowerPoint.

import JSZip from "jszip";

export type ParsedSlide = {
  title: string;
  bullets: string[];
  notes: string;
  /** Optional embedded image as Blob (first image found on the slide / page). */
  image?: Blob;
};

/* ---------------- PDF ---------------- */

async function getPdfjs() {
  // dynamic import — pdfjs is heavy and only needed in the admin upload flow
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
    worker.default;
  return pdfjs;
}

export async function parsePdf(file: File): Promise<ParsedSlide[]> {
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const slides: ParsedSlide[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Group items into lines by y-coord
    const lines: { y: number; text: string; size: number }[] = [];
    for (const it of content.items as Array<{ str: string; transform: number[] }>) {
      const str = (it.str ?? "").trim();
      if (!str) continue;
      const y = Math.round(it.transform[5]);
      const size = Math.abs(it.transform[0]);
      const existing = lines.find((l) => Math.abs(l.y - y) < 3);
      if (existing) {
        existing.text += " " + str;
        existing.size = Math.max(existing.size, size);
      } else {
        lines.push({ y, text: str, size });
      }
    }
    lines.sort((a, b) => b.y - a.y); // top-to-bottom

    // Pick title = first non-empty line (or largest font line in top third)
    const title = (lines[0]?.text ?? `Slide ${p}`).slice(0, 140);
    const bullets = lines
      .slice(1)
      .map((l) => l.text.trim())
      .filter((t) => t.length > 1 && t.length < 400);

    // Render page as a backup image (compressed)
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const image = await new Promise<Blob | undefined>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? undefined), "image/jpeg", 0.82),
    );

    slides.push({ title, bullets, notes: "", image });
  }
  return slides;
}

/* ---------------- PPTX ---------------- */

function xmlText(xml: string): string[] {
  // Pull every <a:t>…</a:t> run, in order. Group runs that belong to the same
  // <a:p> paragraph into a single line.
  const paraRe = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  const runRe = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  const out: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = paraRe.exec(xml))) {
    const inner = pm[1];
    let line = "";
    let rm: RegExpExecArray | null;
    while ((rm = runRe.exec(inner))) line += decodeXml(rm[1]);
    line = line.trim();
    if (line) out.push(line);
  }
  return out;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export async function parsePptx(file: File): Promise<ParsedSlide[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  // Collect slide files in numeric order
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml$/)![1]);
      const nb = parseInt(b.match(/slide(\d+)\.xml$/)![1]);
      return na - nb;
    });

  const slides: ParsedSlide[] = [];
  for (const name of slideFiles) {
    const idxNum = parseInt(name.match(/slide(\d+)\.xml$/)![1]);
    const xml = await zip.file(name)!.async("string");
    const lines = xmlText(xml);
    const title = (lines[0] ?? `Slide ${idxNum}`).slice(0, 140);
    const bullets = lines.slice(1).filter((t) => t.length > 1);

    // speaker notes
    const notesName = `ppt/notesSlides/notesSlide${idxNum}.xml`;
    let notes = "";
    if (zip.file(notesName)) {
      const nxml = await zip.file(notesName)!.async("string");
      notes = xmlText(nxml).join(" ").trim();
    }

    // first embedded image referenced by this slide
    let image: Blob | undefined;
    const relsName = `ppt/slides/_rels/slide${idxNum}.xml.rels`;
    if (zip.file(relsName)) {
      const rels = await zip.file(relsName)!.async("string");
      const m = rels.match(/Target="(\.\.\/media\/[^"]+\.(?:png|jpg|jpeg|gif|webp))"/i);
      if (m) {
        const mediaPath = `ppt/${m[1].replace(/^\.\.\//, "")}`;
        const f = zip.file(mediaPath);
        if (f) {
          const ab = await f.async("arraybuffer");
          const ext = mediaPath.split(".").pop()!.toLowerCase();
          const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
          image = new Blob([ab], { type: mime });
        }
      }
    }

    slides.push({ title, bullets, notes, image });
  }
  return slides;
}

export async function parseDeck(file: File): Promise<ParsedSlide[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return parsePdf(file);
  if (name.endsWith(".pptx")) return parsePptx(file);
  if (name.endsWith(".ppt")) {
    throw new Error("Legacy .ppt is not supported. Please save as .pptx or export to PDF.");
  }
  throw new Error("Unsupported file. Upload a PDF or PPTX deck.");
}
