# feature

The tab (`PersonalizedSearchTab`), its controller and its store.

- Host dependencies come in as `deps: PersonalizedSearchDeps` (`deps.ts`); nothing here imports the host app.
- `createPersonalizedSearchStore()` makes one store per mounted tab; pass `store` to inspect it in tests.
- `createPersonalizedSearchController({ deps, store })` returns the controller hook, the only place hooks are resolved (KD-6).

Embedding in another host:

```tsx
<PersonalizedSearchTab deps={myHostDeps} />
```

## Layout and scrolling

From 768 px the tab shows chat and results side by side (about 30/70 from 992 px). The chat column is sticky and as tall as the viewport: its messages scroll inside it and the composer stays pinned, so refining is always one click away. Only the results scroll with the page. History and New chat sit in the toolbar above both panes. On this tab the dashboard's welcome heading is screen-reader only, so the results start higher. Below 768 px one pane shows at a time, switched by the Chat/Results toggle.

## Results update in place

The results pane always shows the latest turn that has results; a text-only turn (or one with only a caveat) keeps the previous results in view. The chat has no per-turn "View results" links. Cards the server marks `status: "new"` (new since the previous message) show an "Updated" badge and a brief glow, skipped under reduced motion.
