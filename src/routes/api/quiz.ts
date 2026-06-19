import { createFileRoute } from "@tanstack/react-router";
import bank from "@/assets/training/quiz-bank.json";

type BankQ = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
  difficulty: string;
  hint: string;
};

const BANK = bank as BankQ[];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickBalanced(n: number): BankQ[] {
  // Aim for ~70% easy / 30% medium, balanced across topics where possible.
  const easy = shuffle(BANK.filter((q) => q.difficulty === "easy"));
  const medium = shuffle(BANK.filter((q) => q.difficulty !== "easy"));
  const wantMedium = Math.min(Math.round(n * 0.3), medium.length);
  const wantEasy = n - wantMedium;

  const pickFromPool = (pool: BankQ[], k: number): BankQ[] => {
    const byTopic = new Map<string, BankQ[]>();
    for (const q of pool) {
      const list = byTopic.get(q.topic) ?? [];
      list.push(q);
      byTopic.set(q.topic, list);
    }
    const topics = shuffle(Array.from(byTopic.keys()));
    const out: BankQ[] = [];
    let i = 0;
    while (out.length < k && topics.length) {
      const t = topics[i % topics.length];
      const list = byTopic.get(t)!;
      const q = list.shift();
      if (q) out.push(q);
      if (!list.length) {
        topics.splice(i % topics.length, 1);
        if (!topics.length) break;
      } else {
        i++;
      }
    }
    return out;
  };

  return shuffle([
    ...pickFromPool(easy, wantEasy),
    ...pickFromPool(medium, wantMedium),
  ]);
}

export const Route = createFileRoute("/api/quiz")({
  server: {
    handlers: {
      POST: async () => {
        const questions = pickBalanced(20).map((q) => ({
          question: q.question,
          options: q.options,
          answerIndex: q.answerIndex,
          explanation: q.explanation,
          topic: q.topic,
          hint: q.hint,
          difficulty: q.difficulty,
        }));
        return new Response(JSON.stringify({ questions }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
