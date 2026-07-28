# Enterprise Learner Portal Architecture Overview

Welcome! This document is for junior engineers who are new to edX and just getting started with React development. We'll walk through how this app is structured and how data flows from the backend to what you see on screen.

## The Big Picture

This is a **React single-page application (SPA)** that's a "Micro Frontend" (MFE)—meaning it's a small piece of a bigger edX system that handles one specific job: showing learners their courses, programs, and learning paths.

The app needs to:
- Fetch course and learner data from multiple backend APIs
- Keep that data fresh and avoid asking for the same thing twice
- Display it nicely on the screen
- Handle errors gracefully if something goes wrong

Think of it like a **restaurant dashboard**: your React components are the waitstaff (showing the data), TanStack Query is the kitchen manager (keeping food fresh and organized), and the backend APIs are the actual kitchens making the food.

## The Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│     React Components (UI Layer)         │
│  - Dashboard, Course Detail, Search      │
└──────────────┬──────────────────────────┘
               │ needs data
               ▼
┌─────────────────────────────────────────┐
│   Custom Hooks + TanStack Query         │
│   (Data Management Layer)               │
│  - Fetching, caching, state management  │
└──────────────┬──────────────────────────┘
               │ makes requests
               ▼
┌─────────────────────────────────────────┐
│    Backend APIs (API Layer)             │
│  - Legacy APIs, BFF, External Services  │
└─────────────────────────────────────────┘
```

Each layer has a specific job:
- **UI Layer** (Components): Show data to users, respond to clicks
- **Data Layer** (Hooks + Query): Fetch data, manage caching, handle loading/error states
- **API Layer** (Backend): Provide the actual course/learner data

---

## TanStack Query: Your Data Butler

Imagine you're organizing a dinner party. You don't want to ask each guest "Are you coming?" ten times a day. Instead, you ask once, remember their answer, and only ask again if you need fresh confirmation.

That's what **TanStack Query** does for API calls.

### What It Does

1. **Fetches data** - Makes API calls to get course, learner, and subsidy information
2. **Caches results** - Remembers the answer so you don't ask again immediately
3. **Knows when data is "stale"** - Refreshes automatically after 20 seconds by default
4. **Handles loading & error states** - Tells your component "still loading..." or "something went wrong"
5. **Deduplicates requests** - If two components need the same data, it makes one request, not two

### The Lifecycle of a Query

```
Component says "I need course data"
          ↓
TanStack Query checks: "Do I have this cached?"
          ↓
      ┌─── YES ───┐              ┌─── NO ────┐
      ▼           ▼              ▼            ▼
  Return it   Is it stale?    Make API call
  from cache  (>20 seconds)    Get fresh data
              │                │
           YES→ Refresh in background

Component gets data + loading/error status
```

### Key Concepts

**Query**: A request for data. Example: "Get course metadata for course CS101"

**Cache**: Stored data. If you ask for the same course again within 20 seconds, TanStack Query returns the cached version instantly.

**Staleness**: After 20 seconds, data is considered "stale." TanStack Query will refresh it in the background if needed.

**Query Key**: A unique identifier for a query. Think of it as a filing system—more on this below.

---

## Query Keys: The Filing System

Imagine a giant filing cabinet. To find a file quickly, you organize it by category:

```
📁 Enterprise Customer (e.g., "acme-corp")
  📁 Courses
    📄 Course: "Python 101" → metadata, reviews, runs
    📄 Course: "Statistics 102" → metadata, reviews, runs
  📁 Programs
    📄 Program: "Data Science Pathway"
  📁 Subsidies
    📄 Coupon Codes
    📄 Subscriptions
