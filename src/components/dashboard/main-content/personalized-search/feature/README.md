# feature

The tab (`PersonalizedSearchTab`), its controller and its store.

- Host dependencies come in as `deps: PersonalizedSearchDeps` (`deps.ts`); nothing here imports the host app.
- `createPersonalizedSearchStore()` makes one store per mounted tab; pass `store` to inspect it in tests.
- `createPersonalizedSearchController({ deps, store })` returns the controller hook, the only place hooks are resolved (KD-6).

Embedding in another host:

```tsx
<PersonalizedSearchTab deps={myHostDeps} />
```
