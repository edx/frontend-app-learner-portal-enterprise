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

## Usage events (KD-12)

The feature reports usage through the host's `trackEvent(action, properties)` port (`core/analytics.ts` lists the actions). The controller's `track` adds the turn's join keys from the server's `data-analytics` part, the enterprise and the viewport, then the action's own raw facts (ids, positions as the server sent them). It never counts, sums or derives anything: the warehouse joins events on `conversation_id`, `turn_id` and `item_key`. The portal adapter (`adapters/portal/analytics.ts`) names events from `PERSONALIZED_SEARCH_EVENTS` in `src/eventTracking.ts` (`edx.ui.enterprise.learner_portal.personalized_search.<location>.<action>`) and sends them with `sendEnterpriseTrackEvent`; it never throws. The event dictionary is in enterprise-access (`docs/references/personalized_search_events.md`).

Events sent by the client: `tab_viewed` (entry point), `prompt_submitted` (`prompt_source`: typed, starter_chip, followup_chip or more_like_this; `chip_label` only for fixed starter chips), `results_rendered` (once per live turn with results), `result_clicked`, `item_save_toggled` and `item_dismissed` (the card's key, type, and the `section`/`position` the server put on it; `saved_tab` for the Saved tab), `explanation_opened` (`tile` or `set`), `new_chat_started`, `saved_tab_opened` and `history_opened`. The first message after reopening a past search sends `resumed_from_history`, and the server reports the resume.
