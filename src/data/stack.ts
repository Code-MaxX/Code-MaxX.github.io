/**
 * Systems map: technologies as a dependency network rather than a badge wall.
 *
 * Positions are polar-derived and fixed. A force simulation would look busier
 * and cost a render loop; a deterministic layout draws once and stays put.
 */

export type StackGroup = "language" | "api" | "async" | "data" | "ml";

export type StackNode = {
  id: string;
  label: string;
  group: StackGroup;
  x: number;
  y: number;
  /** Visual weight — hub technologies read larger. */
  weight: 1 | 2 | 3;
  /** What it actually does in my work. */
  role: string;
  /** Systems (roles/projects) it appears in. */
  usedIn: string[];
  /** Downstream consequence — the "so what". */
  outcome: string;
};

export type StackEdge = { a: string; b: string };

export const stackNodes: StackNode[] = [
  {
    id: "python",
    label: "Python",
    group: "language",
    x: 500,
    y: 330,
    weight: 3,
    role: "Primary language for services, workers, pipelines and models.",
    usedIn: ["Periscope", "Apperture AI", "Cogoport", "Every project"],
    outcome: "One language across the request path, the async path and the data path.",
  },
  {
    id: "fastapi",
    label: "FastAPI",
    group: "api",
    x: 500,
    y: 165,
    weight: 3,
    role: "Async service layer — ingest endpoints and analytics APIs.",
    usedIn: ["Periscope"],
    outcome: "Request handling stays non-blocking; heavy work is handed to the queue.",
  },
  {
    id: "clickhouse",
    label: "ClickHouse",
    group: "data",
    x: 657,
    y: 279,
    weight: 3,
    role: "Columnar analytical store: schema modelling, aggregation strategy, query tuning.",
    usedIn: ["Periscope", "Apperture AI"],
    outcome: "Analytical reads stay fast as event volume grows.",
  },
  {
    id: "arq",
    label: "ARQ",
    group: "async",
    x: 597,
    y: 463,
    weight: 2,
    role: "Async job queue. Migrated execution here from RQ.",
    usedIn: ["Periscope"],
    outcome: "3× worker concurrency, 42% faster end-to-end job processing.",
  },
  {
    id: "pandas",
    label: "Pandas",
    group: "ml",
    x: 403,
    y: 463,
    weight: 1,
    role: "Tabular transformation for ETL, analysis and feature preparation.",
    usedIn: ["Cogoport", "Data analytics work"],
    outcome: "Fast iteration between raw operational data and model-ready tables.",
  },
  {
    id: "sql",
    label: "SQL",
    group: "language",
    x: 343,
    y: 279,
    weight: 3,
    role: "Analytical query design and optimisation over large distributed datasets.",
    usedIn: ["Periscope", "Apperture AI", "Cogoport"],
    outcome: "Query cost is designed in, not discovered in production.",
  },
  {
    id: "graphql",
    label: "GraphQL",
    group: "api",
    x: 312,
    y: 90,
    weight: 2,
    role: "Flexible query surface for analytical dashboards.",
    usedIn: ["Apperture AI"],
    outcome: "One API contract over several storage engines.",
  },
  {
    id: "grpc",
    label: "gRPC",
    group: "api",
    x: 688,
    y: 90,
    weight: 2,
    role: "Reusable typed services for large-scale data access.",
    usedIn: ["Apperture AI"],
    outcome: "Other teams read the analytical store without re-implementing access.",
  },
  {
    id: "postgresql",
    label: "PostgreSQL",
    group: "data",
    x: 803,
    y: 298,
    weight: 2,
    role: "Relational store for transactional and service-owned state.",
    usedIn: ["Backend services"],
    outcome: "Correctness-first storage next to the analytical store.",
  },
  {
    id: "mongodb",
    label: "MongoDB",
    group: "data",
    x: 774,
    y: 464,
    weight: 2,
    role: "Document storage behind dashboard and retrieval workloads.",
    usedIn: ["Apperture AI"],
    outcome: "Schema-flexible context for the RAG pipeline.",
  },
  {
    id: "playwright",
    label: "Playwright",
    group: "async",
    x: 594,
    y: 620,
    weight: 2,
    role: "Distributed crawling and indexing for real-world data acquisition.",
    usedIn: ["Periscope"],
    outcome: "Ground-truth data collected automatically instead of manually.",
  },
  {
    id: "sklearn",
    label: "Scikit-learn",
    group: "ml",
    x: 406,
    y: 620,
    weight: 2,
    role: "Classical modelling — Random Forest pricing models and comparative studies.",
    usedIn: ["Cogoport", "ICICCS publication"],
    outcome: "Models that ship, not notebooks that don't.",
  },
  {
    id: "cpp",
    label: "C++",
    group: "language",
    x: 213,
    y: 434,
    weight: 1,
    role: "Systems-level fundamentals: memory, data structures, algorithmic cost.",
    usedIn: ["Foundations"],
    outcome: "An instinct for what an abstraction is actually doing underneath.",
  },
];

export const stackEdges: StackEdge[] = [
  { a: "python", b: "fastapi" },
  { a: "python", b: "sql" },
  { a: "python", b: "arq" },
  { a: "python", b: "pandas" },
  { a: "python", b: "playwright" },
  { a: "python", b: "sklearn" },
  { a: "python", b: "cpp" },
  { a: "python", b: "clickhouse" },
  { a: "sql", b: "clickhouse" },
  { a: "sql", b: "postgresql" },
  { a: "fastapi", b: "graphql" },
  { a: "fastapi", b: "grpc" },
  { a: "fastapi", b: "arq" },
  { a: "fastapi", b: "clickhouse" },
  { a: "fastapi", b: "postgresql" },
  { a: "arq", b: "clickhouse" },
  { a: "arq", b: "playwright" },
  { a: "pandas", b: "sklearn" },
  { a: "pandas", b: "clickhouse" },
  { a: "graphql", b: "mongodb" },
  { a: "grpc", b: "clickhouse" },
];

export const stackGroupLabels: Record<StackGroup, string> = {
  language: "Languages",
  api: "APIs & Services",
  async: "Async & Automation",
  data: "Data Systems",
  ml: "ML & Analysis",
};

/** Adjacency, computed once at module load. */
export const stackAdjacency: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const node of stackNodes) map[node.id] = [];
  for (const edge of stackEdges) {
    map[edge.a]?.push(edge.b);
    map[edge.b]?.push(edge.a);
  }
  return map;
})();
