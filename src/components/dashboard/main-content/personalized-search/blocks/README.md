# blocks

The results pane's block registry. `defaultBlockRegistry` renders Block catalog v1 (`page_header`, `item_section`, `insight`, `plan`). To add a block type:

```tsx
const registry = defaultBlockRegistry.register('my_block', {
  render: (props) => <MyBlock {...props} />,
  slot: 'body',
});
<PersonalizedSearchTab deps={deps} registry={registry} />
```

The registry also validates blocks for the stream reducer, so a block shows only if a renderer exists for it.

## More options groups

`item_section` blocks render under one "More options" eyebrow, one group per row. Each group shows the type as an h3, "See all (n)" when the server sends the catalog `total` (linking to the host's search through `ItemLinks.getSeeAllHref`), the one-line `dek`, and up to three cards. When the learner removes a card, the next item and then the `reserve` cards fill the gap, and an empty group disappears. Block types this client hasn't registered (newer ones) are dropped, so older turns and newer servers both render.

## Decision guide

`top_pick` renders the item's card, one result column wide, beside a lighter details block: "Top pick", the one-sentence reason, the learner's preferences it meets as checks, "More like this" (sends "More like {title}" through `onAsk`) and "Not for me". `compare` renders "Compare top options": 2-3 standard cards in the result grid, each under its "Best for …" label (just above the card, in a two-line slot so the cards stay aligned), with the top pick tagged. `page_header` is the h2 headline plus the "About you" line. All three keep the turn readable when absent: older turns simply start with the header and the groups.

## Why these?

`plan` ("A suggested order") renders where it arrives, after the sections: it can only name items already on the page, so it's always last in the stream. It has an info button that opens a Popover on hover or focus: how the steps were picked (the best fit first, each step building on the last) and, when the server sends it, the AI's one sentence on why this order.

The `profile` block (what the AI knows about the learner, restated from the merged intent; the server keeps only the preferences the shown results reflect and sends it after them) isn't drawn on its own: the header shows a "Why these?" link that opens a read-only Paragon Popover on click (or Enter/Space) and closes on a click elsewhere or Escape, so it stays open while the learner reads it. It shows the plain-language basis and the preferences as chips. Without a profile there's no link. There is no edit-preferences control yet.

## Caveat

A `caveat` block renders as a warning `Alert` at the top of For you. The latest finished turn's caveat shows even when that turn found nothing, above the previous results that stay in place. Turns with only a caveat or the profile don't count as having results (`hasPage`), so they don't replace what's shown.
