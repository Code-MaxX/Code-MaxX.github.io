/**
 * Deep case-study content for the project files.
 *
 * The cards themselves live in the markup — they must be readable, indexable
 * and available without JavaScript. Only the expanded study, which is a
 * progressive enhancement, is held here. Keyed by the card's `data-project`.
 *
 * Every field is drawn from the résumé or the public repositories. Where a
 * metric does not exist, none is claimed.
 */

export type CaseSection = { heading: string; body: string; items?: string[] };

export const caseStudies: Record<string, CaseSection[]> = {
  "prostate": [
      {
        heading: "Problem",
        body: "Prognosis work is only useful when a clinician-facing input actually reaches a trained model. A notebook that scores well offline solves nothing on its own — the model has to be reachable, reproducible and running somewhere.",
      },
      {
        heading: "Approach",
        body: "Treat the model as one component in a small system rather than the whole deliverable: train and evaluate offline, freeze the artefact, then wrap it in a thin request/response surface that anyone can hit.",
      },
      {
        heading: "Architecture",
        body: "A single-service design chosen deliberately for the scale involved.",
        items: [
          "Input form → validation layer → feature vector assembly",
          "Trained DNN artefact loaded once at process start, held in memory",
          "Flask request handler performs inference and returns a probability",
          "Deployed to cloud infrastructure as a long-running service",
        ],
      },
      {
        heading: "Implementation",
        body: "Python end to end. The training pipeline and the serving path share the same preprocessing code, so a feature is built identically in both places — the failure mode that quietly breaks most deployed models.",
      },
      {
        heading: "Result",
        body: "A working, deployed prediction application rather than an offline experiment. The comparative modelling work behind it became a peer-reviewed ICICCS publication.",
      },
  ],
  "powerplant": [
      {
        heading: "Problem",
        body: "Full-load electrical output varies with ambient operating conditions. Predicting it lets operators reason about efficiency before committing to a dispatch decision rather than after.",
      },
      {
        heading: "Approach",
        body: "Frame it as a supervised regression problem over recorded operating conditions, then compare model families on the same split instead of tuning a single favourite.",
      },
      {
        heading: "Architecture",
        body: "A reproducible offline pipeline — the shape most analytical modelling work should take before anything is served.",
        items: [
          "Ingest recorded operating conditions into a tabular frame",
          "Clean, normalise and split with a fixed seed",
          "Train several regressors under identical conditions",
          "Compare on held-out error rather than training fit",
        ],
      },
      {
        heading: "Implementation",
        body: "Pandas for transformation, Scikit-learn for the model families, with the comparison expressed as data so results could be re-derived rather than remembered.",
      },
      {
        heading: "Result",
        body: "A model comparison grounded in held-out performance, framed around the operational decision it was meant to inform.",
      },
  ],
  "blockchain-tiktok": [
      {
        heading: "Problem",
        body: "Short-form media platforms centralise both the content and the ledger of who owns it. The interesting question is what changes structurally when the ownership record moves off the platform.",
      },
      {
        heading: "Approach",
        body: "Build the familiar client experience first, then swap the assumed-central pieces for on-chain equivalents and see which product affordances survive contact with them.",
      },
      {
        heading: "Architecture",
        body: "A conventional client shell over an unconventional persistence story.",
        items: [
          "TypeScript frontend rendering the feed",
          "Blockchain integration layer for identity and ownership records",
          "Content addressing kept separate from the ownership ledger",
        ],
      },
      {
        heading: "Implementation",
        body: "Written as an exploration rather than a product — the point was to feel the latency, cost and consistency trade-offs first-hand instead of reading about them.",
      },
      {
        heading: "Result",
        body: "A working prototype and a concrete sense of which parts of a media product a decentralised ledger genuinely improves — and which it simply makes slower.",
      },
  ],
  "analytics": [
      {
        heading: "Problem",
        body: "Analytical intuition is not transferable by reading. It comes from repeatedly meeting datasets that are messier than the question being asked of them.",
      },
      {
        heading: "Approach",
        body: "Work through real datasets end to end — load, interrogate, clean, visualise, conclude — and keep the reasoning in the notebook rather than only the result.",
      },
      {
        heading: "Architecture",
        body: "Deliberately lightweight: the artefact is the reasoning, not the runtime.",
        items: [
          "Jupyter notebooks as the unit of work",
          "Pandas for transformation, SQL where the data already lived",
          "Visualisation used to interrogate, not to decorate",
        ],
      },
      {
        heading: "Implementation",
        body: "Each study stands alone and is re-runnable from a clean environment, so a conclusion can always be traced back to the transformation that produced it.",
      },
      {
        heading: "Result",
        body: "The habit that later showed up in production work: model the query shape before the schema, and never trust an aggregate you cannot re-derive.",
      },
  ],
};
