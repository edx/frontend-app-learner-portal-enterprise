# 0020. Learner Pathway Step Rendering Under a Single Dashboard Route

## Status

Accepted (June 2026)

## Context

The Learner Pathway experience is exposed from the existing learner dashboard under the Pathways tab. Within that experience, the learner progresses through three sequential views:

1. **Intake Form** — the learner provides goals, background, preferences, and other inputs used to build a learner profile.
2. **Pathway Profile** — the learner reviews the generated profile and selects or confirms the career/profile direction.
3. **Pathway Courses** — the learner views the generated pathway courses and can act on the recommendations.

Although these views are presented visually as tabs or step controls, they are not independent application pages. Each later step depends on state produced by an earlier step:

```
START
  │
  ▼
INTAKE FORM
  │  submit intake / generate profile
  ▼
PATHWAY PROFILE
  │  select career / build pathway
  ▼
PATHWAY COURSES

```

Using distinct routes for each step, such as `/:enterpriseSlug/pathways/intake`, `/:enterpriseSlug/pathways/profile`, and `/:enterpriseSlug/pathways/courses`, would imply that each step is directly addressable and independently valid. That is not true for this workflow. For example, the Pathway Profile view should not render until the Intake Form has been completed, and the Pathway Courses view should not render until a profile/career selection has been made and the pathway has been generated.

The broader frontend architecture still generally favors explicit routes, route loaders, and React Query for standard page-level navigation. Route loaders are useful when a route represents a durable page boundary, can fetch all required data before rendering, benefits from parallel loader execution, and can rely on React Query cache freshness during route transitions.

This decision intentionally narrows that guidance for the Learner Pathway workflow. These steps are part of a single stateful flow inside the dashboard, not separate page-level destinations.

## Decision

The Learner Pathway steps will **not** be given distinct routes. All three views will remain under the existing dashboard route, and the active view will be selected through component rendering controlled by pathway state.

At a high level:

```
/:enterpriseSlug  (dashboard route)
└── Dashboard
    └── Pathways tab
        └── LearnerPathwayContainer
            ├── currentStep = INTAKE   → render IntakeForm
            ├── currentStep = PROFILE  → render PathwayProfile
            └── currentStep = COURSES  → render PathwayCourses
```

The tab or step UI should be treated as a state transition control, not as route navigation. Clicking between Learner Pathway steps should update the pathway state only when the target step is valid for the learner's current progress.

The implementation should preserve a single canonical browser route for the dashboard/pathways experience and derive the visible step from state such as:

- the current in-memory pathway step;
- persisted incomplete pathway progress, where applicable;
- completed pathway state, where applicable;
- the presence or absence of prerequisite data, such as a generated profile, selected career, or generated pathway courses.

## Rationale

### 1. The pathway steps are sequential, not independently addressable pages

The Intake Form, Pathway Profile, and Pathway Courses views form a single gated workflow. A route-per-step model would make invalid states easy to reach through direct URL entry, browser history, reloads, bookmarks, or copied links.

For example:

```
Rejected route model:

/:enterpriseSlug/pathways/intake
  → valid as an entry point

/:enterpriseSlug/pathways/profile
  → must check whether intake has completed
  → must redirect if profile data does not exist

/:enterpriseSlug/pathways/courses
  → must check whether intake and profile selection have completed
  → must redirect if pathway data does not exist
```

Keeping the workflow under one route lets the container own the step prerequisites directly. The UI can render the first valid step for the learner's current state without creating route states that the product does not intend to support.

### 2. It avoids route guard and redirect complexity

If each step had its own route, each route loader or component would need to enforce the same sequential rules:

- a learner cannot view the profile step before submitting intake;
- a learner cannot view pathway courses before selecting or confirming a profile/career;
- a learner may need to be redirected to the latest valid step after refresh;
- a learner may need different behavior when starting over, adjusting a pathway, or resuming an incomplete pathway.

That logic would either be duplicated across loaders or centralized into route guard utilities that still need to reason about every possible invalid URL state. Since the steps are already controlled by a single state machine, route-level redirects add more surface area than value for the current product requirements.

### 3. It keeps pathway state consistent across step transitions

