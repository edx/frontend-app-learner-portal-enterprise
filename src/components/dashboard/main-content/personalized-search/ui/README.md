# ui

Presentational Paragon components. Every input is a prop; no store, no host imports. Copy lives in `messages.ts` (ids `learner.personalizedSearch.*`). `cards/EditorialItemCard` takes `links: ItemLinks` (`getItemHref`, `LinkComponent`) from the host.

## Chat look

Learner messages are gray bubbles on the right. Assistant replies are plain text after a sparkle icon, with the follow-up question as the last line. The latest follow-up chips sit above the message box: first the fixed chips that narrow the results, then up to three chips the AI wrote for this conversation, marked with a sparkle. When there is nothing left to narrow, the AI's chips stand in for the generic opening chips. A note under the message box says results come from the organization's catalog.

## For you, Excluded and Saved tabs

The results pane has "For you" (the AI-personalized results, marked with a sparkle) and "Saved (n)". Once the learner has excluded anything ("Not for me", now or earlier), an "Excluded (n)" tab appears between them. It lists the excluded items, and "Include again" lets an item back into results. Restoring the last one returns to For you and leaves the tab disabled; after a reload with nothing excluded it doesn't appear. Saved lists the learner's saved items as standard cards; unsaving removes a card and lowers the count. With nothing saved, a dashed note explains that saved items stay across chats. Saving from For you shows a "Saved" toast whose "View saved" action opens the tab.

## Result cards

`EditorialItemCard` is the edx.org-style card: a 4px top accent per type (Professional Certificates #03C7E8, Executive Education #D23228, other programs #F0CC00, courses #2D494E), the type label, title, partner, hours per week and length, then pacing and level. The whole card is one link (a stretched title link) that lifts on hover and shows a 3px outline on keyboard focus. The bookmark and a "More options" menu with "Not for me" sit above the link. "Why this?" opens the one-line reason. Every card has the same parts in the same place (a missing image keeps its space, the title clamps to three lines and the partner to one, "Why this?" sits at the bottom), and every result grid uses `RESULT_COLUMN_SIZES` (one card per row on phones, two on tablets, three on wide screens), so the top pick, compare, groups and Saved line up like the search page. "Not for me" removes the card and offers Undo in a toast.

## Thumbs on replies

Each finished reply has thumbs up ("Helpful") and down ("Not helpful") with `aria-pressed`. Pressing the same one again clears it. The rating is optimistic and reverts if the call fails; if the server has no rating endpoint (404), the thumbs disappear for the rest of the session. Each turn learns its `sequence` from `data-session`, which the rating endpoint needs.

## History

`HistoryPanel` follows the Xpert chat sidebar, the platform's existing chatbot: a 25rem right-hand panel with a title bar and an icon close button, conversations under day dividers (Today, Yesterday, Previous 7 days, Older), and one row per conversation with its title (two lines at most) above the time or date and the number of picks. The conversation on screen is marked with `aria-current` and a left rule.

## Debug panel (`?debug=true`)

The panel switches live AI on or off and picks the intent and compose models and their reasoning effort; the benchmark table lists each turn's models, timings, tokens and cost. Model choices last one conversation: a page load, New chat and reopening a past search all return to the server defaults, and nothing is saved in the browser. Only the Live switch carries over to a new conversation in the same page view. When enterprise-access replays a call from its response cache (KD-13), the benchmark table's Cache column shows `intent hit · compose hit` and Saved out the original output tokens. The results show a "From cache" badge with the tokens saved and a dashed "Cached" outline on each replayed block. Outside debug mode nothing is marked.
