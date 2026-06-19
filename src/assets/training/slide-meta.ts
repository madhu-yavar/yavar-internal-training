// Curated per-slide visual content: headline cards + product chips.
// Drives animated reveals in the training module so the UI reflects narration.

export type SlideMeta = {
  i: number;
  headline: string;
  cards: { title: string; body: string; icon?: string }[];
  products?: { group: string; items: string[] }[];
  accent?: string; // tailwind color name
};

export const SLIDE_META: Record<number, SlideMeta> = {
  1: {
    i: 1,
    headline: "Enterprise AI with Private LLM",
    accent: "amber",
    cards: [
      { title: "Who this is for", body: "Presales & solution architects who must defend a Private LLM architecture in front of CIOs, CISOs and data officers.", icon: "👥" },
      { title: "What you'll learn", body: "Public vs Private LLMs, RAG, agentic patterns, deployment topologies, governance and presales motion.", icon: "🎯" },
      { title: "Outcome", body: "Walk into a client meeting and run the entire conversation — model choice, data flow, risk, cost — without slides.", icon: "🏁" },
    ],
  },
  2: {
    i: 2,
    headline: "Public vs Private LLMs",
    accent: "sky",
    cards: [
      { title: "Public LLM", body: "Provider-managed API. Fast to start, no infra. Data crosses the provider boundary; upgrades & logging controlled by vendor.", icon: "🌐" },
      { title: "Private LLM", body: "Model + inference inside the client's trust boundary (VPC, on-prem, sovereign cloud). Client owns data, logs, lifecycle.", icon: "🔒" },
      { title: "Hybrid", body: "Sensitive workloads on private; commodity tasks on public. Routing layer decides per request.", icon: "🔀" },
    ],
    products: [
      { group: "Public", items: ["GPT-4o", "Claude 3.5", "Gemini 2.5"] },
      { group: "Private-capable", items: ["Llama 3.3", "Qwen 2.5", "Mistral", "Gemma 2"] },
    ],
  },
  3: {
    i: 3,
    headline: "What Makes an LLM 'Private'?",
    accent: "violet",
    cards: [
      { title: "No training on prompts", body: "Weakest definition. Contractual; data still leaves the network.", icon: "📝" },
      { title: "Network isolation", body: "Inference inside customer VPC / on-prem. No egress to vendor.", icon: "🛡️" },
      { title: "Model & weights owned", body: "Open-weights model hosted by the customer. Full control of upgrades, fine-tuning, audit.", icon: "🏛️" },
      { title: "Sovereign deployment", body: "Region-locked, regulator-auditable, air-gapped variants for defense / BFSI.", icon: "🌍" },
    ],
  },
  4: {
    i: 4,
    headline: "Private LLM Building Blocks",
    accent: "emerald",
    cards: [
      { title: "Model size", body: "SLM for narrow tasks (classification, extraction). LLM for reasoning, multi-step, long context.", icon: "📏" },
      { title: "Inference runtime", body: "vLLM, TGI, TensorRT-LLM, Ollama. Throughput, batching, quantization decide $/token.", icon: "⚙️" },
      { title: "Embeddings", body: "Dedicated encoder model for retrieval. Quality of embeddings = ceiling of RAG.", icon: "🧬" },
      { title: "Vector DB", body: "Stores embeddings + metadata. Powers semantic + hybrid search.", icon: "🗂️" },
      { title: "Orchestration", body: "Agent loop, tool routing, guardrails, observability.", icon: "🎼" },
    ],
    products: [
      { group: "SLM", items: ["Phi-3", "Gemma 2 2B", "Qwen 2.5 1.5B", "Llama 3.2 3B"] },
      { group: "LLM", items: ["Llama 3.3 70B", "Qwen 2.5 72B", "Mistral Large", "Kimi K2", "DeepSeek V3"] },
      { group: "Embeddings", items: ["BGE-M3", "E5-Mistral", "Nomic-Embed", "Cohere Embed v3"] },
      { group: "Vector DB", items: ["Pinecone", "Weaviate", "Qdrant", "Milvus", "pgvector"] },
      { group: "Runtime", items: ["vLLM", "TGI", "TensorRT-LLM", "Ollama"] },
    ],
  },
  5: {
    i: 5,
    headline: "Agentic Layer",
    accent: "rose",
    cards: [
      { title: "Agent", body: "Goal-directed loop. Plans, calls tools, observes, retries until done.", icon: "🤖" },
      { title: "Skill", body: "Reusable capability — 'summarize policy', 'reconcile invoice'. Composed of tools + prompt.", icon: "🧩" },
      { title: "Tool", body: "Typed function the agent can call: SQL, REST, vector search, code exec.", icon: "🔧" },
      { title: "MCP", body: "Model Context Protocol — standard wire format for tools, resources, prompts.", icon: "🔌" },
      { title: "Orchestrator", body: "Routes between agents, enforces budget, timeout, guardrails.", icon: "🎯" },
    ],
    products: [
      { group: "Frameworks", items: ["LangGraph", "CrewAI", "AutoGen", "LlamaIndex Agents"] },
      { group: "Protocol", items: ["MCP", "OpenAI Tools", "A2A"] },
    ],
  },
  6: {
    i: 6,
    headline: "RAG — Runtime Grounding",
    accent: "cyan",
    cards: [
      { title: "Ingestion path", body: "Parse → chunk → embed → index. Runs offline; refreshed on document change.", icon: "📥" },
      { title: "Runtime path", body: "Query → embed → retrieve top-k → rerank → assemble prompt → LLM → cite.", icon: "⚡" },
      { title: "Grounding", body: "LLM is forced to answer only from retrieved chunks. Citations required.", icon: "📎" },
      { title: "Freshness", body: "No retraining needed — update the index, the answer updates.", icon: "🔄" },
    ],
  },
  7: {
    i: 7,
    headline: "Vector DB, Indexing & Metadata",
    accent: "indigo",
    cards: [
      { title: "Embedding = meaning vector", body: "High-dimensional float array. Cosine distance ≈ semantic similarity.", icon: "🧬" },
      { title: "ANN index", body: "HNSW / IVF-PQ for sub-linear search across millions of vectors.", icon: "🔍" },
      { title: "Metadata filters", body: "Tenant, doc-type, ACL, date. Filters applied pre- or post-ANN.", icon: "🏷️" },
      { title: "Hybrid search", body: "BM25 keyword + vector fused via RRF. Catches exact terms vectors miss.", icon: "⚖️" },
    ],
    products: [
      { group: "Vector DB", items: ["Pinecone", "Weaviate", "Qdrant", "Milvus", "Chroma", "pgvector", "Elastic"] },
      { group: "Embeddings", items: ["BGE-M3", "E5", "Nomic", "Voyage", "Cohere v3"] },
    ],
  },
  8: {
    i: 8,
    headline: "Search Patterns & Reranking",
    accent: "fuchsia",
    cards: [
      { title: "Dense retrieval", body: "Pure vector similarity. Strong on paraphrase, weak on rare terms.", icon: "🎯" },
      { title: "Sparse / BM25", body: "Lexical match. Strong on IDs, codes, names.", icon: "🔤" },
      { title: "Hybrid + RRF", body: "Reciprocal rank fusion combines both rankings.", icon: "⚖️" },
      { title: "Cross-encoder rerank", body: "Re-scores top-50 with a heavier model. Biggest quality lever in RAG.", icon: "📊" },
    ],
    products: [
      { group: "Rerankers", items: ["BGE-Reranker", "Cohere Rerank 3", "Jina Reranker", "Voyage Rerank"] },
    ],
  },
  9: {
    i: 9,
    headline: "Evaluation & Observability",
    accent: "teal",
    cards: [
      { title: "Retrieval metrics", body: "Recall@k, MRR, nDCG on a labeled question→chunk set.", icon: "📈" },
      { title: "Answer metrics", body: "Faithfulness, answer relevance, citation precision.", icon: "✅" },
      { title: "Online telemetry", body: "Latency, cost/query, thumbs, escalation rate.", icon: "📡" },
      { title: "Guardrails", body: "PII redaction, jailbreak detection, topical scope.", icon: "🛡️" },
    ],
    products: [
      { group: "Eval", items: ["Ragas", "TruLens", "DeepEval", "Phoenix"] },
      { group: "Observability", items: ["Langfuse", "LangSmith", "Helicone", "Arize"] },
    ],
  },
  10: {
    i: 10,
    headline: "Why Clients Ask for Private LLMs",
    accent: "amber",
    cards: [
      { title: "Data residency", body: "Regulators require data stays in-country / in-VPC.", icon: "🌍" },
      { title: "IP protection", body: "Source code, contracts, designs cannot leave the boundary.", icon: "🔐" },
      { title: "Cost at scale", body: "Per-token public APIs explode beyond ~1M queries/month.", icon: "💰" },
      { title: "Auditability", body: "Every prompt, retrieval and response logged & replayable.", icon: "🧾" },
    ],
  },
  11: {
    i: 11,
    headline: "Data Types, Storage & Retrieval",
    accent: "lime",
    cards: [
      { title: "Structured", body: "RDBMS, warehouse. Use text-to-SQL agents.", icon: "🗃️" },
      { title: "Unstructured docs", body: "PDF, DOCX, HTML → chunk → vector DB.", icon: "📄" },
      { title: "Semi-structured", body: "JSON, logs, tickets → hybrid index.", icon: "🧱" },
      { title: "Multimodal", body: "Images, scans, audio → vision/audio embeddings.", icon: "🖼️" },
    ],
    products: [
      { group: "Stores", items: ["Postgres + pgvector", "Snowflake Cortex", "Databricks Vector", "Elastic"] },
    ],
  },
  12: {
    i: 12,
    headline: "Private LLM Reference Architecture",
    accent: "blue",
    cards: [
      { title: "Edge / app", body: "Chat UI, API gateway, auth.", icon: "🖥️" },
      { title: "Orchestrator", body: "Agents, tools, guardrails, routing.", icon: "🎼" },
      { title: "Inference plane", body: "vLLM cluster, GPU autoscaling, model registry.", icon: "🧠" },
      { title: "Data plane", body: "Vector DB, doc store, structured DB, feature store.", icon: "🗂️" },
      { title: "Governance plane", body: "Audit, eval, PII, RBAC, observability.", icon: "🛡️" },
    ],
  },
  13: {
    i: 13,
    headline: "Governance & Responsible AI",
    accent: "red",
    cards: [
      { title: "Safety", body: "Toxicity, bias, hallucination guards. Per-tenant policies.", icon: "🛡️" },
      { title: "Security", body: "Prompt-injection defense, tool sandboxing, secret redaction.", icon: "🔐" },
      { title: "Privacy", body: "PII detection, masking, right-to-be-forgotten on the index.", icon: "🕵️" },
      { title: "Compliance", body: "EU AI Act, ISO 42001, SOC2, sector-specific (HIPAA, DPDP).", icon: "📜" },
    ],
  },
  14: {
    i: 14,
    headline: "Deployment Patterns",
    accent: "orange",
    cards: [
      { title: "SaaS public", body: "Fastest. No data control. POCs only.", icon: "☁️" },
      { title: "VPC-hosted", body: "Vendor model in customer cloud account.", icon: "🏢" },
      { title: "On-prem GPU", body: "Full sovereignty. Capex heavy. Needs MLOps team.", icon: "🏛️" },
      { title: "Air-gapped", body: "Defense / classified. Manual model updates.", icon: "🛰️" },
    ],
  },
  15: {
    i: 15,
    headline: "Strengths, Weaknesses & Fitment",
    accent: "yellow",
    cards: [
      { title: "Strengths", body: "Data control, cost predictability, customization, audit.", icon: "💪" },
      { title: "Weaknesses", body: "Capex, talent need, slower model refresh than frontier APIs.", icon: "⚠️" },
      { title: "Best fit", body: "BFSI, healthcare, government, legal, defense — regulated & high-volume.", icon: "🎯" },
    ],
  },
  16: {
    i: 16,
    headline: "Buying Center",
    accent: "pink",
    cards: [
      { title: "Economic buyer", body: "CIO / CDO. Cares about cost, time-to-value, risk.", icon: "💼" },
      { title: "Technical buyer", body: "Chief Architect, Head of Platform. Cares about fit & ops.", icon: "🛠️" },
      { title: "Risk buyer", body: "CISO, DPO, Compliance. Veto power on data flow.", icon: "🛡️" },
      { title: "User buyer", body: "Business unit head. Cares about adoption & accuracy.", icon: "👤" },
    ],
  },
  17: {
    i: 17,
    headline: "Presales Engagement Flow",
    accent: "purple",
    cards: [
      { title: "1. Discovery", body: "Use cases, data sensitivity, volume, latency, SLAs.", icon: "🔎" },
      { title: "2. Architecture workshop", body: "Reference arch → tailored arch. Identify integrations.", icon: "🏗️" },
      { title: "3. POC", body: "1–2 high-value use cases. Eval harness from day one.", icon: "🧪" },
      { title: "4. Production plan", body: "GPU sizing, MLOps, governance, support model.", icon: "🚀" },
    ],
  },
  18: {
    i: 18,
    headline: "Use Cases & Demo Storyline",
    accent: "amber",
    cards: [
      { title: "Document intelligence", body: "Policy, contract, claims assistants with citations.", icon: "📚" },
      { title: "Knowledge worker copilot", body: "Sales, support, ops copilots over private knowledge.", icon: "🧑‍💼" },
      { title: "Process agents", body: "Reconciliation, KYC, ticket triage end-to-end.", icon: "⚙️" },
      { title: "Demo arc", body: "Public LLM gap → Private RAG → Agentic → Governance dashboard.", icon: "🎬" },
    ],
  },
};
