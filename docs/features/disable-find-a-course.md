# Disabling "Find a Course" for specific enterprise customers

[ENT-12375](https://2u-internal.atlassian.net/browse/ENT-12375) asked to hide every "Find a Course"
entry point in the learner portal for TAG-GDPT (Talal Abu-Ghazaleh Global Digital Polytechnic), whose
learners should reach content through their Academy / pathway instead of open catalog search. This
follows on from the TAG-GDPT pathway sidebar message
([ENT-12339](https://2u-internal.atlassian.net/browse/ENT-12339), see
[pathway-sidebar-message.md](./pathway-sidebar-message.md)).

## Configuration

| | |
| --- | --- |
| Config value | `FEATURE_DISABLE_FIND_A_COURSE_FOR_ENTERPRISE_CUSTOMER` |
| Format | A **single** enterprise customer UUID string, the same as `FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER`. It is **not** a comma-separated list: a list matches no customer. |
| Wildcard | The nil UUID (`00000000-0000-0000-0000-000000000000`) hides "Find a Course" for **every** customer. Use it only for local dev. |
| Matching | Case-insensitive, whitespace-trimmed. A non-string value (e.g. a YAML boolean or list) is treated as unset. |
| Default | `''` (disabled) in `.env.development` / `.env.development-stage` |
| Helper | `isFindACourseDisabledForEnterpriseCustomer(enterpriseCustomerUuid)` in `src/components/app/data/utils.js`. It reads `getConfig()` itself, so call sites only pass the customer UUID. |

It is enabled for TAG-GDPT in the edx-internal deployment config
(`argocd/applications/edxapp-lms/{stage,prod}-config.yaml`,
[edx-internal#15126](https://github.com/edx/edx-internal/pull/15126)):

```yaml
FEATURE_DISABLE_FIND_A_COURSE_FOR_ENTERPRISE_CUSTOMER: 2e16fcfa-58ea-4021-be51-2235ef4b5284  # tag-gdpt uuid
```

In deployed environments the value comes from the LMS runtime MFE config API
(`MFE_CONFIG_API_URL`), which frontend-platform merges *after* the `config` handler in
`src/index.tsx`. So the `?.trim() || null` in `index.tsx` only normalizes the build-time `.env`
value, and the helper does its own normalization. For the same reason, changing the edx-internal
value takes effect without a frontend rebuild. Locally, `.env.development` applies unless the
devstack LMS's MFE config also defines the key.

This value is **independent** of `FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER`, which
controls the TAG-GDPT "Welcome to your pathway" sidebar message from ENT-12339. For TAG-GDPT both
are set to the same UUID, but either can be turned on without the other.

The helper is a plain function, not a hook, on purpose: many component tests mock `app/data` with
`requireActual`. A new hook built on the real `useEnterpriseCustomer` would bypass those mocks, but
a plain util works with them unchanged. It delegates to `matchesEnterpriseCustomerConfigUuid`, the
single-UUID matcher shared with `isPathwayMessageEnabledForEnterpriseCustomer`.

It is deliberately **not** a derived `enterpriseCustomer.disableFindACourse` field next to
`disableSearch`. `transformEnterpriseCustomer` only runs on the legacy (non-BFF) data path. On BFF
routes (dashboard, search, academy, skills quiz) the customer comes from enterprise-access as-is,
and `disable_search` is computed by the backend. A frontend-derived field would be `undefined` on
exactly the pages this feature targets.

## Entry points affected

| # | Entry point | File | Behavior when disabled |
| --- | --- | --- | --- |
| 1 | Browse & request banner, top of dashboard | `course/BrowseAndRequestAlert.jsx` | Whole card hidden. "Find a course" is its only CTA. |
| 2 | Dashboard sidebar CTA | `dashboard/sidebar/SubsidiesSummary.tsx` | Hidden only when it would link to `/search`. "Go to Academy" stays. |
| 3 | Dashboard "My Courses" empty state | `dashboard/main-content/course-enrollments/LegacyCourseEnrollmentsEmptyState.jsx` | Button hidden. Intro copy and "Recommend courses for me" stay. |
| 4 | Dashboard group-assignment alert | `dashboard/main-content/course-enrollments/NewGroupAssignmentAlert.jsx` | Action button removed. Alert and its Dismiss stay. |
| 5 | Top nav "Find a Course" link (desktop and mobile) | `site-header/data/hooks/useContentDiscoveryNavLink.jsx` | Link not rendered. "Go to Academy" stays for eligible one-academy customers. |
| 6 | Course detail page breadcrumb | `course/course-header/CourseHeader.jsx` | "Find a Course" crumb dropped. Breadcrumb still renders if there is a parent route (e.g. coming from an academy page), otherwise hidden. |
| 7 | Academy detail page breadcrumb | `academies/AcademyDetailPage.jsx` | Breadcrumb hidden. "Find a Course" was its only link. |
| 8 | Program page "Catalog" / "<Subject> Courses" breadcrumbs | `program/ProgramHeader.jsx` | Breadcrumb hidden. Both links went to search. |
| 9 | "exploring courses" inline link (redesigned My Courses empty state, Learner Pathways only) | `dashboard/main-content/course-enrollments/CourseEnrollmentsEmptyState.jsx` | Rendered as plain text. |
| 10 | "course search" link in the pathway Need help card (Learner Pathways only) | `.../pathway-courses/NeedHelpCard.tsx` | Rendered as plain text, like the admin link without a contact email. |

Related behavior when disabled:

- **The sidebar subsidies card** is not rendered when no summary card applies and the CTA is
  hidden, so it never shows as an empty bordered box. The check uses `enableOneAcademy` rather than
  the academies list, so the list isn't fetched just for this. A one-academy customer with zero
  academies could still see an empty card, which is a misconfiguration edge case.
- **First-visit redirect.** `redirectToSearchPageForNewUser` (used by the dashboard loader) normally
  sends a first-time learner with no enrollments or assignments to `/search`. It now keeps them on
  the dashboard.
- **The `/search` route is guarded.** `searchLoader` redirects to the dashboard, after its existing
  single-academy redirect, so one-academy customers still land on their academy. This also covers
  direct URLs, bookmarks and in-app navigations into search: the skills quiz exit, which sits behind
  "Recommend courses for me", and the academy loader fallback for academy-ineligible learners. Those
  navigate to `/search` and are then redirected.

## Deliberately out of scope

- **Copy changes.** The legacy empty-state text ("Simply find a course from your catalog…") and the
  group-assignment alert body ("You can now browse new courses…") are unchanged, because new
  translatable strings need UX sign-off. For a one-academy customer like TAG-GDPT, neither renders:
  the My Courses empty state shows `GoToAcademy` instead.
- **`enterpriseCustomer.disableSearch` is a different, existing mechanism.** It comes from the
  backend field `enable_integrated_customer_learner_portal_search`, and it hides the whole nav
  menu, logo link, course recommendations and so on. This feature is narrower and is configured in
  the frontend.
