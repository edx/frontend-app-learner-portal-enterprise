# ui

Presentational Paragon components. Every input is a prop; no store, no host imports. Copy lives in `messages.ts` (ids `learner.personalizedSearch.*`). `cards/EditorialItemCard` takes `links: ItemLinks` (`getItemHref`, `LinkComponent`) from the host.

## Chat look

Learner messages are gray bubbles on the right. Assistant replies are plain text after a sparkle icon, with the follow-up question as the last line. The latest follow-up chips sit above the message box, and a note under it says results come from the organization's catalog.
