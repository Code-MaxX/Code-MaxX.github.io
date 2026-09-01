/**
 * Terminal facts backing the command palette's introspection commands.
 *
 * The engineer profile itself lives in the markup — it is content, it must be
 * readable without JavaScript, and a screen reader should meet it as a list,
 * not as a rendering target.
 */

/** Terminal-style facts used by the command palette (`whoami`, `uptime`, …). */
export const systemFacts = {
  whoami: [
    "sahil.ghule",
    "role      : Backend & AI Systems Engineer",
    "location  : Bengaluru, India",
    "shipping  : 3+ years, production Python",
    "focus     : distributed services · analytical data · applied GenAI",
  ],
  uptime: [
    "since 2023-02 — 3+ years shipping production systems",
    "current  : UrbanPiper · Software Engineer II",
    "previous : Apperture AI, Cogoport",
    "load avg : ~1M events/day",
  ],
  stack: [
    "languages : Python, SQL, C++",
    "apis      : FastAPI, GraphQL, gRPC, Flask",
    "async     : ARQ, RQ, Redis, asyncio, Playwright",
    "data      : ClickHouse, PostgreSQL, MongoDB",
    "ai/ml     : RAG, Random Forest, Scikit-learn, Pandas",
  ],
} as const;