```

**Query Keys** work the same way. They organize all your data so TanStack Query can find and manage it efficiently.

### The Query Key Factory Pattern

Our codebase uses a **Query Key Factory**—a centralized place where we define all possible queries. Here's a simplified example:

```javascript
// In queryKeyFactory.js
const enterprise = createQueryKeys('enterprise', {
  enterpriseCustomer: (enterpriseUuid) => ({
    queryKey: ['enterprise', enterpriseUuid],
    queryFn: () => fetchEnterpriseData(enterpriseUuid),
    contextQueries: {
      course: (courseKey) => ({
        queryKey: ['enterprise', enterpriseUuid, 'course', courseKey],
        queryFn: () => fetchCourseMetadata(courseKey),
        contextQueries: {
          metadata: {
            queryKey: ['enterprise', enterpriseUuid, 'course', courseKey, 'metadata'],
            queryFn: () => fetchCourseMetadata(courseKey),
          }
        }
      })
    }
  })
});
```

Breaking this down:

- **`queryKey`**: A unique array identifier. `['enterprise', enterpriseUuid, 'course', courseKey]` means "this is the enterprise's course data"
- **`queryFn`**: The function that actually fetches the data (calls the API)
- **`contextQueries`**: Nested queries that depend on the parent. (A course only makes sense in the context of an enterprise)

### Why This Matters

1. **Cache Invalidation**: When a learner enrolls in a course, we can invalidate all queries with `'enrollments'` in the key and refresh them.
2. **No Duplicates**: If two components both need course metadata, they use the same query key, so only one API call is made.
3. **Organization**: You know exactly where to find the data you need.

### Using Query Keys in Components

```javascript
// In queries.ts
export function queryCourseMetadata(courseKey: string) {
  return queries.content.course(courseKey)._ctx.metadata;
}

// Returns something like:
// {
//   queryKey: ['content', 'course', courseKey, 'metadata'],
//   queryFn: () => fetchCourseMetadata(courseKey)
// }
```

---

## Custom Hooks: Reusable Data Fetchers

Instead of calling TanStack Query directly in every component, we create **custom hooks**. These are reusable functions that encapsulate data fetching logic.

### Example: `useCourseMetadata`

```typescript
// In useCourseMetadata.ts
export default function useCourseMetadata<TData = CourseMetadataWithAvailableRuns>(
  options: UseCourseMetadataQueryOptions<TData> = {},
) {
  const { select } = options;
  const params = useParams();
  const courseKey = params.courseKey!;

  // useSuspenseQuery is like useQuery but works with React Suspense
  return useSuspenseQuery<CourseMetadata, Error, TData>(
    queryOptions({
      ...queryCourseMetadata(courseKey),  // ← Gets the query key + function
      select: (data) => {
        // Transform the raw API data into what the component needs
        const availableCourseRuns = getAvailableCourseRuns({ course: data });
        return { ...data, availableCourseRuns };
      },
    }),
  );
}
```

### What's Happening Here?

1. **`useParams()`** - Get the course key from the URL
2. **`queryCourseMetadata(courseKey)`** - Get the query key and fetch function from our factory
3. **`useSuspenseQuery`** - Fetch the data (returns `{ data, isLoading, error }`)
4. **`select`** - Transform raw API data into a nicer shape for the component
5. **Return** - The component gets back clean, ready-to-use data

### Using the Hook in a Component

```jsx
function CourseDetailPage() {
  const { data: courseData, isLoading, error } = useCourseMetadata();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <CourseDetail course={courseData} />;
}
```

The component doesn't need to know **how** the data is fetched—it just calls the hook and gets what it needs.

---

## The BFF Pattern: Simplifying Data Fetching

**BFF** stands for "Backend for Frontend." It's a special pattern we're using to solve a common problem.

### The Problem

Imagine building a dashboard page. You need:
- Enterprise customer info
- Learner's enrollments
- Available courses
- Subsidy information
- User entitlements

Without a BFF, your React app would make **5 separate API calls** to different services. That's slow and complicated.

### The Solution

A **BFF is a thin API layer** that runs on the backend and does the aggregation for us:

```
Old Way (Multiple API Calls):
┌──────────────┐
│   React App  │
└──────────────┘
    │   │   │   │   │
    │   │   │   │   └────→ User Entitlements API
    │   │   │   └─────────→ Subsidy Service
    │   │   └──────────────→ Catalog Service
    │   └─────────────────→ LMS (enrollments)
    └──────────────────────→ Enterprise Service


New Way (BFF):
┌──────────────┐
│   React App  │
└──────────────┘
    │
    └────→ BFF (Backend for Frontend)
             │   │   │   │   │
             └───┴───┴───┴───┘
          (aggregates & returns
          one clean response)
```

### How the BFF Hook Works

We have a special hook called **`useBFF`** that's smart about using the BFF when available:

```typescript
// In useBFF.ts
export default function useBFF<TData = unknown>({
  bffQueryAdditionalParams = {},
  bffQueryOptions,           // ← Options for the BFF query
  fallbackQueryConfig,       // ← Options for the legacy API (backup)
}) {
  const matchedBFFQuery = useMatchedBFFQuery();  // ← Check if BFF exists for this page

  if (matchedBFFQuery) {
    // BFF is available for this route, use it
    return useQuery(bffQueryOptions);
  } else {
    // BFF not available yet, fall back to legacy API
    return useQuery(fallbackQueryConfig);
  }
}
```

### Real-World Example

Dashboard page (has BFF):
```
User navigates to dashboard
     ↓
