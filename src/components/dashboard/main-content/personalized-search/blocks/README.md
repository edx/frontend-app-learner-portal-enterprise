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

`item_section` blocks render under one "More options" eyebrow, two groups per row. Each group shows the type as an h3, "See all (n)" when the server sends the catalog `total` (linking to the host's search through `ItemLinks.getSeeAllHref`), the one-line `dek`, and exactly two cards. When the learner removes a card, the next item and then the `reserve` cards fill the gap; a group with one card left lays it out horizontally, and an empty group disappears. Block types this client hasn't registered (newer ones) are dropped, so older turns and newer servers both render.

## Decision guide

`top_pick` renders the item's card (about 300px) beside a lighter details block: "Top pick", the one-sentence reason, the learner's preferences it meets as checks, "More like this" (sends "More like {title}" through `onAsk`) and "Not for me". `compare` renders "Compare top options": 2-3 compact cards (`CompactItemCard`), each under a "Best for …" h4, with the top pick tagged. `page_header` is the h2 headline plus the "About you" line. All three keep the turn readable when absent: older turns simply start with the header and the groups.

## Why these?

The `profile` block (what the AI knows about the learner, restated from the merged intent) isn't drawn on its own: the header shows a "Why these?" link that opens a read-only Paragon Popover on hover or focus (a click focuses it, so it stays open) and closes on Escape. It shows the plain-language basis and the preferences as chips. Without a profile there's no link. There is no edit-preferences control yet.
