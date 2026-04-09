# Multi-license course access: old vs new

## Summary

The old frontend already exposed `subscriptionLicenses`, so a learner could appear to have multiple licenses in the payload.

The main change is **not** that the UI suddenly started receiving multiple licenses.

The real changes are:

1. **Explicit catalog-to-license mapping** via `licensesByCatalog`
2. **Consistent behavior in BFF flag-off mode** by rebuilding `licensesByCatalog` client-side when needed
3. **Correct activation behavior for multiple assigned licenses**, instead of stopping after the first activated license

---

## Old behavior

### Data available
The old flow could already use:
- `subscriptionLicense`
- `subscriptionLicenses`

### Course access resolution
Course access was resolved by checking whether any activated/current subscription license matched one of the course catalogs.

This meant the system could still resolve access from a flat list of licenses.

### Limitations
1. **No explicit catalog index from the BFF in flag-off mode**
   - `licensesByCatalog` came back empty from the backend
   - frontend had to rely on scanning the flat license list

2. **Activation stopped too early**
   - if the learner already had one activated license, activation flow returned early
   - additional assigned licenses were blocked from activation

3. **Course access could look correct only for already-activated licenses**
   - if a learner had another assigned license that never got activated, its catalog was effectively missing from real access

---

## New behavior

### Data available
The new flow uses:
- `subscriptionLicense`
- `subscriptionLicenses`
- `licensesByCatalog`
- `licenseSchemaVersion`

### Course access resolution
The new resolution order is:

1. Try `licensesByCatalog`
2. If that is missing or empty, fall back to scanning `subscriptionLicenses`

This makes course-to-license resolution more explicit and stable.

### Improvements
1. **Catalog mapping is explicit**
   - licenses are grouped by enterprise catalog UUID
   - course access can use direct catalog lookup first

2. **BFF flag-off mode still works correctly**
   - when backend returns `licensesByCatalog: {}` in v1 mode,
   - frontend rebuilds the index from `subscriptionLicenses`

3. **Multiple assigned licenses can now activate properly**
   - having one activated license no longer blocks activation of another current assigned license

---

## What changed functionally

## Before
A course was effectively checked against a flat list of activated/current licenses.

That is roughly:

```text
course catalogs -> scan all active licenses -> choose best matching license
```

## After
A course is first checked against a catalog index.

That is roughly:

```text
course catalogs -> lookup licensesByCatalog[catalogUuid] -> choose best matching license
```

If the index is unavailable, the frontend still falls back to the flat scan.

---

## Metrics

## 1. Access-related fields in the effective frontend model

### Old
- `subscriptionLicense`
- `subscriptionLicenses`

### New
- `subscriptionLicense`
- `subscriptionLicenses`
- `licensesByCatalog`
- `licenseSchemaVersion`

**Metric:** usable access fields increased from **2** to **4**.

---

## 2. BFF flag-off indexed catalog coverage

### Old
- backend returned `licensesByCatalog = {}`
- indexed catalog coverage from BFF = **0**

### New
- frontend rebuilds `licensesByCatalog` from active licenses
- indexed catalog coverage = **all catalogs represented by activated current licenses**

Examples:
- Alice: **3** catalog keys
- Bob: **2** catalog keys
- Carol: **5** catalog keys
- Dave: **1** catalog key

---

## 3. Activation capacity

### Old
- one already-activated license could block activation of additional assigned licenses
- practical learner-flow activation capacity: **1 active license before early exit**

### New
- a learner can continue activating another current assigned license
- practical learner-flow activation capacity: **all current assigned licenses**

---

## 4. License lookup complexity

### Old common path
- scan all active licenses
- approximate complexity: `O(n)`

### New preferred path
- direct catalog lookup in `licensesByCatalog`
- approximate first-step lookup: `O(1)` per catalog bucket, then choose best candidate

This is a performance and clarity improvement, but the larger benefit is correctness and consistency.

---

## Seeded user examples

Known catalog assignments from seeded test users:

- `11111111111111111111111111111111` = Leadership
- `22222222222222222222222222222222` = Technical
- `33333333333333333333333333333333` = Compliance
- `44444444444444444444444444444444` = Data Science
- `55555555555555555555555555555555` = Business Skills

### User license coverage

| User | Covered catalogs |
|---|---|
| Alice | 11, 22, 33 |
| Bob | 11, 22 |
| Carol | 11, 22, 33, 44, 55 |
| Dave | 44 |

---

## Example: `edX+P315`

`edX+P315` belongs to the **Data Science** catalog (`44444444444444444444444444444444`).

### Old vs new outcome

| User | Old behavior | New behavior | Notes |
|---|---|---|---|
| Alice | No access | No access | No Data Science license |
| Bob | No access | No access | No Data Science license |
| Carol | Access | Access | Data Science license exists |
| Dave | Access | Access | Data Science license exists |

