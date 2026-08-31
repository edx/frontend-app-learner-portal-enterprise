# Academies eligibility

Academies are a subscription-gated feature. This document records where eligibility is decided
and which entry points respect it, because the checks used to be inconsistent across entry points.

## Who is eligible

A learner sees Academies only when **all three** conditions hold:

1. **The enterprise customer has the Academies entitlement enabled** — `enterpriseCustomer.enableAcademies`,
   sourced from `enable_academies` on the `EnterpriseCustomer` payload (a required field in the
   enterprise-access OpenAPI schema, so it is always present on both the BFF and legacy responses).
2. **The authenticated user is linked to that enterprise customer** — the customer appears in
   `allLinkedEnterpriseCustomerUsers`. This matters because `extractEnterpriseCustomer` falls back to
   `staffEnterpriseCustomer` when no linked ECU matches the slug, so a staff user can resolve a
   customer they are not a learner of.
3. **The learner has subscription-based access** — either an activated license on a current plan, or
   browse & request configured with `subsidyType: LICENSE` so they can request one. This is the same
   rule the video catalog uses via `useHasValidLicenseOrSubscriptionRequestsEnabled`.

## Where the decision lives

There is one predicate, `canViewAcademies` in `src/components/app/data/utils.js`, with two callers:

| Context | Use |
| --- | --- |
| Components / hooks | `useCanViewAcademies()` — `src/components/app/data/hooks/useCanViewAcademies.ts` |
| Route loaders | `resolveCanViewAcademies()` — `src/components/app/data/queries/utils.ts` |

Both resolve the same three inputs, so they cannot disagree. **Do not re-derive eligibility inline;
add a caller of one of these two instead.** The search loader and the academy loader redirect in
opposite directions off this predicate, so any divergence between them would produce a redirect loop.

## Entry points

| Entry point | Location |
| --- | --- |
| Academies section on the search page | `src/components/search/Search.jsx` |
| "Go to Academy" header nav link | `src/components/site-header/data/hooks/useContentDiscoveryNavLink.jsx` |
| "Go to Academy" dashboard empty state | `src/components/dashboard/main-content/course-enrollments/CourseEnrollmentsEmptyStateContainer.jsx` |
| Single-academy redirect from `/search` | `src/components/search/data/searchLoader.ts` |
| `/:enterpriseSlug/academies/:academyUUID` route guard | `src/components/academies/data/academyLoader.ts` |

`enableOneAcademy` is a separate customer flag that changes *where* eligible learners land (straight
into their single academy rather than search). It is not an entitlement — always pair it with the
eligibility check, never use it alone.

## Fetch avoidance and the suspense constraint

`useAcademies` is a `useSuspenseQuery`, so it cannot be disabled conditionally with an `enabled`
flag, and switching it to `useQuery` would introduce a visible flicker in the header nav link (it
would render "Find a Course" and then flip to "Go to Academy" once the list loads).

Instead, the academies list is fetched only when it can actually be used:

- The root loader (`ensureEnterpriseAppData`) prefetches it only when `enableAcademies` is set. This
  is the coarse customer-level filter, and it is the one that matters most, since the root loader
  runs on *every* route.
- The search loader prefetches it only for fully eligible learners.
- The two components that need the list length (`useContentDiscoveryNavLink` and
  `CourseEnrollmentsEmptyStateContainer`) push their `useAcademies` call down into a child component
  that is rendered only when the learner is eligible, so the hook never runs otherwise.

The root loader deliberately gates on `enableAcademies` alone rather than full eligibility: learner
subsidy data is still being fetched inside that same `Promise.all`, so full eligibility is not yet
knowable there.

## Scope limit: this is a UX guard, not a security boundary

These checks stop the UI from offering Academies. They do not stop an ineligible user from calling
`enterprise-catalog`'s academies endpoints directly. If Academies content must be withheld (not just
un-advertised), the permission check belongs on the `enterprise-catalog` academies viewset.

Note that `AcademyContentCard`'s Algolia query is separately constrained by the secured Algolia API
key when `shouldUseSecuredAlgoliaApiKey` is set, so catalog scoping does hold for course results.
