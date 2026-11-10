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
