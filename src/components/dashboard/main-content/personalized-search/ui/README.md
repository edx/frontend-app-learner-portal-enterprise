# ui

Presentational Paragon components. Every input is a prop; no store, no host imports. Copy lives in `messages.ts` (ids `learner.personalizedSearch.*`). `cards/EditorialItemCard` takes `links: ItemLinks` (`getItemHref`, `LinkComponent`) from the host.

## Chat look

Learner messages are gray bubbles on the right. Assistant replies are plain text after a sparkle icon, with the follow-up question as the last line. The latest follow-up chips sit above the message box, and a note under it says results come from the organization's catalog.

## For you and Saved tabs

The results pane has two tabs: "For you" (the AI-personalized results, marked with a sparkle) and "Saved (n)". Saved lists the learner's saved items as standard cards; unsaving removes a card and lowers the count. With nothing saved, a dashed note explains that saved items stay across chats. Saving from For you shows a "Saved" toast whose "View saved" action opens the tab.
