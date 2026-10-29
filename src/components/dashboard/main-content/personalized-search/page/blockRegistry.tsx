import type { ReactElement } from 'react';

import { BLOCK_CATALOG_VERSION } from '../stream/types';
import type { Block } from '../stream/types';
import InsightBlock from './InsightBlock';
import ItemSectionBlock from './ItemSectionBlock';
import PageHeaderBlock from './PageHeaderBlock';
import PlanBlock from './PlanBlock';

export interface BlockRenderContext {
  enterpriseSlug: string;
  itemTitles: Record<string, string>;
}

type Renderers = {
  [T in Block['type']]: (props: Extract<Block, { type: T }>['props'], ctx: BlockRenderContext) => ReactElement;
};

/** Closed registry of Block catalog v1 (KD-5): `type -> Paragon component`. */
export const blockRegistry: Renderers = {
  page_header: (props) => <PageHeaderBlock {...props} />,
  item_section: (props, ctx) => <ItemSectionBlock {...props} enterpriseSlug={ctx.enterpriseSlug} />,
  insight: (props) => <InsightBlock {...props} />,
  plan: (props, ctx) => <PlanBlock {...props} itemTitles={ctx.itemTitles} />,
};

type AnyRenderer = (props: unknown, ctx: BlockRenderContext) => ReactElement;
type UnvalidatedBlock = Block | { v?: unknown; type?: unknown; props?: unknown };

/** Renders a block, or returns null for an unknown type or version. */
export const renderBlock = (block: UnvalidatedBlock, ctx: BlockRenderContext) => {
  if (!block || block.v !== BLOCK_CATALOG_VERSION || typeof block.type !== 'string') { return null; }
  if (!Object.prototype.hasOwnProperty.call(blockRegistry, block.type)) { return null; }
  const render = (blockRegistry as Record<string, AnyRenderer>)[block.type];
  return render(block.props, ctx);
};
