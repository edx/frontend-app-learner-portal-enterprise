# 0019. Use Zustand for Learner Pathways state management

## Context

### Learner Pathways workflow

The Learner Pathways experience is scoped to the Dashboard Pathways tab and spans multiple workflow states: onboarding quiz, learner profile review, career match selection, pathway course listing, progress summaries, and future loading/error handling for API-backed hydration.

Even in scaffold form, this state is shared across sibling and nested Pathways UI surfaces. The feature also requires reset behavior for flows such as redoing onboarding or starting a new pathway.

### State management requirements

This feature needs a typed, feature-local, resettable state container that:

* can represent all tab-contained workflow states without requiring UI remounts,
* is consumable through narrow selectors/hooks to avoid broad re-renders,
* remains testable through store APIs (for example, `usePathwaysStore.getState()`), and
* remains independent from API orchestration, persistence, and UI concerns during scaffold phases.

### Alternatives considered

* **React local state**: simple per component, but insufficient for shared cross-section Pathways workflow state without prop drilling.
* **React Context**: workable, but would require broad context values or multiple providers for this feature and increase avoidable render churn/coupling.
* **Redux**: powerful, but higher ceremony than needed for this feature-scoped scaffold and inconsistent with the lightweight requirement.
* **Zustand**: small, typed, feature-local store with simple setters, narrow subscriptions, and straightforward reset behavior.

## Architecture Overview

```text
Learner Pathways Architecture (Layered)

                UI Layer
  +-------------------------------------------+
  | AiPathwaysPage                            |
  | Onboarding Components                     |
  | Profile Components                        |
  | Career Selection                          |
  | Pathway Results                           |
  +--------------------+----------------------+
                       |
                       v
            Controller Layer
  +-------------------------------------------+
  | usePathwaysController                     |
  +--------------------+----------------------+
                       |
                       v
             Workflow Layer
  +-------------------------------------------+
  | generateProfileWorkflow                   |
  | generatePathwayWorkflow                   |
  +--------------------+----------------------+
                       |
                       v
              Service Layer
  +-------------------------------------------+
  | xpertService                              |
  | taxonomyService                           |
  | catalogService                            |
  | discoveryRagService                       |
  +--------------------+----------------------+
                       |
                       v
            External Systems
  +-------------------------------------------+
  | Xpert                                     |
  | Discovery APIs                            |
  | Algolia                                   |
  | Future services                           |
  +-------------------------------------------+

  Shared State Layer (beside orchestration):
  +-------------------------------------------+
  | Zustand Store                             |
  | State Only                                |
  | - section                                 |
  | - learnerProfile                          |
  | - careerMatches                           |
  | - selectedCareerId                        |
  | - pathwayCourses                          |
  | - progress                                |
  | - loading                                 |
  | - errors                                  |
  +-------------------------------------------+

  Rules:
  - UI never calls services directly.
  - Controllers coordinate workflows.
  - Workflows coordinate services.
  - Services communicate with external systems.
  - Zustand is shared client state, not orchestration.
```

```text
State Management Alternatives (Feature Scope)

+--------------------+-------------------------------------------+----------------------+
| Option             | Fit for Learner Pathways                 | Notes                |
+--------------------+-------------------------------------------+----------------------+
| React Local State  | Low                                       | Good for isolated    |
|                    |                                           | state; poor cross-   |
|                    |                                           | workflow sharing.    |
+--------------------+-------------------------------------------+----------------------+
| React Context      | Medium                                    | Possible, but broad  |
|                    |                                           | provider subscriptions|
|                    |                                           | and rerender risk for|
|                    |                                           | multi-section flow.  |
+--------------------+-------------------------------------------+----------------------+
| Redux              | Medium                                    | Powerful, but adds   |
|                    |                                           | boilerplate and      |
|                    |                                           | complexity beyond    |
|                    |                                           | feature scope.       |
+--------------------+-------------------------------------------+----------------------+
| Zustand            | High (selected)                           | Lightweight, typed,  |
|                    |                                           | feature-scoped,      |
|                    |                                           | selective subscriptions,|
|                    |                                           | simple reset, testable|
|                    |                                           | without mounted UI.  |
+--------------------+-------------------------------------------+----------------------+
```

### Why Zustand Fits Learner Pathways

The Pathways workflow spans onboarding, profile review, career selection, generated pathways, and progress tracking. Multiple sibling components need shared access to this state, and prop drilling would become difficult to maintain. React Context can solve sharing but tends to widen rerender boundaries for this kind of multi-section workflow. Redux is capable, but introduces additional ceremony that is not justified for this feature-scoped state layer. Zustand provides a small colocated store with narrow selectors and simple reset semantics.

### Architectural Boundaries

State ownership and orchestration are intentionally separated.

* Zustand owns state.
* Controllers coordinate user actions.
* Workflows coordinate business processes.
* Services integrate with external systems.

The Zustand store should remain a shared state container and must not evolve into an orchestration layer.

## Decision

Learner Pathways will use a colocated Zustand store under the Pathways feature area.

The store will contain:

* typed state values,
* simple synchronous setters,
* narrow selectors/hooks, and
* reset behavior for restart flows.

The store will not contain API calls, business orchestration, persistence, or UI rendering logic.

## Consequences

* Avoids prop drilling and broad context-based re-renders for tab-contained Pathways state.
* Keeps state management feature-local, typed, and testable without mounting React components.
* Avoids Redux ceremony for a scoped workflow scaffold.
* Allows future API hooks/services to hydrate store slices incrementally.
* Requires maintainers to keep orchestration concerns outside the store.
* If Pathways state becomes backend-authoritative across broader application surfaces, this decision should be revisited.
