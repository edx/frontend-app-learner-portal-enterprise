import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import type { Block, PageBlock } from '../core/stream/types';
import type { ItemLinks } from '../ui/cards/EditorialItemCard';
import {
  catalogBlocks, createBlockRegistry, defaultBlockRegistry, renderBlock,
} from './blockRegistry';
import type { BlockRenderContext } from './blockRegistry';

const ctx: BlockRenderContext = {
  links: { course: () => '/c', program: () => '/p' } as unknown as ItemLinks,
  itemTitles: {},
};

const entry = (id: string, type: string, props: unknown = {}): PageBlock => (
  { id, block: { v: 1, type, props } as unknown as Block }
);

describe('block registry', () => {
  it('lists the four catalog types and reports itself as renderable only for known, versioned, object-prop blocks', () => {
    expect(defaultBlockRegistry.types()).toEqual(Object.keys(catalogBlocks));
    expect(defaultBlockRegistry.isRenderable({ v: 1, type: 'insight', props: {} })).toBe(true);
    expect(defaultBlockRegistry.isRenderable({ v: 2, type: 'insight', props: {} })).toBe(false);
    expect(defaultBlockRegistry.isRenderable({ v: 1, type: 'nope', props: {} })).toBe(false);
    expect(defaultBlockRegistry.isRenderable({ v: 1, type: 'insight', props: null })).toBe(false);
    expect(defaultBlockRegistry.isRenderable({ v: 1, type: 'insight', props: 'x' })).toBe(false);
    expect(defaultBlockRegistry.isRenderable(null)).toBe(false);
  });

  it('does not resolve Object.prototype names as block types', () => {
    expect(defaultBlockRegistry.get('toString')).toBeUndefined();
    expect(defaultBlockRegistry.isRenderable({ v: 1, type: 'constructor', props: {} })).toBe(false);
  });

  it('register returns a new registry and leaves the original unchanged', () => {
    const extended = defaultBlockRegistry.register('callout', { render: () => <p>callout</p> });
    expect(extended).not.toBe(defaultBlockRegistry);
    expect(extended.types()).toContain('callout');
    expect(defaultBlockRegistry.types()).not.toContain('callout');
    expect(extended.isRenderable({ v: 1, type: 'callout', props: {} })).toBe(true);
  });

  it('register replaces an existing type', () => {
    const replaced = defaultBlockRegistry.register('insight', { render: () => <p>custom insight</p> });
    render(renderBlock({ v: 1, type: 'insight', props: { title: 't', body: 'b' } }, ctx, replaced));
    expect(screen.getByText('custom insight')).toBeInTheDocument();
  });

  it('renderBlock returns null for an unknown type, a wrong version or a non-string type', () => {
    expect(renderBlock({ v: 1, type: 'nope', props: {} }, ctx)).toBeNull();
    expect(renderBlock({ v: 2, type: 'insight', props: {} }, ctx)).toBeNull();
    expect(renderBlock({ v: 1, type: 7, props: {} }, ctx)).toBeNull();
  });

  describe('layout', () => {
    it('puts the first block of each top type in the top row, in registration order, and the rest in the body', () => {
      const blocks = [
        entry('a', 'insight'), entry('b', 'plan'), entry('c', 'page_header'),
        entry('d', 'page_header'), entry('e', 'item_section'),
      ];
      const { top, body } = defaultBlockRegistry.layout(blocks);
      // The plan streams last but sits in the top row's corner, after the headline.
      expect(top.map((t) => t.entry.id)).toEqual(['c', 'b']);
      expect(top[0].className).toContain('personalized-search__header-col');
      expect(top[1].className).toContain('personalized-search__plan-col');
      expect(body.map((b) => b.id)).toEqual(['a', 'd', 'e']);
    });

    it('treats a host-registered top type as a top slot', () => {
      const registry = defaultBlockRegistry.register('banner', {
        render: () => <p>banner</p>, slot: 'top', slotClassName: 'x',
      });
      const { top, body } = registry.layout([entry('a', 'banner'), entry('b', 'insight')]);
      expect(top).toEqual([{ entry: expect.objectContaining({ id: 'a' }), className: 'x' }]);
      expect(body.map((b) => b.id)).toEqual(['b']);
    });

    it('returns an empty top row when no top block is present', () => {
      expect(createBlockRegistry({}).layout([entry('a', 'insight')]).top).toEqual([]);
    });
  });
});