### Important interpretation
For already-activated licenses, **the visible course access result may look the same**.

That is why it can feel like “the old one was also showing subscription licenses.”

That observation is correct.

The actual improvement is that:
- the mapping is explicit,
- the BFF flag-off path no longer loses the mapping,
- and later assigned licenses are no longer blocked from activation.

---

## What is materially different now

The meaningful difference is not just payload display.

It is the move from:

```text
"we have a flat list of licenses and try to infer access"
```

to:

```text
"we explicitly know which catalogs map to which licenses, and we do not block further valid license activation"
```

---

## Bottom line

### If the question is:
**Did the old frontend already show subscription licenses?**

Yes.

### If the question is:
**Did the old frontend already always support correct multi-license course access?**

Not reliably.

### The new implementation specifically improves:
1. explicit catalog mapping,
2. flag-off BFF compatibility,
3. multi-license activation flow,
4. consistency between BFF and non-BFF paths.

---

## How we achieve the goal

### Goal

Enable multi-license support for individual learners to facilitate restricted, program-based learning pathways.

### Required approach

To achieve that goal, the system has to do two main things well:

1. **Preserve all applicable licenses through the BFF and frontend data flow**
2. **Use the correct license for the specific course being viewed or redeemed**

In practice, that breaks down into the following implementation steps.

### 1. Return all active licenses instead of collapsing to one too early

The first requirement is collection-first data handling.

Instead of reducing the learner to a single `subscriptionLicense` too early, the system must preserve:

- `subscriptionLicenses`
- `subscriptionLicensesByStatus`
- `licensesByCatalog`
- `licenseSchemaVersion`

This is what allows a learner to hold multiple active entitlements across different restricted catalogs at the same time.

### 2. Map course access by catalog, not by a single learner-wide license

Once multiple licenses are preserved, course access must be resolved in course context.

That means:

- determine which enterprise catalogs contain the course,
- find the learner licenses that match those catalogs,
- select the best applicable license,
- use that license for access and enrollment behavior.

This is the core change that supports program-based pathways with restricted catalogs.

### 3. Keep flag-off BFF behavior compatible

When the BFF is still in legacy schema mode (`v1`), the backend can return `licensesByCatalog = {}`.

To avoid losing course-to-license matching in that case, the frontend rebuilds the catalog index client-side from `subscriptionLicenses`.

This keeps behavior consistent across:

- BFF flag OFF,
- BFF flag ON,
- BFF and non-BFF data paths.

### 4. Allow subsequent assigned licenses to activate

The second major requirement from the project brief is activation correctness.

Old behavior could stop after finding one already-activated license. That blocked later assigned licenses from being activated, even if they represented separate pathway access.

To support multi-license learners correctly, the activation flow must allow a learner to activate another current assigned license even when one license is already active.

### 5. Preserve restricted access boundaries

The business goal is not just “more licenses”.

It is **restricted pathway access**.

So the system must ensure that learners only receive subscription-based access for courses whose catalogs are actually covered by one of their active licenses.

That is the enforcement side of multi-license support.

---

## What has been implemented toward that goal

### Implemented

1. **Collection-first subscription handling in the frontend**
   - the frontend now supports `subscriptionLicenses`, `licensesByCatalog`, and `licenseSchemaVersion`

2. **Course-level license resolution**
   - course access now prefers indexed catalog lookup and falls back to flat license scanning when needed

3. **BFF flag-off compatibility**
   - when the backend returns an empty `licensesByCatalog`, the frontend reconstructs it client-side

4. **Frontend activation-flow improvement**
   - the learner portal no longer stops activation just because one license is already activated if another assigned/current license still needs activation

### Partially implemented

1. **Manual/subsequent activation handling across the full stack**
   - the frontend side was fixed
   - however, the BFF backend still has an early return when an activated license already exists, so backend-side subsequent activation is not fully complete yet

### Not yet verified as implemented

1. **Platform-level `restrict_catalog_access` enforcement**
   - this appears in the project brief and planning docs
   - but it is not verified here as implemented in `edx-platform`

2. **Per-license activation email / notification handling**
   - the goal says activation emails should be triggered for each new license assigned
   - this is not fully verified from the current frontend-focused changes alone

---

## Bottom-line status against the goal

### Achieved now

- multi-license data can flow through the frontend correctly
- course access can be resolved against multiple licenses instead of one
- legacy BFF responses no longer lose catalog-to-license mapping in the frontend

### Still needed for full end-to-end completion

- backend-side subsequent assigned-license activation without early exit
- verified per-license activation/notification behavior
- verified platform-level restricted catalog enforcement

So the project goal is **substantially advanced**, but **not yet fully complete end-to-end** based on the code verified here.
