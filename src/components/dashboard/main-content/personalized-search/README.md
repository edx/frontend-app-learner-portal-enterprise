# Personalized Search (Chat)

The learner portal tab where a learner chats and an AI-composed learning page fills in beside the chat. The code is layered so other hosts can reuse it (KD-10):

| Folder | What it is | May import |
| --- | --- | --- |
| `core/` | Framework-free TypeScript: stream types, `parseSse`, the `applyPart` reducer, transports, workflows, selectors, API clients | nothing outside `core/` (no React, no `@edx/*`) |
| `ui/` | Presentational Paragon components with props-only APIs, plus `messages.ts` | `core/`, `blocks/` |
| `feature/` | The tab, its controller and store; takes host dependencies as `PersonalizedSearchDeps` | `core/`, `ui/`, `blocks/` |
| `adapters/portal/` | The learner portal's implementation of those dependencies (config, auth, routes, enterprise) | anything |

`guards.test.ts` enforces these boundaries.