useBFF checks: "Is there a BFF for dashboard?"
     ↓
YES → Call fetchEnterpriseLearnerDashboard(BFF endpoint)
     ↓
Get back: { customer, enrollments, subsidies, offers } in one response
```

Course detail page (no BFF yet):
```
User navigates to course detail
     ↓
useBFF checks: "Is there a BFF for course detail?"
     ↓
NO → Use fallback: useCourseMetadata (legacy API)
     ↓
Fetch from individual course service
```

### Benefits

- **Faster**: One request instead of five
- **Simpler**: React doesn't need to orchestrate multiple APIs
- **Gradual Migration**: We can build BFF endpoints one page at a time
- **Fallback Safety**: If BFF isn't ready, the old API still works

---

## Putting It All Together: The Data Flow

Let's trace what happens when a learner visits the course detail page.

### Step-by-Step

```
1. User clicks on a course
   └─ React Router matches: /:enterpriseSlug/course/:courseKey

2. Route Loader runs BEFORE the page renders
   └─ Prefetches data using TanStack Query

3. CourseDetailPage component mounts
   └─ Calls useCourseMetadata() hook

4. Hook executes:
   a) Gets courseKey from URL params
   b) Calls queryCourseMetadata(courseKey) to get query config
   c) TanStack Query checks: "Do I have this cached?"

5. If cached:
   └─ Returns instantly (no API call)

6. If not cached:
   └─ Makes API call: GET /api/courses/{courseKey}
   └─ Stores result in cache

7. Component receives:
   ├─ data: { courseKey, title, description, runs... }
   ├─ isLoading: false
   └─ error: null

8. Component renders the course details
```

### Visual Flow

```
┌─────────────────────────────────────────────────┐
│  Router: /acme-corp/course/edX+AI101+2024      │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────┐
        │   CourseDetailPage      │
        └────────────┬────────────┘
                     │
         calls→  useCourseMetadata()
                     │
                     ▼
        ┌─────────────────────────────────┐
        │ queryCourseMetadata("edX+...") │
        │ Returns query config            │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌───────────────────────────────────┐
        │  TanStack Query useQuery()        │
        │  - Check cache                    │
        │  - Make API call if needed        │
        └────────────┬─────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
        ✓ Cached         Need fresh
            │                 │
            ▼                 ▼
        Return from    API call to
        cache (fast)   /api/courses/edX+...
                       │
                       ▼
                   Cache response
                       │
                       ▼
        ┌─────────────────────────┐
        │ Component gets:         │
        │ { data, isLoading, ... }│
        └─────────────────────────┘
                       │
                       ▼
        ┌─────────────────────────┐
        │   Renders course UI     │
        └─────────────────────────┘
```

---

## Quick Reference: Where to Find Things

### Setting up a new data hook

1. **Define the query key** → `src/components/app/data/queries/queryKeyFactory.js`
2. **Create the fetch function** → `src/components/app/data/services/`
3. **Create the custom hook** → `src/components/app/data/hooks/useYourFeatureName.ts`
4. **Use the hook in your component** → Your component file

### Common Tasks

**I want to fetch a new type of data:**
1. Add query key to `queryKeyFactory.js`
2. Create fetch function in `services/`
3. Create hook that wraps the query
4. Use hook in component

**I need to invalidate (refresh) a cache:**
```typescript
const queryClient = useQueryClient();
// When user completes an action:
queryClient.invalidateQueries({ queryKey: ['enterprise', ...] });
```

**I want to combine multiple queries:**
```typescript
// Use multiple hooks:
const courseData = useCourseMetadata();
const reviewData = useCourseReviews();
// Both queries run automatically and cache independently
```

**I need to transform API data:**
```typescript
// Use the select function in useSuspenseQuery:
return useSuspenseQuery(
  queryOptions({
    ...queryConfig,
    select: (rawData) => {
      // Transform here
      return myTransformedData;
    }
  })
);
```

---

## Next Steps

- **Explore the hooks**: Look at `src/components/app/data/hooks/` to see real examples
- **Check the query factory**: Open `src/components/app/data/queries/queryKeyFactory.js` to understand the structure
- **Read tests**: Hook tests in `*.test.ts` files show how to test data fetching
- **Read the README.md**: It has more detailed info about the project

Happy coding! 🚀
