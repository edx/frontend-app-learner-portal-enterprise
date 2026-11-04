# Personalized Search (chat)

The learner portal's Personalized Search tab: a streaming chat that composes a learning page from the learner's enterprise catalog. The tab is shown when `enterpriseFeatures.enterprisePersonalizedSearchEnabled` is on.

- [Tech spec](personalized-search-tech-spec.md), drawn at C4 levels 1–3 (`diagrams/`).
- The code is in `src/components/dashboard/main-content/personalized-search/`. Each module has its own README:
  - `core/`: framework-free TypeScript (stream types, SSE parser, reducer, transports, workflows)
  - `ui/` and `blocks/`: props-only Paragon components and an extensible block registry
  - `adapters/portal/`: the only module that imports the host app
  - `feature/`: the store, the controller and the tab
- The server side is enterprise-access `/api/v1/personalized-search/`. Its stream contract is published as JSON Schemas in enterprise-access `personalized_search/core/schemas/`.