The pathway flow depends on transient state and generated state that changes as the learner progresses. Keeping the steps within one route reduces the risk of the URL, component state, browser storage, and React Query cache disagreeing about which step should render.

The expected model is:

```
User action
  → update pathway state
  → persist relevant progress, where applicable
  → render next valid component
  → emit telemetry/log context for the active step
```

This keeps the flow centered around completed user actions instead of around URL transitions.

### 4. It prevents unnecessary loader revalidation, remounts, and BFF reseeding

Route transitions can cause route loaders to run, nested route components to remount, or shared loader revalidation logic to execute depending on route configuration. That is useful for normal page transitions, but it is not desirable for the Learner Pathway step transitions.

For this workflow, changing from Intake Form to Pathway Profile or from Pathway Profile to Pathway Courses should not imply a new page load boundary. The transition should not accidentally trigger unnecessary API calls, refresh dashboard-level data, or reseed data from the Backend-for-Frontend (BFF) layer.

The BFF and React Query cache should still be used where appropriate. The decision is specifically that step changes are not the mechanism used to refetch or revalidate pathway data.

### 5. Loading states are part of the workflow, not a route-level fetch problem

For standard page navigation, route loaders help avoid a Fetch-On-Render pattern by fetching route data before the UI renders. In the Learner Pathway flow, some loading states are directly caused by explicit learner actions, such as submitting intake to generate a profile or building a pathway from a selected career.

Those loading states are part of the product experience. Moving the steps into routes would not remove the need to show progress while profile or pathway generation is happening, and it would add redirect and revalidation concerns around the same workflow.

## Monitoring and Observability

A known tradeoff of a single dashboard route is reduced granularity in route-based monitoring tools. Route names alone will not reveal whether a failure happened during Intake Form, Pathway Profile, or Pathway Courses rendering.

To mitigate this, pathway observability should model the internal step explicitly. Errors, logs, analytics events, and RUM actions should include the active pathway step and operation.

Example error context:

```typescript
logError(error, {
  feature: 'learner_pathway',
  pathwayStep: currentStep,
  operation: 'generate_profile',
  enterpriseCustomerUuid,
});
```

Recommended fields:

| Field | Purpose |
|------|---------|
| `feature` | Identifies the Learner Pathway feature area |
| `pathwayStep` | Identifies `intake`, `profile`, or `courses` |
| `operation` | Identifies the failing operation, such as `submit_intake`, `generate_profile`, `select_career`, or `generate_pathway` |
| `hasProfile` | Indicates whether generated profile state exists |
| `hasSelectedCareer` | Indicates whether the learner has selected or confirmed a career/profile direction |
| `hasPathwayCourses` | Indicates whether generated pathway course data exists |

Logs and analytics must not include raw learner intake responses, prompt text, or sensitive profile content. Step-level metadata is sufficient for operational debugging without capturing unnecessary learner-provided data.

## Relationship to Route Loader Guidance

This decision should not be interpreted as a general move away from explicit routes, route loaders, or React Query.

For normal application pages, route loaders remain the preferred approach when the page:

- has a durable URL that should be directly loaded, refreshed, or shared;
- has data dependencies that can be fetched before rendering;
- benefits from route-level parallel API calls;
- benefits from code splitting at the route boundary;
- can use React Query cache freshness to avoid redundant network requests;
- can perform client-side redirects before rendering a page.

The Learner Pathway steps are different because they are tightly coupled states in a sequential workflow. The route boundary is the dashboard/pathways experience; the internal step is UI state.

## Implementation Notes

The implementation should make the valid step transitions explicit. A reducer, state machine, or pathway-specific hook should own the transition rules rather than spreading prerequisite checks across unrelated components.

Conceptually:

```typescript
type PathwayStep = 'intake' | 'profile' | 'courses';

function getNextRenderableStep(state: LearnerPathwayState): PathwayStep {
  if (!state.profile) {
    return 'intake';
  }

  if (!state.selectedCareer || !state.pathwayCourses) {
    return 'profile';
  }

  return 'courses';
}
```

The step navigation UI should call pathway-specific transition handlers instead of route navigation APIs.

For example:

```typescript
onSelectStep('courses')
  → validate profile exists
  → validate pathway courses exist
  → update currentStep to 'courses'
```

