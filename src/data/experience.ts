/**
 * Professional experience + the architecture behind each role.
 *
 * Graph geometry lives here (not in the component) so the visualisation is
 * deterministic: no physics simulation, no layout thrash, identical every
 * render. Coordinates are in the SVG user space declared by `viewBox`.
 */

export type NodeKind =
  | "source" /* data entering the system      */
  | "service" /* request/response surface      */
  | "queue" /* broker / buffer               */
  | "worker" /* async compute                 */
  | "store" /* persistence                   */
  | "output" /* what a human or client sees   */
  | "model"; /* ML / AI component             */

export type ArchNode = {
  id: string;
  label: string;
  sub: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Plain-language explanation surfaced on hover/focus. */
  detail: string;
};

export type ArchEdge = {
  from: string;
  to: string;
  label?: string;
  /** Dashed edges are control/read paths rather than the main data flow. */
  dashed?: boolean;
  /** Curvature: 0 = straight, +/- bows the edge to avoid overlaps. */
  bow?: number;
};

export type Architecture = {
  viewBox: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
};

export type Role = {
  id: string;
  company: string;
  role: string;
  period: string;
  start: string;
  end: string;
  location: string;
  system: string;
  systemTagline: string;
  architecture: Architecture;
};

export const roles: Role[] = [
  {
    id: "urbanpiper",
    company: "UrbanPiper",
    role: "Software Engineer II",
    period: "Aug 2025 – Present",
    start: "2025-08",
    end: "present",
    location: "Bengaluru, India",
    system: "Periscope",
    systemTagline:
      "A distributed availability & downtime analytics platform for enterprise food-delivery operators.",
    architecture: {
      viewBox: "0 0 1120 680",
      nodes: [
        {
          id: "poll",
          label: "Availability Polling",
          sub: "15-min interval",
          kind: "source",
          x: 122,
          y: 118,
          detail:
            "Every store is checked on a 15-minute cadence — 96 checks per store per day, ~1M events daily across 10,000+ stores.",
        },
        {
          id: "crawl",
          label: "Playwright Crawler",
          sub: "indexing",
          kind: "source",
          x: 122,
          y: 392,
          detail:
            "Distributed crawling and indexing pipelines acquire real-world catalogue and availability data straight from live surfaces.",
        },
        {
          id: "api",
          label: "FastAPI",
          sub: "async service layer",
          kind: "service",
          x: 312,
          y: 255,
          detail:
            "The async Python service layer: accepts ingest, exposes analytics endpoints, and enqueues everything that should not run in the request path.",
        },
        {
          id: "redis",
          label: "Redis",
          sub: "job broker",
          kind: "queue",
          x: 505,
          y: 115,
          detail:
            "Durable queue between the API and the workers. Work is handed off here so ingestion never blocks on computation.",
        },
        {
          id: "arq",
          label: "ARQ Workers",
          sub: "migrated from RQ",
          kind: "worker",
          x: 505,
          y: 295,
          detail:
            "Async worker pool. Migrating job execution from RQ to ARQ raised concurrency 3× and cut end-to-end processing time by 42%.",
        },
        {
          id: "sched",
          label: "Scheduling",
          sub: "automation workflows",
          kind: "worker",
          x: 505,
          y: 462,
          detail:
            "Large-scale scheduling and automation workflows integrating multiple external systems — 70% less manual operational effort.",
        },
        {
          id: "etl",
          label: "ETL / Backfill",
          sub: "millions of records",
          kind: "worker",
          x: 738,
          y: 388,
          detail:
            "Backfill pipelines rebuild historical windows into query-ready datasets without disrupting live workloads.",
        },
        {
          id: "clickhouse",
          label: "ClickHouse",
          sub: "analytical store",
          kind: "store",
          x: 738,
          y: 172,
          detail:
            "Columnar analytical store. Schemas and SQL are modelled around the read patterns so analytical queries stay fast as data volume grows.",
        },
        {
          id: "analytics",
          label: "Availability Analytics",
          sub: "timeseries · downtime",
          kind: "output",
          x: 972,
          y: 255,
          detail:
            "Availability timeseries and downtime computation — the product surface enterprise customers actually read.",
        },
      ],
      edges: [
        { from: "poll", to: "api", label: "~1M events/day" },
        { from: "crawl", to: "api", label: "indexed data" },
        { from: "api", to: "redis", label: "enqueue" },
        { from: "redis", to: "arq", label: "dispatch" },
        { from: "sched", to: "arq", label: "schedule" },
        { from: "arq", to: "clickhouse", label: "write" },
        { from: "arq", to: "etl", label: "backfill jobs" },
        { from: "etl", to: "clickhouse", label: "bulk load" },
        { from: "clickhouse", to: "analytics", label: "aggregate" },
        // The read path gets its own lane below the diagram rather than
        // cutting back through the middle of the system it serves.
        { from: "analytics", to: "api", label: "query", dashed: true, bow: -700 },
      ],
    },
  },
  {
    id: "apperture",
    company: "Apperture AI",
    role: "Software Engineer",
    period: "May 2024 – Aug 2025",
    start: "2024-05",
    end: "2025-08",
    location: "Remote",
    system: "Availability Intelligence & Applied GenAI",
    systemTagline:
      "Analytical dashboards over food-delivery availability data, plus a production RAG pipeline shipped inside a live product.",
    architecture: {
      viewBox: "0 0 1120 640",
      nodes: [
        {
          id: "feeds",
          label: "Availability Feeds",
          sub: "store · item level",
          kind: "source",
          x: 118,
          y: 140,
          detail:
            "Store- and item-level availability signals collected across food-delivery ecosystems.",
        },
        {
          id: "grpc",
          label: "gRPC Services",
          sub: "generic query layer",
          kind: "service",
          x: 305,
          y: 140,
          detail:
            "Reusable gRPC services giving other teams efficient, typed access to large analytical datasets.",
        },
        {
          id: "graphql",
          label: "GraphQL API",
          sub: "dashboard surface",
          kind: "service",
          x: 305,
          y: 360,
          detail:
            "The dashboard-facing API. One flexible query surface over several storage engines.",
        },
        {
          id: "clickhouse",
          label: "ClickHouse",
          sub: "schema + aggregation",
          kind: "store",
          x: 540,
          y: 140,
          detail:
            "Analytical storage designed for the query shape: schema design, aggregation strategy and query tuning to sustain large workloads.",
        },
        {
          id: "mongo",
          label: "MongoDB",
          sub: "documents",
          kind: "store",
          x: 540,
          y: 360,
          detail: "Document storage backing the operational side of the dashboards.",
        },
        {
          id: "trends",
          label: "Trend Analysis",
          sub: "real-time",
          kind: "output",
          x: 775,
          y: 140,
          detail:
            "Real-time trend analysis over the analytical store, surfaced through the dashboards.",
        },
        {
          id: "rag",
          label: "RAG Pipeline",
          sub: "retrieval + generation",
          kind: "model",
          x: 775,
          y: 360,
          detail:
            "Production Retrieval-Augmented Generation pipeline — the AI capability users interact with inside the live product.",
        },
        {
          id: "training",
          label: "Training-Data Automation",
          sub: "reproducible workflows",
          kind: "worker",
          x: 250,
          y: 565,
          detail:
            "Reproducible Python workflows that generate AI training data automatically — 70% less dataset preparation time.",
        },
        {
          id: "extract",
          label: "Parameter Extraction",
          sub: "models",
          kind: "model",
          x: 566,
          y: 565,
          detail:
            "Parameter-extraction models integrated into the retrieval pipeline to turn free text into structured query parameters.",
        },
        {
          id: "dash",
          label: "Analytical Dashboards",
          sub: "product surface",
          kind: "output",
          x: 990,
          y: 250,
          detail:
            "The customer-facing dashboards that monitor availability and expose the AI-powered capability.",
        },
      ],
      edges: [
        { from: "feeds", to: "grpc", label: "ingest" },
        { from: "feeds", to: "graphql", label: "", bow: 20 },
        { from: "grpc", to: "clickhouse", label: "read/write" },
        { from: "graphql", to: "mongo" },
        { from: "graphql", to: "clickhouse", label: "aggregate", bow: -30 },
        { from: "clickhouse", to: "trends", label: "query" },
        { from: "mongo", to: "rag", label: "context" },
        { from: "trends", to: "dash" },
        { from: "rag", to: "dash", label: "generate" },
        { from: "training", to: "extract", label: "datasets" },
        { from: "extract", to: "rag", label: "parameters" },
      ],
    },
  },
  {
    id: "cogoport",
    company: "Cogoport",
    role: "Software Development Engineer I",
    period: "Feb 2023 – Oct 2023",
    start: "2023-02",
    end: "2023-10",
    location: "Mumbai, India",
    system: "Dynamic Pricing for Logistics",
    systemTagline:
      "Machine-learning pricing models deployed to production for real-time recommendations on large-scale logistics data.",
    architecture: {
      viewBox: "0 0 1140 500",
      nodes: [
        {
          id: "ops",
          label: "Logistics Data",
          sub: "large-scale operational",
          kind: "source",
          x: 110,
          y: 250,
          detail:
            "Large-scale operational logistics data — the raw material for both the dashboards and the pricing models.",
        },
        {
          id: "quality",
          label: "Data Quality",
          sub: "cleaning + validation",
          kind: "worker",
          x: 340,
          y: 400,
          detail:
            "Data-quality improvements: one of the two levers that lifted pricing prediction accuracy by 15%.",
        },
        {
          id: "features",
          label: "Feature Engineering",
          sub: "signal extraction",
          kind: "worker",
          x: 340,
          y: 110,
          detail:
            "Feature engineering over operational data — the second lever behind the 15% accuracy gain.",
        },
        {
          id: "rf",
          label: "Random Forest",
          sub: "pricing model",
          kind: "model",
          x: 590,
          y: 250,
          detail:
            "Random Forest dynamic-pricing model, trained in Python and promoted to production.",
        },
        {
          id: "serve",
          label: "Pricing Service",
          sub: "real-time",
          kind: "service",
          x: 812,
          y: 250,
          detail:
            "Serves real-time pricing recommendations from the deployed model.",
        },
        {
          id: "dash",
          label: "Analytics Dashboards",
          sub: "operator-facing",
          kind: "output",
          x: 1022,
          y: 250,
          detail: "Logistics analytics dashboards backed by these services.",
        },
      ],
      edges: [
        { from: "ops", to: "features", label: "extract" },
        { from: "ops", to: "quality", label: "validate" },
        { from: "features", to: "rf", label: "train" },
        { from: "quality", to: "rf" },
        { from: "rf", to: "serve", label: "deploy" },
        { from: "serve", to: "dash", label: "recommend" },
      ],
    },
  },
];
