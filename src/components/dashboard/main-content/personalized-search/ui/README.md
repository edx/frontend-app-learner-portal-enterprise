# ui

Presentational Paragon components. Every input is a prop; no store, no host imports. Copy lives in `messages.ts` (ids `learner.personalizedSearch.*`). `cards/EditorialItemCard` takes `links: ItemLinks` (`getItemHref`, `LinkComponent`) from the host.

## Chat look

Learner messages are gray bubbles on the right. Assistant replies are plain text after a sparkle icon, with the follow-up question as the last line. The latest follow-up chips sit above the message box, and a note under it says results come from the organization's catalog.

## For you and Saved tabs

The results pane has two tabs: "For you" (the AI-personalized results, marked with a sparkle) and "Saved (n)". Saved lists the learner's saved items as standard cards; unsaving removes a card and lowers the count. With nothing saved, a dashed note explains that saved items stay across chats. Saving from For you shows a "Saved" toast whose "View saved" action opens the tab.

## Result cards

`EditorialItemCard` is the edx.org-style card: a 4px top accent per type (Professional Certificates #03C7E8, Executive Education #D23228, other programs #F0CC00, courses #2D494E), the type label, title, partner, hours per week and length, then pacing and level. The whole card is one link (a stretched title link) that lifts on hover and shows a 3px outline on keyboard focus. The bookmark and a "More options" menu with "Not for me" sit above the link. "Why this?" opens the one-line reason. A section with a single card lays it out horizontally. "Not for me" removes the card and offers Undo in a toast.

## Thumbs on replies

Each finished reply has thumbs up ("Helpful") and down ("Not helpful") with `aria-pressed`. Pressing the same one again clears it. The rating is optimistic and reverts if the call fails; if the server has no rating endpoint (404), the thumbs disappear for the rest of the session. Each turn learns its `sequence` from `data-session`, which the rating endpoint needs.
