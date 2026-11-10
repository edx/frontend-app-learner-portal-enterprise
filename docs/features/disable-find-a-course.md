# Disabling "Find a Course" for specific enterprise customers

[ENT-12375](https://2u-internal.atlassian.net/browse/ENT-12375) asked to hide every "Find a Course"
entry point in the learner portal for TAG-GDP (Talal Abu-Ghazaleh Global Digital Polytechnic), whose
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
| Matching | Case-insensitive, whitespace-trimmed |
| Default | `''` (disabled) in `.env.development` / `.env.development-stage` |
| Helper | `isFindACourseDisabledForEnterpriseCustomer(enterpriseCustomerUuid)` in `src/components/app/data/utils.js`. It reads `getConfig()` itself, so call sites only pass the customer UUID. |

It is enabled for TAG-GDPT in the edx-internal deployment config
(`argocd/applications/edxapp-lms/{stage,prod}-config.yaml`,
[edx-internal#15126](https://github.com/edx/edx-internal/pull/15126)):

```yaml
FEATURE_DISABLE_FIND_A_COURSE_FOR_ENTERPRISE_CUSTOMER: 2e16fcfa-58ea-4021-be51-2235ef4b5284  # tag-gdpt uuid
```

This value is **independent** of `FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER`, which
controls the TAG-GDPT "Welcome to your pathway" sidebar message from ENT-12339. For TAG-GDPT both
are set to the same UUID, but either can be turned on without the other.

The helper is a plain function, not a hook, on purpose: many component tests mock `app/data` with
`requireActual`. A new hook built on the real `useEnterpriseCustomer` would bypass those mocks, but
a plain util works with them unchanged.

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

## Deliberately out of scope

- **The `/search` route itself is not blocked.** Only the entry points are hidden, so a learner
  with a direct URL can still reach search. If the route must be blocked too, gate `searchLoader`
  or the route, as `disableSearch` already does elsewhere.
- **Borderline items.** These send learners to search but don't say "Find a Course", and the ticket
  left them open for a scope decision:
  - The "exploring courses" inline link in the redesigned My Courses empty state
    (`CourseEnrollmentsEmptyState.jsx`, shown only when Learner Pathways is enabled).
  - The descriptive copy "Simply find a course from your catalog…" in the legacy empty state.
    Only the button is removed.
- **`enterpriseCustomer.disableSearch` is a different, existing mechanism.** It comes from the
  backend field `enable_integrated_customer_learner_portal_search`, and it hides the whole nav
  menu, logo link, course recommendations and so on. This feature is narrower and is configured in
  the frontend.
