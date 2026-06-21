// Maps slide keywords -> Lucide icon names. Used by LearningScene.
// Add new mappings as needed; unknown words fall back to "sparkles".
export const ICON_MAP: Record<string, string> = {
  // AI / ML
  ai: "brain-circuit", "artificial-intelligence": "brain-circuit", model: "brain-circuit",
  llm: "bot", agent: "bot", chatbot: "message-circle", classification: "tags",
  regression: "trending-up", prediction: "line-chart", training: "graduation-cap",
  inference: "zap", dataset: "database", embedding: "vector-square", vector: "vector-square",
  prompt: "message-square-text", neural: "network", "neural-network": "network",
  // Data
  data: "database", database: "database", table: "table", query: "search",
  sql: "database", api: "plug", json: "braces", csv: "file-spreadsheet",
  excel: "file-spreadsheet", spreadsheet: "file-spreadsheet", pipeline: "git-branch",
  // Process / flow
  workflow: "git-branch", process: "git-branch", flow: "git-branch", step: "list-checks",
  automation: "cog", integration: "plug",
  // Business
  business: "briefcase", enterprise: "building-2", sales: "trending-up",
  customer: "users", user: "user", team: "users", market: "store",
  revenue: "circle-dollar-sign", cost: "circle-dollar-sign", money: "circle-dollar-sign",
  // Security / compliance
  security: "shield", privacy: "lock", encryption: "lock-keyhole", compliance: "shield-check",
  audit: "clipboard-check", risk: "shield-alert",
  // Cloud / infra
  cloud: "cloud", server: "server", container: "box", deployment: "rocket",
  scaling: "maximize", performance: "gauge",
  // Communication
  email: "mail", chat: "message-circle", notification: "bell", alert: "alert-triangle",
  // Common objects (apple / orange example)
  apple: "apple", orange: "citrus", fruit: "apple", animal: "paw-print",
  car: "car", document: "file-text", image: "image", video: "video", audio: "music",
  // Generic
  idea: "lightbulb", goal: "target", success: "check-circle-2", warning: "alert-triangle",
  question: "help-circle", answer: "message-square", search: "search",
  time: "clock", calendar: "calendar", growth: "trending-up", quality: "award",
};

export function iconForKeyword(kw: string | undefined | null): string {
  if (!kw) return "sparkles";
  const k = kw.toLowerCase().trim();
  return ICON_MAP[k] ?? ICON_MAP[k.replace(/s$/, "")] ?? "sparkles";
}
