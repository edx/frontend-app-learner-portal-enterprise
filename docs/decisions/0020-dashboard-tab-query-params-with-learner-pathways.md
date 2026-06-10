# ADR 0020: Dashboard Tab Query Params and Learner Pathway Step State

## Status

Accepted (May 2026)

## Context

The Enterprise Learner Portal dashboard contains top-level tabs such as Courses, Programs, Pathways, My Career,
and AI Pathways. Unlike the Admin Portal, which uses routed pages for major navigation areas, the Learner Portal was
historically implemented as a single dashboard experience. This decision defines how URL state and workflow state are 
managed within that architecture.  Dashboard tabs represent durable navigation state and should be reflected in the URL.
The Learner Pathway experience is rendered inside the Pathways tab and contains a gated workflow:

```txt
ONBOARDING
    │ submit intake / generate profile
    ▼
PROFILE
    │ select direction / generate pathway
    ▼
PATHWAY
```

The dashboard tab and Learner Pathway step represent different kinds of state:

```txt
URL State
────────────────────────────────────
/:enterpriseSlug?tab=pathways

Workflow State
────────────────────────────────────
usePathwaysStore.section
  ├── onboarding
  ├── profile
  └── pathway
```

Dashboard tabs are navigation state.
Learner Pathway steps are workflow state.

## Decision

Dashboard tab selection will use the `tab` query parameter.

```txt
/:enterpriseSlug?tab=courses
/:enterpriseSlug?tab=programs
/:enterpriseSlug?tab=pathways
/:enterpriseSlug?tab=my-career
/:enterpriseSlug?tab=ai-pathways
```

The dashboard tab hook will:

```txt
read tab from search params
    │
    ▼
validate requested tab
    │
    ├── valid       → use requested tab
    │
    └── invalid     → fall back to courses
                       and normalize URL
```

Learner Pathway steps will remain state-driven within the pathway store.
The implementation will not introduce step-specific routes.
The implementation will not introduce step query parameters:

## Overall Flow

```txt
┌───────────────────────────────────────────────┐
│ Browser URL                                   │
│                                               │
│ /:enterpriseSlug?tab=pathways                 │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ useDashboardTabs()                            │
│                                               │
│ requestedTab = searchParams.get('tab')        │
│ activeTab = valid tab OR courses              │
│ invalid tab → normalize URL                   │
│ tab click → update search params              │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ Dashboard                                     │
│                                               │
│ courses      → CoursesTabComponent            │
│ programs     → ProgramListingPage             │
│ pathways     → LearnerPathwaysTab             │
│ my-career    → MyCareerTab                    │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ Learner Pathways                              │
│                                               │
│ usePathwaysStore.section                      │
│   onboarding                                  │
│   profile                                     │
│   pathway                                     │
│                                               │
│ Step changes update workflow state only.      │
└───────────────────────────────────────────────┘
```

## Rationale

### Dashboard Tabs Are Navigation State

Dashboard tabs represent stable destinations within the learner experience.
A learner should be able to:

* refresh the page;
* bookmark a dashboard tab;
* share a dashboard URL;
* return to a dashboard tab using browser navigation.

Representing dashboard tabs in the URL supports these behaviors.

### Learner Pathway Steps Are Workflow State

The Profile and Pathway steps depend on prerequisite workflow state.

```txt
PROFILE
  requires learner profile

PATHWAY
  requires selected career
  requires generated pathway
```

A learner cannot safely enter those steps without the required state already existing.
Keeping step state in the pathway store ensures navigation rules remain colocated with the data used to validate those transitions.

```txt
request step
    │
    ▼
validate pathway state
    │
    ├── valid   → update section
    │
    └── invalid → remain on valid step
```

### Existing Architecture Alignment

The Learner Portal dashboard was implemented as a single dashboard experience rather than independently routed pages.
Using query parameters for dashboard tabs preserves URL-addressable navigation while remaining compatible with the
current architecture and avoiding unnecessary routing complexity.


## Analytics

* Dashboard page visits are tracked when the active tab changes.
* Learner Pathway step views are tracked explicitly because step changes do not update the URL.

```txt
learner_pathway.step.viewed
  pathwayStep: onboarding | profile | pathway
```

Error and RUM events should include:

```txt
feature
pathwayStep
operation
```

Do not log learner responses, generated profile content, or prompt text.


## Data Fetching

Dashboard-level data may be loaded at the dashboard or tab boundary.
Learner Pathway step transitions should not reseed dashboard data.

Step components should avoid dashboard-seeding hooks such as:

```txt
useBFF()
useEnterpriseLearner()
```

unless they are verified to be cache-stable for step transitions.
Profile generation and pathway generation should be explicit workflow actions rather than side effects of component mounting.

## Alternatives Considered

### Dashboard Tabs as Routes

Rejected because:
- The Learner Portal is implemented as a single dashboard experience. 
- Additional routes introduce route ownership and loader complexity. 
- Query parameters provide URL-addressable navigation with less implementation overhead.

### Learner Pathway Step Query Parameters

Rejected because:
- Learner Pathway steps are workflow state, not navigation state.
- Later steps depend on prerequisite learner actions and generated state.
- URL-addressable steps may not represent valid workflow states.

### Learner Pathway Step Routes

Rejected because:
- The pathway experience is a single state-driven workflow.
- Workflow validation is owned by pathway state rather than route transitions.
- Route-level navigation adds complexity without improving the user experience.

## Consequences

### Positive

* Dashboard tabs are refreshable, bookmarkable, and shareable.
* Dashboard navigation is represented in the URL.
* Learner Pathway steps remain protected workflow state.
* Invalid pathway step URLs are not exposed.
* Workflow validation remains centralized in pathway state.

### Negative

* Learner Pathway steps cannot be bookmarked directly.
* Browser back/forward navigation applies to dashboard tabs, not pathway steps.
* Pathway step analytics must be emitted explicitly.
* Workflow validation must be tested directly.
