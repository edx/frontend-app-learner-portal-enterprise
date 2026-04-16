# ADR 0018: Multi-License Support

## Status

Accepted

## Context

A learner can have **multiple active subscription licenses**, each tied to a **different catalog** of courses. For example:

```
Learner Alice has 3 licenses:
├── License A → Catalog 1 (Leadership courses)     expires Jun 2026
├── License B → Catalog 2 (Technical courses)       expires Sep 2026
└── License C → Catalog 3 (Compliance courses)      expires Mar 2027
```

Previously, the frontend picked **one license globally** (the first activated one) and used it everywhere. If Alice viewed a Technical course (Catalog 2) but the code picked License C (Catalog 3), the system reported "no applicable license" — even though License B was valid for that course.

## Decision

We updated the frontend to evaluate **all eligible licenses** and select the correct one based on the course being viewed. Rollout is controlled by the `FEATURE_MULTI_LICENSE_SUPPORT` frontend feature flag.

## Overall Flow

```
┌─────────────────────────────────────────────────────────────┐
│  BFF Response (from backend)                                │
│                                                             │
│  subscription_licenses: [License A, B, C]                   │
│  licenses_by_catalog: {                                     │
│    "catalog-1": [License A],                                │
│    "catalog-2": [License B],                                │
│    "catalog-3": [License C]                                 │
│  }                                                          │
│  subscription_license: License A  (legacy single pick)      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend Data Layer                                        │
│                                                             │
│  transformSubscriptionsData()                               │
│    - Builds licensesByCatalog from all activated licenses   │
│    - Still picks single subscriptionLicense (backward compat)│
│                                                             │
│  All hooks read from TanStack Query cache                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
      ┌──────────┐  ┌───────────┐  ┌──────────────┐
      │ Dashboard │  │  Search   │  │ Course Page  │
      │           │  │           │  │              │
      │ Uses all  │  │ Adds ALL  │  │ Picks the    │
      │ licenses  │  │ catalog   │  │ RIGHT license│
      │ for       │  │ UUIDs to  │  │ for THIS     │
      │ upgrade   │  │ Algolia   │  │ course's     │
      │ URLs      │  │ filters   │  │ catalog      │
      └──────────┘  └───────────┘  └──────────────┘
```

## Feature Flag

```
FEATURE_MULTI_LICENSE_SUPPORT = false (default)
  → All code paths use the OLD single-license behavior
  → Zero behavioral change from master

FEATURE_MULTI_LICENSE_SUPPORT = true
  → resolveApplicableSubscriptionLicense() checks ALL licenses
  → getSearchCatalogs() includes ALL activated license catalogs
  → Course page picks the license whose catalog contains the course
```

### How to Enable

**Local development** — change `.env.development`:
```dotenv
FEATURE_MULTI_LICENSE_SUPPORT='true'
```

**Testing without restart** — add URL query parameter:
```
http://localhost:8734/test-enterprise/search?feature=FEATURE_MULTI_LICENSE_SUPPORT
```

**Staging/production** — set environment variable in deployment config:
```
FEATURE_MULTI_LICENSE_SUPPORT=true
```

This is a **purely frontend flag**. It does not require any Django admin or backend waffle flag changes.

## Files Changed

### Feature Flag Setup (3 files)

| File | Purpose |
|------|---------|
| `src/config/constants.js` | Defines `FEATURE_MULTI_LICENSE_SUPPORT` constant |
| `src/config/index.js` | Registers the flag — reads from env var or URL param |
| `.env.development` | Sets default to `'false'` for local dev |

### Data Layer — Store `licensesByCatalog` (3 files)

| File | Purpose |
|------|---------|
| `src/components/app/data/constants.js` | Adds `licensesByCatalog: {}` to `baseSubscriptionsData` shape |
| `src/components/app/data/services/bffs.ts` | Adds `licensesByCatalog: {}` to BFF response base shape so `camelCaseObject()` maps `licenses_by_catalog` from the API |
| `src/types/enterprise-access.openapi.d.ts` | Adds `licenses_by_catalog` TypeScript type to `Subscriptions` schema |

### Transform — Build `licensesByCatalog` for legacy path (1 file)

| File | Purpose |
|------|---------|
| `src/components/app/data/services/subsidies/subscriptions.js` | `transformSubscriptionsData()` now groups activated+current licenses by their catalog UUID into `licensesByCatalog`. This ensures the same data shape whether coming from BFF or legacy API. |

```javascript
// After grouping by status, adds:
licensesByCatalog = {
  "catalog-1-uuid": [license1],
  "catalog-2-uuid": [license2],
  "catalog-3-uuid": [license3],
}
```

### Core Selection Logic (1 file)

| File | Purpose |
|------|---------|
| `src/components/app/data/utils.js` | Three changes described below |

**`resolveApplicableSubscriptionLicense()`** — New function that replaces the old single-license check:

```
Flag OFF:
  → Calls determineSubscriptionLicenseApplicable(subscriptionLicense, catalogsWithCourse)
  → Returns subscriptionLicense or null (identical to master)

Flag ON:
  → Gets all activated current licenses from subscriptionLicenses
  → Checks licensesByCatalog to find licenses matching catalogsWithCourse
  → Picks the one expiring latest (tie-breaking rule)
  → Returns that license or null
```

**`getSearchCatalogs()` updated** — Now accepts `licensesByCatalog`:

```
Flag OFF:
  → Adds single subscriptionLicense's catalog (identical to master)

Flag ON:
  → Adds ALL catalog UUIDs from licensesByCatalog
  → Learner sees courses from ALL their licensed catalogs in search
```

**`getSubscriptionDisabledEnrollmentReasonType()` fixed** — When `resolveApplicableSubscriptionLicense()` returns null, the code now correctly determines WHY (expired vs revoked vs not assigned) by checking the raw license data directly.

### Search — Include all catalogs (1 file)

| File | Purpose |
|------|---------|
| `src/components/app/data/hooks/useSearchCatalogs.js` | Passes `licensesByCatalog` to `getSearchCatalogs()` so Algolia filters include ALL licensed catalogs |

**Before**: Learner with 3 licenses only saw courses from 1 catalog in search.
**After**: Learner sees courses from all 3 catalogs.

### UI Gating — Check any license (1 file)

| File | Purpose |
|------|---------|
| `src/components/app/data/hooks/useHasValidLicenseOrSubscriptionRequestsEnabled.js` | When flag ON, checks if ANY license in `licensesByCatalog` exists (instead of checking the single `subscriptionLicense`). Gates video catalog visibility and search page access. |

### Course-Level License Selection (4 files)

These are the core consumers that pick the right license for a specific course:

| File | What it does |
|------|-------------|
| `src/components/course/data/hooks/useUserSubsidyApplicableToCourse.js` | Calls `resolveApplicableSubscriptionLicense()` to find the license matching this course's catalog, passes it to `getSubsidyToApplyForCourse()` |
| `src/components/app/data/hooks/useCourseRedemptionEligibility.ts` | Same pattern — determines if a subscription license takes priority over learner credit for this specific course |
| `src/components/course/data/courseLoader.ts` | Route loader that prefetches course data — uses `resolveApplicableSubscriptionLicense()` to check license applicability during data loading |
| `src/components/course/routes/externalCourseEnrollmentLoader.ts` | Executive education enrollment loader — same pattern for exec-ed courses |

### Dashboard Upgrade (1 file)

| File | Purpose |
|------|---------|
| `src/components/dashboard/main-content/course-enrollments/data/hooks.js` | `useCourseUpgradeData()` — When building the enrollment URL for course upgrades, finds the correct license for that specific course's catalog instead of always using the single global license |

## Concrete Example

```
Alice has 3 activated licenses:
  License 807a65cd → Catalog 11111111 (Leadership)  expires Jun 25
  License 807bba77 → Catalog 22222222 (Technical)   expires Sep 23
  License 807bbd3e → Catalog 33333333 (Compliance)  expires Mar 27
```

| Scenario | Old Behavior | New Behavior (flag ON) |
|----------|-------------|----------------------|
| Alice views a Technical course (catalog 22222222) | Uses License 807bbd3e (Compliance) → **wrong catalog → "no subsidy"** | Uses License 807bba77 (Technical) → **correct → can enroll** |
| Alice searches for courses | Only sees Compliance catalog courses | Sees courses from **all 3 catalogs** |
| Alice views a course in catalog 44444444 (no license) | No subsidy shown | No subsidy shown (correct) |
| Flag is OFF | Uses License 807bbd3e for everything | Uses License 807bbd3e for everything (same as master) |

## Test Coverage

| Test File | What's Covered |
|-----------|---------------|
| `subscriptions.test.js` | `licensesByCatalog` built correctly in `transformSubscriptionsData()` |
| `utils.test.js` | `resolveApplicableSubscriptionLicense()`: flag ON/OFF, single/multi catalog, overlapping, revoked, empty inputs, expired/deactivated reason detection |
| `useSearchCatalogs.test.jsx` | `licensesByCatalog` passed to `getSearchCatalogs()` |
| `useHasValidLicenseOrSubscriptionRequestsEnabled.test.jsx` | Multi-license flag ON checks any active license |
| `useCourseRedemptionEligibility.test.jsx` | Correct license selected for course context |
| `courseLoader.test.jsx` | Route loader uses `resolveApplicableSubscriptionLicense()` |
| `externalCourseEnrollmentLoader.test.jsx` | Exec-ed loader uses correct license |
| `hooks.test.jsx` (dashboard) | Upgrade URL uses course-specific license |
| `rootLoader.test.jsx` | `licensesByCatalog: {}` in transformed data shape |

## Consequences

- Learners with multiple licenses see the correct entitlement for each course
- Search results include courses from all licensed catalogs
- Legacy single-license users experience zero behavioral change
- The feature flag allows independent frontend rollout regardless of backend readiness
- When the flag is OFF and the backend returns `licenses_by_catalog`, the data is stored but unused
- Tie-breaking rule (latest expiration) provides consistent, learner-favorable license selection