If a target step is not valid, the UI should either disable the tab/control or resolve to the latest valid step. It should not navigate to a URL that then needs to redirect.

## Test Coverage

At minimum, tests should cover the behavior that would otherwise have been encoded in route guards.

| Area | Coverage |
|------|----------|
| Default rendering | Learner without pathway state starts at Intake Form |
| Sequential transition | Submitting intake renders Pathway Profile after profile generation succeeds |
| Gated transition | Pathway Courses cannot render before prerequisite profile/career/pathway state exists |
| Resume behavior | Existing pathway state resolves to the latest valid step |
| Restart/adjust behavior | Restarting or adjusting a pathway returns to the intended earlier step without route navigation |
| Data fetching | Step transitions do not trigger unnecessary dashboard loader/BFF refetching or data reseeding |
| Observability | Errors include `feature`, `pathwayStep`, and `operation` metadata |
| Privacy | Logs do not include raw learner intake responses or prompt content |

## Consequences

### Positive Outcomes

- The Learner Pathway flow remains simpler to implement and reason about.
- The UI does not expose invalid deep links for steps that require prior state.
- State transitions remain centralized in the pathway container/hook instead of being split across route loaders, redirects, and components.
- Step changes avoid unnecessary route loader revalidation and reduce the risk of repeated BFF calls or data reseeding.
- The dashboard route continues to represent the page-level destination, while the internal pathway step represents workflow state.
- Step-level logging and analytics can still provide sufficient operational visibility when implemented consistently.

### Negative Outcomes

- Individual pathway steps are not directly bookmarkable or shareable by URL.
- Browser back/forward behavior will not automatically move between pathway steps unless explicitly implemented in state.
- Route-based monitoring tools will only see the dashboard route unless step metadata is added to logs, analytics, and RUM actions.
- Route-level code splitting is not available between the three pathway steps.
- Developers must test state transitions directly because route guards will not enforce the workflow.

## When to Reverse This Decision

This decision should be revisited and potentially reversed if the Learner Pathway steps become durable page destinations rather than internal workflow states.

Introduce explicit routes if one or more of the following becomes a product or technical requirement:

- learners must be able to bookmark, refresh, or share a direct link to a specific pathway step;
- support, admins, or notifications need to link directly to the profile or course step;
- browser back/forward navigation between steps becomes a first-class UX requirement;
- each step can be rendered independently from server-persisted state with no reliance on transient client state;
- the BFF exposes stable, idempotent step-specific resources that route loaders can fetch without reseeding or mutating pathway state;
- route-level code splitting provides meaningful performance benefit;
- route-level monitoring or error boundaries become more valuable than the simpler single-route state model;
- the redirect logic for invalid states becomes small, centralized, and well tested.

A future route-based shape could look like:

```
/:enterpriseSlug/pathways
/:enterpriseSlug/pathways/intake
/:enterpriseSlug/pathways/profile
/:enterpriseSlug/pathways/courses
```

If this reversal happens, each route should use a loader to fetch or validate the prerequisite state before rendering. Invalid states should redirect before UI render, and route loaders should use React Query cache helpers such as `ensureQueryData` to avoid unnecessary network requests when data is already fresh.

## Alternatives Considered

### 1. Distinct routes for each pathway step

The main alternative was to introduce a route for each step and use route loaders plus client-side redirects to enforce the sequential flow.

This was rejected because the steps are not currently valid as independent page destinations. It would require redirect logic for incomplete state, add loader/revalidation concerns to step transitions, and increase the chance of unnecessary API calls or BFF reseeding.

### 2. Query parameters or hash fragments for each step

Another option was to keep the dashboard route but encode the active step in the URL, such as `?pathwayStep=profile` or `#pathway-courses`.

This was rejected for the same reason as explicit routes: it would make step state appear externally addressable without guaranteeing that the prerequisite state exists. Query parameters may still be useful for development/debug tooling, but they should not be treated as canonical production navigation for the pathway steps.

### 3. Server-owned pathway state with route-per-step rendering

A more route-oriented model could be introduced later if pathway progress becomes fully server-owned and each step can be safely loaded from a canonical resource. This would make direct links and route loaders more appropriate.

This was not selected for the current implementation because it would require additional backend/API maturity and would add complexity before the product requires direct step-level routing.
