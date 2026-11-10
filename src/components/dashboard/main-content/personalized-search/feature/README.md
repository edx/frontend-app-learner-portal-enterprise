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

From 768 px the tab shows chat and results side by side (about 30/70 from 992 px). Like the search page, both panes fit the window and scroll inside themselves: `useFitToViewport` sizes them to the space below where they start with the page at the top, so the page's height never depends on scrolling. The chat's messages scroll above a composer that never leaves view; the results column is its own scroll container. History and New chat sit in the toolbar above both panes. On this tab the dashboard's welcome heading is screen-reader only, so the results start higher. Below 768 px one pane shows at a time, switched by the Chat/Results toggle, and the page scrolls.

**Loading, top to bottom.** From send (Enter or a chip) until the turn finishes, the conversation snaps to its newest message and its scrolling is locked, then it snaps once more for the follow-up question. Once the turn is past understanding the message (searching or writing), its results replace the previous ones and the results pane returns to its top: placeholders (Paragon's loading cards, as on the search page) for the headline, the top pick and a row of cards. Each block appears only when it has streamed in whole, in stream order, which is page order (the compose prompt writes the headline, caveat, top pick, compare, sections, then the plan), so a block never appears above one already shown. Placeholders for the regions still to come stay below the last block until the turn finishes. An off-topic or text-only turn never replaces the results.

## Results update in place

The results pane always shows the latest turn that has results; a text-only turn (or one with only a caveat) keeps the previous results in view. The chat has no per-turn "View results" links. Cards the server marks `status: "new"` (new since the previous message) show an "Updated" badge and a brief glow, skipped under reduced motion.

## Usage events (KD-12)

The feature reports usage through the host's `trackEvent(action, properties)` port (`core/analytics.ts` lists the actions). The controller's `track` adds the turn's join keys from the server's `data-analytics` part, the enterprise and the viewport, then the action's own raw facts (ids, positions as the server sent them). It never counts, sums or derives anything: the warehouse joins events on `conversation_id`, `turn_id` and `item_key`. The portal adapter (`adapters/portal/analytics.ts`) names events from `PERSONALIZED_SEARCH_EVENTS` in `src/eventTracking.ts` (`edx.ui.enterprise.learner_portal.personalized_search.<location>.<action>`) and sends them with `sendEnterpriseTrackEvent`; the controller logs a send that throws. The event dictionary is in enterprise-access (`docs/references/personalized_search_events.md`).

Events sent by the client: `tab_viewed` (`entry_point`: `nav_tab` when the learner chose the tab in the dashboard tabs, which mark it with navigation state, otherwise `deep_link`), `prompt_submitted` (`prompt_source`: typed, starter_chip, followup_chip, suggested_chip or more_like_this; `chip_label` only for fixed chips, never the AI's), `results_rendered` (once per live turn with results), `result_clicked`, `item_save_toggled` and `item_dismissed` (the card's key, type, and the `section`/`position` the server put on it; `saved_tab` for the Saved tab; `excluded_tab` when Include again restores an item), `explanation_opened` (`tile`, `set` or `order`), `new_chat_started`, `saved_tab_opened`, `excluded_tab_opened` and `history_opened`. The first message after reopening a past search sends `resumed_from_history`, and the server reports the resume.

## The conversation in the URL

After the first message the URL carries `?session=<uuid>`, the session's id and the usage events' `conversation_id`. The update replaces the history entry, so leaving for a course page or the search page and pressing Back returns to the tab, which reopens that conversation (as a past search; the next message continues it). An unknown or foreign id is dropped and the tab starts fresh. New chat removes the parameter. The host supplies the URL access through the `useSessionParam` port.

Each turn sends the learner's content language (`locale`) from the optional `getContentLocale` port. The portal resolves it the way Learner Pathways does (`getPathwaysSupportedLocale`: the portal language when the MFE's `SUPPORTED_ALGOLIA_LANGUAGE_FILTERS` lists it, otherwise `en`). enterprise-access then returns catalog records whose metadata is in that language, limits courses to ones taught in it, and has the AI write in it.
