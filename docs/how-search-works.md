# How Search Works in the Learner Portal

Search results flow through six filter layers that determine what content a learner sees.

Core principle: learners see courses from catalogs they either have funding for OR can request funding for.

---

## The Six Filter Layers

### 1. Enterprise Catalog Filtering

Aggregates all catalog UUIDs the learner has access to via subsidies.

**Key files:** `src/components/app/data/hooks/useSearchCatalogs.js`, `src/components/app/data/utils.js` (`getSearchCatalogs()`)

If `licensesByCatalog` is populated (catalog-indexed licenses), those catalog UUIDs are returned directly without calling `getSearchCatalogs()`. Otherwise, sources are:

- Redeemable learner credit policies (`policy.catalogUuid`)
- Active subscription license (`subscriptionPlan.enterpriseCatalogUuid`)
- Browse & request catalogs (see section below)

### 2. Secured Algolia API Key

Exchanges catalog UUIDs for an enterprise-scoped secured API key via BFF. The key restricts queries to authorized `enterprise_catalog_query_uuids`.

**Key file:** `src/components/app/data/hooks/useAlgoliaSearch.ts`

Falls back to `ALGOLIA_SEARCH_API_KEY` when `ALGOLIA_APP_ID` is unset (`isCatalogQueryFiltersEnabled` is false) or the index is unsupported (jobs index). If the BFF call fails, the Suspense query throws rather than silently falling back.

### 3. Catalog Query UUID Filter

Builds the Algolia filter string from catalog UUIDs resolved in layer 1.

**Key files:** `src/components/app/data/hooks/useDefaultSearchFilters.ts`, `src/components/AlgoliaFilterBuilder/AlgoliaFilterBuilder.ts`

Only applied when `shouldUseSecuredAlgoliaApiKey` is true. Produces a filter like:

```
(enterprise_catalog_query_uuids:q1 OR enterprise_catalog_query_uuids:q2)
  AND NOT content_type:video
  AND metadata_language:en
```

### 4. Access Control Gating

**Key file:** `src/components/search/Search.jsx`

- **Assignments-only** (`useIsAssignmentsOnlyLearner()`) — if learner has content assignments but no active subsidies, renders `AssignmentsOnlyEmptyState` in place of search results.
- **Highlights-only** (`useCanOnlyViewHighlights()`) — `canOnlyViewHighlightSets === false` sets `canViewCatalog`; if false, full catalog search is hidden.
- **No search client** — if `searchClient` is null (e.g., secured key unavailable), renders a `SearchUnavailableAlert` instead of results.
- **Valid entitlement** (`useHasValidLicenseOrSubscriptionRequestsEnabled()`) — gates video content only (see layer 5); does not block search access on its own.

### 5. Content Type Filtering

Controls which content types appear in results.

**Key file:** `src/components/search/Search.jsx`, `src/components/app/data/hooks/useContentTypeFilter.ts`

| Content Type | Condition |
|---|---|
| Videos | `canViewCatalog && features.FEATURE_ENABLE_VIDEO_CATALOG && hasValidLicenseOrSubRequest` |
| Programs | `features.ENABLE_PROGRAMS` |
| Pathways | `features.ENABLE_PATHWAYS` |

### 6. Language Filtering

`AlgoliaFilterBuilder.filterByMetadataLanguage()` appends `metadata_language:{locale}` to every query. Supports `en` and `es`.

**Key file:** `src/components/AlgoliaFilterBuilder/AlgoliaFilterBuilder.ts`

---

## Browse & Request Catalogs

Browse & Request lets learners see and request access to content they don't currently have funding for — it appears alongside active-subsidy content in search results, with a "Request License" button instead of "Enroll".

**Config endpoint:** `GET /api/v1/customer-configurations/{enterpriseUUID}/` returns `{ subsidyRequestsEnabled, subsidyType }`.

When `subsidyRequestsEnabled` is true and `subsidyType === 'license'`, all `customerAgreement.availableSubscriptionCatalogs` are added to the search catalog set (layer 1) alongside the learner's active subsidy catalogs.

**Key files:** `src/components/app/data/hooks/useCatalogsForSubsidyRequests.js`, `src/components/app/data/utils.js` (`getCatalogsForSubsidyRequests()`)

---

## Search Flow

```
useSearchCatalogs()
  ├─ useSubscriptions()              → subscription catalog UUID
  ├─ useRedeemablePolicies()         → learner credit catalog UUIDs
  └─ useCatalogsForSubsidyRequests() → browse & request catalog UUIDs

useAlgoliaSearch()                   → secured API key + catalogUuid→queryUuid map

AlgoliaFilterBuilder                 → "(enterprise_catalog_query_uuids:q1 OR ...) AND NOT content_type:video AND metadata_language:en"

Access control checks                → assignments-only? highlights-only? valid entitlement?

Content type filters                 → courses, programs, pathways, videos

Algolia query executed               → SearchResults rendered
```

---

## Key Files

All hooks live under `src/components/app/data/hooks/`.

| Hook | File | Purpose |
|---|---|---|
| `useSearchCatalogs()` | `useSearchCatalogs.js` | Aggregate accessible catalog UUIDs |
| `useCatalogsForSubsidyRequests()` | `useCatalogsForSubsidyRequests.js` | Browse & request catalogs |
| `useBrowseAndRequestConfiguration()` | `useBrowseAndRequest.ts` | Enterprise B&R config |
| `useAlgoliaSearch()` | `useAlgoliaSearch.ts` | Algolia client with secured key |
| `useDefaultSearchFilters()` | `useDefaultSearchFilters.ts` | Base Algolia filter string |
| `useContentTypeFilter()` | `useContentTypeFilter.ts` | Content type filters |
| `useIsAssignmentsOnlyLearner()` | `useIsAssignmentsOnlyLearner.js` | Assignments-only check |
| `useCanOnlyViewHighlights()` | `useContentHighlightsConfiguration.js` | Highlights-only check |

| Utility / Component | File | Purpose |
|---|---|---|
| `getSearchCatalogs()` | `src/components/app/data/utils.js` | Aggregate catalogs from all sources |
| `getCatalogsForSubsidyRequests()` | `src/components/app/data/utils.js` | Browse & request catalog logic |
| `AlgoliaFilterBuilder` | `src/components/AlgoliaFilterBuilder/AlgoliaFilterBuilder.ts` | Build Algolia filter strings |
| `Search` | `src/components/search/Search.jsx` | Main search component with filter logic |

---

## Feature Flags

| Flag | Effect |
|---|---|
| `ALGOLIA_APP_ID` | Enables secured catalog query filtering |
| `FEATURE_ENABLE_VIDEO_CATALOG` | Shows/hides video results |
| `ENABLE_PROGRAMS` | Shows/hides program results |
| `ENABLE_PATHWAYS` | Shows/hides pathway results |
| `FEATURE_CONTENT_HIGHLIGHTS` | Enables curated highlights mode |

---

## Related

- [Subsidies & Course Redemption Guide](./subsidies.md)
- [Architecture Overview](./architecture_overview.md)
