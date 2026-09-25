# Pathway sidebar message

This document records how the "Welcome to your pathway" dashboard sidebar card works, because it
sits next to an unrelated, similarly-named mechanism and the two are easy to conflate.

## Two separate sidebar-message mechanisms — do not confuse them

| | `LearnerPortalSidebarMessage` | `PathwaySidebarMessage` |
| --- | --- | --- |
| Content | Arbitrary HTML, backend-authored | Hardcoded English copy + logo, in this repo |
| Gated by | `enterpriseCustomer.enableLearnerPortalSidebarMessage` + `.learnerPortalSidebarContent` (enterprise-access API fields, generic, any customer) | `FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER` (frontend env var, single customer today) |
| To enable for a customer | Set those two fields on their `EnterpriseCustomer` record — no frontend deploy needed | Add their UUID to the env var and redeploy |

The backend-driven mechanism (`enableLearnerPortalSidebarMessage` / `learnerPortalSidebarContent`,
originally built for a "Career Engagement Network" message, later generalized) already existed and
is fully generic — but `LearnerPortalSidebarMessage` as a standalone component is new: this PR
extracted it out of `SupportInformation`, where it previously rendered inline, so it could get its
own card instead of sharing one with "Need help?" (see the mobile-entry-point note below for why).
`PathwaySidebarMessage` was added for
[ENT-12339](https://2u-internal.atlassian.net/browse/ENT-12339) — a one-off TAG-GDPT (Talal
Abu-Ghazaleh Global Digital Polytechnic) pathway message — deliberately as a config-gated
component rather than routed through `learnerPortalSidebarContent`, matching the precedent set by
[frontend-app-admin-portal#174](https://github.com/edx/frontend-app-admin-portal/pull/174) (config
allowlist + a frontend-owned rollout that doesn't depend on a separate backend/API change).

If a second customer needs a pathway-style message with **different** copy, `PathwaySidebarMessage`
does not generalize to that — its content is hardcoded for TAG-GDPT specifically. Extending the
allowlist to a second customer would show them TAG-GDPT's copy too.

## Sanitization of `learnerPortalSidebarContent` — known limitation

`LearnerPortalSidebarMessage` renders this backend-authored HTML through
`DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] })` before
`dangerouslySetInnerHTML`, matching the pattern already used in `PathwayModal.jsx` and
`custom-expired-subscription-modal/index.jsx`. `USE_PROFILES: { html: true }` strips `target` by
default (it's not in that allowlist) and removes `<iframe>` entirely — a real behavior change from
before sanitization was added, not just a security hardening. `target="_blank"` is restored via
`ADD_ATTR`, with a module-level `afterSanitizeAttributes` hook that forces
`rel="noopener noreferrer"` on any link whose `target` opens a new browsing context (DOMPurify's own
documented pattern for allowing `target` without reverse-tabnabbing risk). The hook normalizes the
value (trim + lowercase) and treats everything except `_self` / `_parent` / `_top` as a new context,
so `_BLANK`, `_new`, or a named window can't bypass it.

`<iframe>` is **not** restored — allowing arbitrary iframes is a materially larger attack surface
than allowing `target`, and there's no way to know from this repo alone whether any customer's
`learnerPortalSidebarContent` currently contains one. If you're deploying this and a customer's
existing content relies on an iframe, it will silently disappear; check actual production values
of `learnerPortalSidebarContent` before merging, not just this doc.

## The nil-UUID wildcard

`isPathwayMessageEnabledForEnterpriseCustomer` (`src/components/dashboard/data/utils.js`) treats
the nil UUID (`00000000-0000-0000-0000-000000000000`, `uuid`'s `NIL` export) in
`FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER` as a wildcard meaning "show this for every
enterprise customer". This is useful for local dev, but it's an opt-in — both `.env.development`
and `.env.development-stage` ship with this value empty (`''`, disabled) by default, so set it to
the nil UUID yourself locally if you want to see the card without a specific customer's UUID.
Setting the wildcard in a real environment would show TAG-GDPT's message to every customer's
learners.

Unlike the sibling `FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS` (a comma-separated
allowlist, parsed into an array), this config value is a **single** UUID string — there is no
comma-splitting. Setting it to a comma-separated list does not enable the message for multiple
customers; it matches nobody (`isPathwayMessageEnabledForEnterpriseCustomer` logs a
`console.warn` when it detects a comma, specifically to catch this mistake). The comparison is
also case-insensitive, so a hand-copied uppercase UUID still matches correctly.

## Entry points — the two components have different reach, on purpose

`DashboardSidebar` (`src/components/dashboard/sidebar/DashboardSidebar.jsx`) is reused in two
places: the actual learner dashboard (`CoursesTabComponent.jsx`, desktop `>= large`) and the
unrelated "My Career" page (`src/components/my-career/AddJobRole.jsx`, also `>= large`). The two
sidebar-message components are **not** scoped the same way across those two consumers:

| | `LearnerPortalSidebarMessage` | `PathwaySidebarMessage` |
| --- | --- | --- |
| Renders on the dashboard? | Yes | Yes |
| Renders on My Career (`AddJobRole`)? | Yes — unchanged, generic behavior that predates this feature | **No** — deliberately excluded |

`LearnerPortalSidebarMessage` is generic and was already reachable from both pages before
`PathwaySidebarMessage` existed (it used to live inline inside `SupportInformation`, which both
pages render), so it keeps following `SupportInformation` everywhere, including My Career.

`PathwaySidebarMessage` is TAG-GDPT-specific marketing copy that only makes sense on the dashboard.
`DashboardSidebar` takes a `showPathwayMessage` prop (default `false`) precisely so `AddJobRole`
doesn't have to opt out explicitly — only `CoursesTabComponent.jsx` passes `showPathwayMessage`.
**Do not remove that prop or make `PathwaySidebarMessage` unconditional in `DashboardSidebar`** —
that would reintroduce it on My Career.

Both components still need to be mounted at **both** dashboard entry points, since those are two
independent call sites, not one shared component behind a breakpoint check:

| Entry point | Location | Viewport | Renders `PathwaySidebarMessage`? |
| --- | --- | --- | --- |
| Sidebar column (dashboard) | `DashboardSidebar` via `CoursesTabComponent.jsx` (`showPathwayMessage`) | `>= large` | Yes |
| Sidebar column (My Career) | `DashboardSidebar` via `AddJobRole.jsx` (no prop passed) | `>= large` | No |
| Main content stack (dashboard) | `DashboardMainContent.jsx`, direct | `<= medium` | Yes |

Missing either dashboard entry point is a silent regression on whichever viewport was missed (this
happened once already: the mobile/tablet entry point was missed when `PathwaySidebarMessage` was
first added, dropping the pre-existing `LearnerPortalSidebarMessage` from mobile too, until it was
caught in review).
