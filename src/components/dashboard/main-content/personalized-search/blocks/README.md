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
