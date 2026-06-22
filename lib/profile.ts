// ============================================================
// Your profile — drives all tailoring (pitches + partnership angles).
// Edit this file to change how outreach is generated. No other code change needed.
// ============================================================

export const PROFILE = {
  targetRole: "AI Product Manager (0→1 builder)",
  altRoles: ["Product Manager", "Founding PM", "AI PM", "Product Lead"],

  offer: {
    builds: "ships AI products end-to-end (RAG, evals, LLM pipelines) using Next.js + Supabase + Groq",
    expertise: "AI evaluation, retrieval (hybrid BM25 + vector), multi-stage LLM grading, edtech",
    content: "writes a chemistry-meets-AI newsletter and builds in public on LinkedIn",
  },

  // partnership angles get generated against these
  sectors: ["edtech", "ai_tools", "consumer", "fintech"],

  // tone hints
  voice: "direct, concrete, no corporate filler; short hooks; specific over clever",
};

// keywords that mark a role as PM-relevant during enrichment
export const PM_KEYWORDS = [
  "product manager", "product management", "pm,", "founding pm",
  "product lead", "head of product", "ai pm", "product owner",
  "associate product", "group product", "principal product",
];
