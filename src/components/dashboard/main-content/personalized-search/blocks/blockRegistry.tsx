import type { ReactElement } from 'react';

import type { ExplainScope } from '../core/analytics';
import { BLOCK_CATALOG_VERSION } from '../core/stream/types';
import type {
  Block, ItemCard, PageBlock, ProfileProps,
} from '../core/stream/types';
import type { ItemLinks } from '../ui/cards/EditorialItemCard';
import InsightBlock from './InsightBlock';
import ItemSectionBlock from './ItemSectionBlock';
import PageHeaderBlock from './PageHeaderBlock';
import PlanBlock from './PlanBlock';
import TopPickBlock from './TopPickBlock';
import CompareBlock from './CompareBlock';
import CaveatBlock from './CaveatBlock';

export interface BlockRenderContext {
  /** How item cards link to course and program pages (supplied by the host). */
  links: ItemLinks;
  itemTitles: Record<string, string>;
  /** Item feedback (REQ-009); optional so read-only renders need none. */
  savedIds?: ReadonlySet<string>;
  dismissedIds?: ReadonlySet<string>;
  onToggleSave?: (item: ItemCard) => void;
  onDismiss?: (item: ItemCard) => void;
  /** Sends a chat message for the learner (More like this). */
  onAsk?: (message: string) => void;
  /** The turn's top pick, so other blocks can tag it. */
  topPickId?: string;
  /** What the AI knows about the learner, shown by the header's "Why these?". */
  profile?: ProfileProps;
  /** Usage events: a card was opened, or an explanation was expanded (a card's or the set's). */
  onOpenItem?: (item: ItemCard) => void;
  onExplain?: (scope: ExplainScope, item?: ItemCard) => void;
}

/** How one block type renders, and where the results pane puts it. */
export interface BlockDefinition<P = never> {
  render: (props: P, ctx: BlockRenderContext) => ReactElement | null;
  /** `top` blocks share the row above the rest (the page header, the plan); the others stack below. */
  slot?: 'top' | 'body';
  /** Classes for the block's wrapper in the top row. */
  slotClassName?: string;
}

type CatalogBlocks = {
  [T in Block['type']]: BlockDefinition<Extract<Block, { type: T }>['props']>;
};

/** Block catalog v1 (KD-5): `type -> Paragon component`. */
export const catalogBlocks: CatalogBlocks = {
  page_header: {
    render: (props, ctx) => (
      <PageHeaderBlock {...props} profile={ctx.profile} onOpenWhy={() => ctx.onExplain?.('set')} />
    ),
    slot: 'top',
    slotClassName: 'personalized-search__header-col mr-4 mb-3',
  },
  item_section: {
    render: (props, ctx) => (
      <ItemSectionBlock
        {...props}
        links={ctx.links}
        savedIds={ctx.savedIds}
        dismissedIds={ctx.dismissedIds}
        onToggleSave={ctx.onToggleSave}
        onDismiss={ctx.onDismiss}
        onOpenItem={ctx.onOpenItem}
        onExplain={ctx.onExplain}
      />
    ),
  },
  insight: { render: (props) => <InsightBlock {...props} /> },
  top_pick: { render: (props, ctx) => <TopPickBlock {...props} ctx={ctx} /> },
  // Rendered by the header's "Why these?" popover, not on its own.
  profile: { render: () => null },
  caveat: { render: (props) => <CaveatBlock {...props} /> },
  compare: { render: (props, ctx) => <CompareBlock {...props} ctx={ctx} /> },
  plan: {
    // Streams last (it can only name items already on the page) but sits in the top row's corner.
    render: (props, ctx) => (
      <PlanBlock {...props} itemTitles={ctx.itemTitles} onOpenWhy={() => ctx.onExplain?.('order')} />
    ),
    slot: 'top',
    slotClassName: 'personalized-search__plan-col mb-3',
  },
};

export interface BlockLayout {
  /** The first block of each `top` type, in registration order. */
  top: Array<{ entry: PageBlock; className?: string }>;
  /** Everything else, in stream order. */
  body: PageBlock[];
}

/**
 * Block renderers for the results pane. Hosts can add or replace block types without forking the
 * feature: `createBlockRegistry().register('my_block', { render })`. The registry also validates
 * blocks for the stream reducer, so a block reaches the page only if something can render it.
 */
export interface BlockRegistry {
  /** A new registry with `type` added or replaced (registries are immutable). */
  register: <P>(type: string, definition: BlockDefinition<P>) => BlockRegistry;
  get: (type: string) => BlockDefinition<unknown> | undefined;
  types: () => string[];
  /** Catalog version matches, the type is registered and `props` is an object. */
  isRenderable: (block: unknown) => block is Block;
  layout: (blocks: PageBlock[]) => BlockLayout;
}

type AnyDefinition = BlockDefinition<unknown>;

export const createBlockRegistry = (
  definitions: Record<string, unknown> = catalogBlocks,
): BlockRegistry => {
  const entries = { ...definitions } as Record<string, AnyDefinition>;
  const get = (type: string) => (
    Object.prototype.hasOwnProperty.call(entries, type) ? entries[type] : undefined
  );
  return {
    register: (type, definition) => createBlockRegistry({ ...entries, [type]: definition }),
    get,
    types: () => Object.keys(entries),
    isRenderable: (block: unknown): block is Block => {
      if (!block || typeof block !== 'object') { return false; }
      const { v, type, props } = block as { v?: unknown; type?: unknown; props?: unknown };
      return v === BLOCK_CATALOG_VERSION && typeof type === 'string' && !!get(type)
        && !!props && typeof props === 'object';
    },
    layout: (blocks) => {
      const top: BlockLayout['top'] = [];
      Object.keys(entries).filter((type) => entries[type].slot === 'top').forEach((type) => {
        const entry = blocks.find(({ block }) => block.type === type);
        if (entry) { top.push({ entry, className: entries[type].slotClassName }); }
      });
      const chosen = new Set(top.map(({ entry }) => entry));
      return { top, body: blocks.filter((entry) => !chosen.has(entry)) };
    },
  };
};

export const defaultBlockRegistry = createBlockRegistry();

type UnvalidatedBlock = Block | { v?: unknown; type?: unknown; props?: unknown };

/** Renders a block, or returns null for an unknown type or version. */
export const renderBlock = (
  block: UnvalidatedBlock,
  ctx: BlockRenderContext,
  registry: BlockRegistry = defaultBlockRegistry,
) => {
  if (!block || block.v !== BLOCK_CATALOG_VERSION || typeof block.type !== 'string') { return null; }
  const definition = registry.get(block.type);
  return definition ? definition.render(block.props, ctx) : null;
};
