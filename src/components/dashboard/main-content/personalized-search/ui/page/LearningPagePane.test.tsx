import '@testing-library/jest-dom/extend-expect';
import { useState } from 'react';
import {
  act, fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { mergeConfig } from '@edx/frontend-platform';
import {
  MemoryRouter, Route, Routes, useLocation,
} from 'react-router-dom';

import {
  applyPart, applyParts, beginTurn, getInitialChatStreamState,
} from '../../core/stream/applyPart';
import { parseSseText } from '../../core/stream/parseSse';
import { readGolden } from '../../core/stream/testUtils';
import type { GoldenFile } from '../../core/stream/testUtils';
import type {
  AssistantTurn, ChatStreamState, ItemCard, Part,
} from '../../core/stream/types';
import { renderBlock } from '../../blocks/blockRegistry';
import LearningPagePane from './LearningPagePane';
import { createPortalItemLinks } from '../../adapters/portal/links';

const SLUG = 'test-enterprise';

const LocationProbe = () => <span data-testid="location">{useLocation().pathname}</span>;

type PaneProps = Partial<React.ComponentProps<typeof LearningPagePane>>;

const renderPane = (turns: AssistantTurn[], props: PaneProps = {}) => render(
  <IntlProvider locale="en">
    <MemoryRouter initialEntries={[`/${SLUG}`]}>
      <LearningPagePane
        turns={turns}
        viewedTurnId={null}
        links={createPortalItemLinks(SLUG)}
        reducedMotion={false}
        {...props}
      />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  </IntlProvider>,
);

const goldenParts = (file: GoldenFile) => parseSseText(readGolden(file));

const runTurns = (files: GoldenFile[]): ChatStreamState => files.reduce(
  (state, file, i) => applyParts(beginTurn(state, { localId: `turn-${i + 1}`, userMessage: `message ${i + 1}` }), goldenParts(file)),
  getInitialChatStreamState(),
);

const card = (overrides: Partial<ItemCard>): ItemCard => ({
  item_id: 'edX+X1',
  item_type: 'course',
  title: 'A course',
  image_url: null,
  partner_name: 'edX',
  partner_logo_url: null,
  link: { kind: 'course', course_key: 'edX+X1', course_type: 'verified-audit' },
  facts: { level_type: 'Introductory', weeks_to_complete: 4, pacing_type: 'self_paced' },
  why: 'Because it fits.',
  fit: ['Fit tag'],
  ...overrides,
});

const turnWithParts = (parts: Part[]): AssistantTurn[] => applyParts(
  beginTurn(getInitialChatStreamState(), { localId: 'turn-1', userMessage: 'm' }),
  [{ type: 'start', messageId: 'turn_x' }, ...parts, { type: 'finish' }],
).turns;

/** The golden turn with every block of one type left out. */
const goldenTurnWithout = (type: string) => turnWithParts(goldenParts('normal_turn.sse').filter((p) => !(
  p.type === 'data-block' && p.data.type === type)));

describe('LearningPagePane', () => {
  beforeEach(() => {
    mergeConfig({
      COURSE_TYPE_CONFIG: { 'executive-education-2u': { pathSlug: 'executive-education-2u' } },
    });
  });

  describe('new results bring the results column back to its top', () => {
    const tree = (turns: AssistantTurn[], reducedMotion = false, viewedTurnId: string | null = null) => (
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={[`/${SLUG}`]}>
          <LearningPagePane
            turns={turns}
            viewedTurnId={viewedTurnId}
            links={createPortalItemLinks(SLUG)}
            reducedMotion={reducedMotion}
          />
        </MemoryRouter>
      </IntlProvider>
    );
    const placePaneAt = (top: number) => jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ top } as DOMRect);
    let scrollIntoView: jest.Mock;
    beforeEach(() => {
      scrollIntoView = jest.fn();
      // jsdom doesn't implement scrollIntoView.
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    });
    afterEach(() => {
      jest.restoreAllMocks();
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    });

    it('brings the results top into view on phones when the learner is past it, and not on mount', () => {
      placePaneAt(-800);
      const { rerender } = render(tree(runTurns(['normal_turn.sse']).turns));
      expect(scrollIntoView).not.toHaveBeenCalled();
      rerender(tree(runTurns(['normal_turn.sse', 'normal_turn.sse']).turns));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    });

    it('never writes to the host page to turn off scroll anchoring (a CSS rule does it)', () => {
      const { unmount } = render(tree(runTurns(['normal_turn.sse']).turns));
      const written = Array.from(document.documentElement.attributes).filter(({ name }) => name.includes('personalized'));
      expect(written).toEqual([]);
      unmount();
    });

    it('stays put when the top is already in view, and jumps without animation for reduced motion', () => {
      placePaneAt(120);
      const { rerender } = render(tree(runTurns(['normal_turn.sse']).turns));
      rerender(tree(runTurns(['normal_turn.sse', 'normal_turn.sse']).turns));
      expect(scrollIntoView).not.toHaveBeenCalled();
      placePaneAt(-50);
      rerender(tree(runTurns(['normal_turn.sse', 'normal_turn.sse', 'normal_turn.sse']).turns, true));
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    });

    it('does not scroll for a new chat with no results', () => {
      placePaneAt(-800);
      const { rerender } = render(tree(runTurns(['normal_turn.sse']).turns));
      rerender(tree([]));
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('scrolls back to the top when an earlier turn is chosen', () => {
      placePaneAt(-800);
      const { turns } = runTurns(['normal_turn.sse', 'normal_turn.sse']);
      const { rerender } = render(tree(turns));
      rerender(tree(turns, false, turns[0].localId));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('resets its own scroll container in the wide layout instead of scrolling the page', () => {
      const scroller = document.createElement('div');
      scroller.className = 'personalized-search__results-scroll';
      document.body.appendChild(scroller);
      const { rerender } = render(tree(runTurns(['normal_turn.sse']).turns), { container: scroller });
      scroller.scrollTop = 300;
      rerender(tree(runTurns(['normal_turn.sse', 'normal_turn.sse']).turns));
      expect(scroller.scrollTop).toBe(0);
      expect(scrollIntoView).not.toHaveBeenCalled();
      scroller.remove();
    });
  });

  describe('loading: placeholders, then blocks top to bottom', () => {
    /** The first turn done, then a second turn with only `upTo` of its parts streamed. */
    const secondTurnUpTo = (upTo: (parts: Part[]) => Part[], second: GoldenFile = 'normal_turn.sse') => {
      const done = applyParts(
        beginTurn(getInitialChatStreamState(), { localId: 'turn-1', userMessage: 'first' }),
        goldenParts('normal_turn.sse'),
      );
      const next = beginTurn(done, { localId: 'turn-2', userMessage: 'second' });
      return applyParts(next, upTo(goldenParts(second))).turns;
    };
    const blockTypes = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-block-id]'))
      .map((el) => el.getAttribute('data-block-id'));

    it('keeps the previous results while the message is being understood (an off-topic turn never replaces them)', () => {
      const turns = secondTurnUpTo((parts) => parts.filter((p) => p.type === 'start' || p.type.startsWith('data-session')
        || (p.type === 'data-status' && (p as { data: { step: string } }).data.step === 'understanding')));
      renderPane(turns);
      expect(screen.queryByTestId('results-skeleton')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Lead with confidence' })).toBeInTheDocument();
    });

    it('shows placeholders once searching, fills them top to bottom, and drops them when done', () => {
      const searching = secondTurnUpTo((parts) => parts.slice(0, parts.findIndex((p) => p.type === 'text-start')));
      const { rerender, container } = renderPane(searching);
      const skeleton = screen.getByTestId('results-skeleton');
      expect(Array.from(skeleton.querySelectorAll('[data-skeleton]')).map((el) => el.getAttribute('data-skeleton')))
        .toEqual(['header', 'top-pick', 'cards']);
      expect(container.querySelector('[data-block-id]')).toBeNull(); // the old results are gone

      const headerOnly = secondTurnUpTo((parts) => parts.slice(0, parts.findIndex((p) => p.type === 'data-block'
        && (p as { data: { type: string } }).data.type === 'top_pick')));
      rerender(
        <IntlProvider locale="en">
          <MemoryRouter initialEntries={[`/${SLUG}`]}>
            <LearningPagePane
              turns={headerOnly}
              viewedTurnId={null}
              links={createPortalItemLinks(SLUG)}
              reducedMotion={false}
            />
          </MemoryRouter>
        </IntlProvider>,
      );
      expect(screen.getByRole('heading', { level: 2, name: 'Lead with confidence' })).toBeInTheDocument();
      expect(Array.from(screen.getByTestId('results-skeleton').querySelectorAll('[data-skeleton]'))
        .map((el) => el.getAttribute('data-skeleton'))).toEqual(['top-pick', 'cards']);
      expect(blockTypes(container)).toHaveLength(1);
    });

    it('a no-match turn shows placeholders while it searches, then the previous results return under its caveat', () => {
      const searching = secondTurnUpTo((parts) => parts.slice(0, parts.findIndex((p) => p.type === 'data-block')), 'no_match_turn.sse');
      const { container, unmount } = renderPane(searching);
      expect(screen.getByTestId('results-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 2, name: 'Lead with confidence' })).not.toBeInTheDocument();
      expect(container.querySelector('.personalized-search__caveat')).toBeNull();
      unmount();

      renderPane(secondTurnUpTo((parts) => parts, 'no_match_turn.sse'));
      expect(screen.queryByTestId('results-skeleton')).not.toBeInTheDocument();
      expect(screen.getByText('No matching courses')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Lead with confidence' })).toBeInTheDocument();
    });

    it('renders the finished turn in stream order, with the suggested order in the header row and no placeholders', () => {
      const { container } = renderPane(runTurns(['normal_turn.sse']).turns);
      expect(screen.queryByTestId('results-skeleton')).not.toBeInTheDocument();
      const order = Array.from(container.querySelectorAll('.personalized-search__page-header, .personalized-search__top-pick, '
        + '.personalized-search__compare, .personalized-search__more-options, .personalized-search__plan'))
        .map((el) => el.className.match(/personalized-search__(page-header|top-pick|compare|more-options|plan)/)?.[1]);
      // The plan sits in the header row's top-right corner, though it streams last.
      expect(order).toEqual(['page-header', 'plan', 'top-pick', 'compare', 'more-options']);
      expect(container.querySelector('.personalized-search__page-top .personalized-search__plan')).not.toBeNull();
      expect(container.querySelector('[data-skeleton="plan"]')).toBeNull();
    });

    it('holds the header row corner for the plan while the turn streams, and closes it without one', () => {
      const streaming = secondTurnUpTo((parts) => parts.slice(0, parts.findIndex((p) => p.type === 'data-block'
        && (p as { data: { type: string } }).data.type === 'compare')));
      const { container, unmount } = renderPane(streaming);
      expect(container.querySelector('.personalized-search__page-top [data-skeleton="plan"]')).not.toBeNull();
      unmount();
      const done = renderPane(goldenTurnWithout('plan'));
      expect(done.container.querySelector('[data-skeleton="plan"], .personalized-search__plan')).toBeNull();
    });
  });

  it('keeps a plan in the top row when the turn has no headline, with no Why these?', () => {
    const { container } = renderPane(goldenTurnWithout('page_header'));
    const topRow = container.querySelector('.personalized-search__page-top') as HTMLElement;
    expect(within(topRow).getByRole('heading', { name: 'A suggested order' })).toBeInTheDocument();
    expect(container.querySelector('.personalized-search__page-header')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Why these?' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Top pick' })).toBeInTheDocument();
  });

  it('shows the empty page before any turn has a page', () => {
    renderPane([]);
    expect(screen.getByText('Your results will show here. Tell me what you want to learn.')).toBeInTheDocument();
  });

  it('renders blocks one at a time as their parts arrive', () => {
    let state = beginTurn(getInitialChatStreamState(), { localId: 'turn-1', userMessage: 'm' });
    const { container, rerender } = renderPane(state.turns);
    const counts: number[] = [];
    goldenParts('normal_turn.sse').forEach((part) => {
      state = applyPart(state, part);
      rerender(
        <IntlProvider locale="en">
          <MemoryRouter>
            <LearningPagePane
              turns={state.turns}
              viewedTurnId={null}
              links={createPortalItemLinks(SLUG)}
              reducedMotion={false}
            />
          </MemoryRouter>
        </IntlProvider>,
      );
      const count = container.querySelectorAll('[data-block-id]').length;
      if (counts[counts.length - 1] !== count) { counts.push(count); }
    });
    // page_header, top_pick, compare, two sections, insight, plan: each appears as its part arrives.
    expect(counts).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(screen.getByText('A suggested order')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Start with people skills' })).toBeInTheDocument();
  });

  it('shows the latest page by default and the viewed turn when one is selected', () => {
    const { turns } = runTurns(['normal_turn.sse', 'degraded_turn.sse']);
    const { container, unmount } = renderPane(turns);
    expect(container.querySelector('section')).toHaveAttribute('data-turn-id', 'turn-2');
    expect(screen.getByText('Results for “I want to get better at leading a team”')).toBeInTheDocument();
    unmount();

    renderPane(turns, { viewedTurnId: 'turn-1' });
    expect(screen.getByText('Lead with confidence')).toBeInTheDocument();
  });

  it('keeps the previous page for off-topic and text-only turns', () => {
    const { turns } = runTurns(['normal_turn.sse', 'off_topic_turn.sse', 'no_match_turn.sse']);
    const { container } = renderPane(turns);
    expect(container.querySelector('section')).toHaveAttribute('data-turn-id', 'turn-1');
    expect(screen.getByText('Lead with confidence')).toBeInTheDocument();
  });

  it('renders nothing for an unknown block type or version', () => {
    const ctx = { links: createPortalItemLinks(SLUG), itemTitles: {} };
    expect(renderBlock({ v: 1, type: 'carousel', props: {} }, ctx)).toBeNull();
    expect(renderBlock({ v: 2, type: 'page_header', props: { title: 't', dek: 'd', label: 'l' } }, ctx)).toBeNull();
    expect(renderBlock({ v: 1, type: 'toString', props: {} }, ctx)).toBeNull();
  });

  it('renders course, exec ed and program cards with the type, time, one reason behind Why this?, and links', async () => {
    const user = userEvent.setup();
    const turns = turnWithParts([
      {
        type: 'data-block',
        id: 'blk_1',
        data: {
          v: 1,
          type: 'item_section',
          props: {
            item_type: 'course',
            label: 'Courses · 1 pick',
            dek: '',
            fallback: false,
            items: [card({ image_url: 'https://img.example/c.jpg' })],
          },
        },
      },
      {
        type: 'data-block',
        id: 'blk_2',
        data: {
          v: 1,
          type: 'item_section',
          props: {
            item_type: 'executive_education',
            label: 'Executive Education · 1 pick',
            dek: '',
            fallback: false,
            items: [card({
              item_id: 'GetSmarterX+EE1',
              item_type: 'executive_education',
              title: 'An exec ed course',
              link: { kind: 'course', course_key: 'GetSmarterX+EE1', course_type: 'executive-education-2u' },
            })],
          },
        },
      },
      {
        type: 'data-block',
        id: 'blk_3',
        data: {
          v: 1,
          type: 'item_section',
          props: {
            item_type: 'program',
            label: 'Programs · 1 pick',
            dek: '',
            fallback: false,
            items: [card({
              item_id: 'prog-uuid',
              item_type: 'program',
              title: 'A program',
              link: { kind: 'program', program_uuid: 'prog-uuid' },
              facts: { level_type: 'Intermediate', program_type: 'Professional Certificate', course_count: 3 },
            })],
          },
        },
      },
    ]);
    renderPane(turns);

    expect(screen.getByRole('link', { name: 'A course' })).toHaveAttribute('href', `/${SLUG}/course/edX+X1`);
    expect(screen.getByRole('link', { name: 'An exec ed course' }))
      .toHaveAttribute('href', `/${SLUG}/executive-education-2u/course/GetSmarterX+EE1`);
    expect(screen.getByRole('link', { name: 'A program' })).toHaveAttribute('href', `/${SLUG}/program/prog-uuid`);

    const courseCard = screen.getByRole('link', { name: 'A course' }).closest('.personalized-search__card') as HTMLElement;
    expect(within(courseCard).getByText('edX')).toBeInTheDocument();
    expect(within(courseCard).getByText('Course')).toBeInTheDocument();
    expect(within(courseCard).getByText('4 weeks')).toBeInTheDocument();
    expect(within(courseCard).getByText('Self-paced, Introductory')).toBeInTheDocument();
    expect(within(courseCard).queryByText('Fit tag')).not.toBeInTheDocument();
    expect(within(courseCard).queryByText('Because it fits.')).not.toBeInTheDocument();
    await user.click(within(courseCard).getByRole('button', { name: 'Why this?' }));
    expect(within(courseCard).getByText('Because it fits.')).toBeInTheDocument();
    expect(courseCard.querySelector('img')).toBeInTheDocument();
    // Every card has the same layout, alone in its group or not.
    expect(courseCard).not.toHaveClass('personalized-search__card--horizontal');

    const programCard = screen.getByRole('link', { name: 'A program' }).closest('.personalized-search__card') as HTMLElement;
    expect(within(programCard).getByText('Professional Certificate')).toBeInTheDocument();
    expect(within(programCard).getByText('3 courses')).toBeInTheDocument();
    expect(programCard).toHaveClass('personalized-search__card--certificate');
    const execCard = screen.getByRole('link', { name: 'An exec ed course' }).closest('.personalized-search__card') as HTMLElement;
    expect(within(execCard).getByText('Executive Education')).toBeInTheDocument();
  });

  it('renders model text as literal text, never HTML', () => {
    const turns = turnWithParts([{
      type: 'data-block',
      id: 'blk_1',
      data: {
        v: 1, type: 'page_header', props: { title: '<script>alert(1)</script>', dek: '<b>bold</b>', label: 'Your results' },
      },
    }]);
    const { container } = renderPane(turns);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(screen.getByText('<b>bold</b>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('degraded and fallback cards have no Why this? toggle', () => {
    const { turns } = runTurns(['degraded_turn.sse']);
    renderPane(turns);
    expect(screen.queryByRole('button', { name: 'Why this?' })).not.toBeInTheDocument();

    const fallback = turnWithParts([{
      type: 'data-block',
      id: 'blk_1',
      data: {
        v: 1,
        type: 'item_section',
        props: {
          item_type: 'course', label: 'Courses · 1 pick', dek: '', fallback: true, items: [card({ why: null, fit: [] })],
        },
      },
    }]);
    renderPane(fallback);
    expect(screen.queryByRole('button', { name: 'Why this?' })).not.toBeInTheDocument();
  });

  it('shows hours per week when the card has them', () => {
    const turns = turnWithParts([{
      type: 'data-block',
      id: 'blk_1',
      data: {
        v: 1,
        type: 'item_section',
        props: {
          item_type: 'course',
          label: 'Courses · 2 picks',
          dek: '',
          fallback: false,
          items: [
            card({ facts: { weeks_to_complete: 6, hours_per_week_min: 3, hours_per_week_max: 4 } }),
            card({ item_id: 'edX+X2', title: 'Another', facts: { hours_per_week_min: 5, hours_per_week_max: 5 } }),
          ],
        },
      },
    }]);
    renderPane(turns);
    expect(screen.getByText('3–4 hrs/week · 6 weeks')).toBeInTheDocument();
    expect(screen.getByText('~5 hrs/week')).toBeInTheDocument();
  });

  it('leads with the top pick and a Best for comparison from the golden turn', async () => {
    const user = userEvent.setup();
    const onAsk = jest.fn();
    const onDismiss = jest.fn();
    const { turns } = runTurns(['normal_turn.sse']);
    renderPane(turns, { onAsk, onDismiss });
    expect(screen.getByRole('heading', { level: 2, name: 'Lead with confidence' })).toBeInTheDocument();
    const topPick = screen.getByRole('heading', { name: 'Top pick' }).closest('section') as HTMLElement;
    expect(within(topPick).getByText('Because you want to lead a team and earn a credential.')).toBeInTheDocument();
    expect(within(topPick).getByText('Certificate')).toBeInTheDocument();
    await user.click(within(topPick).getByRole('button', { name: 'More like this' }));
    expect(onAsk).toHaveBeenCalledWith('More like Program p-1');
    await user.click(within(topPick).getByRole('button', { name: 'Not for me: Program p-1' }));
    expect(onDismiss).toHaveBeenCalledWith(expect.objectContaining({ item_id: 'p-1' }));

    const compare = screen.getByText('Compare top options').closest('section') as HTMLElement;
    // Each "Best for" label sits just above its card, outside it.
    expect(within(compare).getAllByRole('heading', { level: 4 }).filter((h) => !h.closest('.personalized-search__card'))
      .map((h) => h.textContent)).toEqual([
      'Best for a recognized credential', 'Best for an executive-level perspective', 'Best for a quick start',
    ]);
    const option = within(compare).getByText('Best for a quick start').closest('.personalized-search__compare-option');
    expect(option?.querySelector('.personalized-search__card')).toBeInTheDocument();
    // The same card as the rest of the results: image and the Not for me menu.
    const pickInCompare = within(compare).getByRole('link', { name: 'Program p-1' })
      .closest('.personalized-search__card') as HTMLElement;
    expect(within(pickInCompare).getByText('Top pick')).toBeInTheDocument();
    expect(pickInCompare.querySelector('img.pgn__card-image-cap')).toBeInTheDocument();
    expect(within(pickInCompare).getByRole('button', { name: 'More options for Program p-1' })).toBeInTheDocument();
  });

  it('explains how the suggested order was picked and why, from an info button', async () => {
    const user = userEvent.setup();
    const onExplain = jest.fn();
    const { turns } = runTurns(['normal_turn.sse']);
    renderPane(turns, { onExplain });
    const plan = screen.getByRole('heading', { name: 'A suggested order' }).closest('aside') as HTMLElement;
    await user.hover(within(plan).getByRole('button', { name: 'How this order was picked' }));
    const popover = await screen.findByRole('tooltip');
    expect(within(popover).getByText(/The best fit for your goal comes first/)).toBeInTheDocument();
    expect(within(popover).getByText('Start with the basics, then build to the full certificate.')).toBeInTheDocument();
    expect(onExplain).toHaveBeenCalledWith('order');
  });

  it('hides Why these? when the final profile has no chips (nothing the results reflect)', () => {
    const block = (id: string, type: string, props: object) => ({ type: 'data-block', id, data: { v: 1, type, props } });
    renderPane(turnWithParts([
      block('h', 'page_header', { title: 'Lead with confidence', dek: '', label: 'Your results' }),
      block('p', 'profile', { summary: 'S', chips: ['Leadership'] }),
      block('p', 'profile', { summary: 'S', chips: [] }),
    ] as Part[]));
    expect(screen.getByRole('heading', { level: 2, name: 'Lead with confidence' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Why these?' })).not.toBeInTheDocument();
  });

  it('opens Why these? with the profile summary and chips, and closes it with Escape', async () => {
    const user = userEvent.setup();
    const { turns } = runTurns(['normal_turn.sse']);
    renderPane(turns);
    const trigger = screen.getByRole('button', { name: 'Why these?' });
    await user.click(trigger);
    const popover = await screen.findByRole('tooltip');
    expect(within(popover).getByText(/I picked these from your organization's catalog/)).toBeInTheDocument();
    expect(within(popover).getByText('Leadership')).toBeInTheDocument();
    // rootClose listens for keyup with keyCode 27, which browsers set and user-event doesn't.
    fireEvent.keyUp(document, { key: 'Escape', keyCode: 27 });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('keeps Why these? open when the pointer leaves, and closes it on an outside click', async () => {
    const user = userEvent.setup();
    const { turns } = runTurns(['normal_turn.sse']);
    renderPane(turns);
    const trigger = screen.getByRole('button', { name: 'Why these?' });
    await user.click(trigger);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await user.unhover(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('has no Why these? without a profile', () => {
    renderPane(turnWithParts([{
      type: 'data-block', id: 'blk_1', data: { v: 1, type: 'page_header', props: { title: 'T', dek: 'D', label: 'l' } },
    }]));
    expect(screen.queryByRole('button', { name: 'Why these?' })).not.toBeInTheDocument();
  });

  it('shows the latest caveat above the previous results when that turn found nothing', () => {
    const { turns } = runTurns(['normal_turn.sse', 'no_match_turn.sse']);
    const { container } = renderPane(turns);
    const caveat = container.querySelector('.personalized-search__caveat') as HTMLElement;
    expect(within(caveat).getByText('No matching courses')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Lead with confidence' })).toBeInTheDocument();
    const firstBlock = container.querySelector('[data-block-id]');
    expect(firstBlock).toContainElement(caveat);
  });

  it('keeps the latest caveat with its own page while an earlier reply is viewed', () => {
    const caveat: Part = {
      type: 'data-block', id: 'blk_cav', data: { v: 1, type: 'caveat', props: { title: 'Only partly covered', body: 'b' } },
    };
    const parts = goldenParts('normal_turn.sse');
    const finish = parts.findIndex(({ type }) => type === 'finish');
    const latestParts = [...parts.slice(0, finish), caveat, ...parts.slice(finish)];
    const first = applyParts(beginTurn(getInitialChatStreamState(), { localId: 'turn-1', userMessage: 'm1' }), parts);
    const { turns } = applyParts(beginTurn(first, { localId: 'turn-2', userMessage: 'm2' }), latestParts);
    const { rerender } = renderPane(turns, { viewedTurnId: 'turn-1' });
    expect(screen.queryByText('Only partly covered')).not.toBeInTheDocument();
    rerender(
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={[`/${SLUG}`]}>
          <LearningPagePane
            turns={turns}
            viewedTurnId={null}
            links={createPortalItemLinks(SLUG)}
            reducedMotion={false}
          />
        </MemoryRouter>
      </IntlProvider>,
    );
    expect(screen.getByText('Only partly covered')).toBeInTheDocument();
  });

  it('hides a caveat-only latest reply while the learner views an earlier reply they picked', () => {
    const { turns } = runTurns(['normal_turn.sse', 'normal_turn.sse', 'no_match_turn.sse']);
    renderPane(turns, { viewedTurnId: 'turn-1' });
    expect(screen.queryByText('No matching courses')).not.toBeInTheDocument();
  });

  it('marks cards new since the last message as Updated', () => {
    const turns = turnWithParts([{
      type: 'data-block',
      id: 'blk_1',
      data: {
        v: 1,
        type: 'item_section',
        props: {
          item_type: 'course',
          label: 'Courses',
          dek: '',
          fallback: false,
          items: [card({ item_id: 'old', title: 'Old' }), card({ item_id: 'new', title: 'New', status: 'new' })],
        },
      },
    }]);
    renderPane(turns);
    const newCard = screen.getByRole('link', { name: 'New' }).closest('.personalized-search__card') as HTMLElement;
    const oldCard = screen.getByRole('link', { name: 'Old' }).closest('.personalized-search__card') as HTMLElement;
    expect(within(newCard).getByText('Updated')).toBeInTheDocument();
    expect(newCard).toHaveClass('personalized-search__card--updated');
    expect(within(oldCard).queryByText('Updated')).not.toBeInTheDocument();
  });

  it('hides a dismissed top pick and compared option', () => {
    const { turns } = runTurns(['normal_turn.sse']);
    renderPane(turns, { dismissedIds: new Set(['p-1']) });
    expect(screen.queryByRole('heading', { name: 'Top pick' })).not.toBeInTheDocument();
    const compare = screen.getByText('Compare top options').closest('section') as HTMLElement;
    expect(within(compare).queryByRole('link', { name: 'Program p-1' })).not.toBeInTheDocument();
  });

  it('groups sections under More options with the type, See all (n), one line and up to three cards', () => {
    const turns = turnWithParts([{
      type: 'data-block',
      id: 'blk_1',
      data: {
        v: 1,
        type: 'item_section',
        props: {
          item_type: 'course',
          label: 'Courses · 3 picks',
          dek: 'Focused, single-topic learning.',
          fallback: false,
          total: 7,
          search_query: 'team leadership',
          items: [card({ item_id: 'c1', title: 'One' }), card({ item_id: 'c2', title: 'Two' }),
            card({ item_id: 'c3', title: 'Three' })],
          reserve: [card({ item_id: 'c4', title: 'Four' })],
        },
      },
    }]);
    renderPane(turns);
    expect(screen.getByText('More options')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Courses' })).toBeInTheDocument();
    expect(screen.getByText('Focused, single-topic learning.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See all (7)' }))
      .toHaveAttribute('href', `/${SLUG}/search?q=team%20leadership&content_type=course`);
    expect(screen.getAllByRole('link', { name: /One|Two|Three|Four/ }).map((l) => l.textContent))
      .toEqual(['One', 'Two', 'Three']);
  });

  it('hides See all (n) when the section has no search query, even with a total', () => {
    const section = (searchQuery?: string) => turnWithParts([{
      type: 'data-block',
      id: 'blk_1',
      data: {
        v: 1,
        type: 'item_section',
        props: {
          item_type: 'course',
          label: 'Courses',
          dek: '',
          fallback: false,
          total: 7,
          items: [card({})],
          ...(searchQuery === undefined ? {} : { search_query: searchQuery }),
        },
      },
    }]);
    const { unmount } = renderPane(section());
    expect(screen.getByRole('heading', { level: 3, name: 'Courses' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /See all/ })).not.toBeInTheDocument();
    unmount();
    renderPane(section('  '));
    expect(screen.queryByRole('link', { name: /See all/ })).not.toBeInTheDocument();
  });

  it('fills a removed card with the next item, then the reserve, and drops See all without a total', () => {
    const section = (dismissed: string[]) => {
      const turns = turnWithParts([{
        type: 'data-block',
        id: 'blk_1',
        data: {
          v: 1,
          type: 'item_section',
          props: {
            item_type: 'program',
            label: 'Programs',
            dek: '',
            fallback: false,
            items: [card({ item_id: 'p1', title: 'P1' }), card({ item_id: 'p2', title: 'P2' })],
            reserve: [card({ item_id: 'p3', title: 'P3' })],
          },
        },
      }]);
      return renderPane(turns, { dismissedIds: new Set(dismissed) });
    };
    const first = section(['p1']);
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual(['P2', 'P3']);
    expect(screen.queryByRole('link', { name: /See all/ })).not.toBeInTheDocument();
    first.unmount();
    section(['p1', 'p2', 'p3']);
    expect(screen.queryByText('Programs')).not.toBeInTheDocument();
  });

  it('card links are reachable by Tab in reading order and open with Enter', async () => {
    const user = userEvent.setup();
    const { turns } = runTurns(['normal_turn.sse']);
    renderPane(turns);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Program p-1',
      'Program p-1',
      'Course Yale+E1',
      'Course edX+C3',
      'Course edX+C1',
      'Course edX+C2',
      'Course edX+C4',
      'Program p-2',
    ]);
    // Links come in reading order, and Tab reaches each one (cards add their own controls between them).
    const reached = new Set<Element>();
    for (let i = 0; i < 40 && reached.size < new Set(links).size; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await user.tab();
      if (links.includes(document.activeElement as HTMLElement)) { reached.add(document.activeElement as Element); }
    }
    expect(reached.size).toBe(new Set(links).size);
    links[links.length - 1].focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent(`/${SLUG}/program/p-2`);
  });

  describe('the Undo notice', () => {
    const C1 = 'edX+C1';
    /** The golden page with C1 hidden by Not for me, and a host that clears the notice like the controller. */
    const PaneWithNotice = ({ onClearNotice }: { onClearNotice?: () => void }) => {
      const hidden = runTurns(['normal_turn.sse']).turns[0].blocks.flatMap(({ block }) => (
        block.type === 'item_section' ? block.props.items : [])).find((item) => item.item_id === C1) as ItemCard;
      const [undoItem, setUndoItem] = useState<ItemCard | null>(hidden);
      const [dismissedIds, setDismissedIds] = useState(new Set([C1]));
      return (
        <IntlProvider locale="en">
          <MemoryRouter>
            <input aria-label="Elsewhere" />
            <LearningPagePane
              turns={runTurns(['normal_turn.sse']).turns}
              viewedTurnId={null}
              links={createPortalItemLinks(SLUG)}
              reducedMotion
              undoItem={undoItem}
              dismissedIds={dismissedIds}
              onUndo={() => {
                setUndoItem(null);
                setDismissedIds(new Set());
              }}
              onClearNotice={() => {
                onClearNotice?.();
                setUndoItem(null);
              }}
            />
          </MemoryRouter>
        </IntlProvider>
      );
    };
    afterEach(() => jest.useRealTimers());

    it('restarts its 5 second timer for each hidden card', () => {
      jest.useFakeTimers();
      const onClearNotice = jest.fn();
      const tree = (item: ItemCard) => (
        <IntlProvider locale="en">
          <MemoryRouter>
            <LearningPagePane
              turns={[]}
              viewedTurnId={null}
              links={createPortalItemLinks(SLUG)}
              reducedMotion
              undoItem={item}
              onClearNotice={onClearNotice}
            />
          </MemoryRouter>
        </IntlProvider>
      );
      const { rerender } = render(tree(card({ item_id: 'a', title: 'First' })));
      act(() => { jest.advanceTimersByTime(3000); });
      rerender(tree(card({ item_id: 'b', title: 'Second' })));
      act(() => { jest.advanceTimersByTime(3000); });
      expect(onClearNotice).not.toHaveBeenCalled();
      expect(screen.getByText(/^Removed Second/)).toBeInTheDocument();
      act(() => { jest.advanceTimersByTime(2500); });
      expect(onClearNotice).toHaveBeenCalledTimes(1);
    });

    it('Undo puts focus on the restored card\'s link', async () => {
      const user = userEvent.setup();
      render(<PaneWithNotice />);
      expect(screen.queryByRole('link', { name: 'Course edX+C1' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Undo' }));
      await waitFor(() => expect(screen.getByRole('link', { name: 'Course edX+C1' })).toHaveFocus());
    });

    it('closing on its timeout puts lost focus on the results, and leaves focus the learner moved alone', () => {
      jest.useFakeTimers();
      const { unmount } = render(<PaneWithNotice />);
      act(() => { jest.advanceTimersByTime(5000); });
      expect(screen.getByRole('region', { name: 'Your results' })).toHaveFocus();
      unmount();

      const onClearNotice = jest.fn();
      render(<PaneWithNotice onClearNotice={onClearNotice} />);
      screen.getByRole('textbox', { name: 'Elsewhere' }).focus();
      act(() => { jest.advanceTimersByTime(5000); });
      expect(onClearNotice).toHaveBeenCalled();
      expect(screen.getByRole('textbox', { name: 'Elsewhere' })).toHaveFocus();
    });
  });

  it('adds the entrance transition only when reduced motion is not requested', () => {
    const { turns } = runTurns(['normal_turn.sse']);
    const { container, unmount } = renderPane(turns, { reducedMotion: false });
    expect(container.querySelectorAll('.personalized-search__block--enter').length).toBeGreaterThan(0);
    unmount();
    const reduced = renderPane(turns, { reducedMotion: true });
    expect(reduced.container.querySelectorAll('.personalized-search__block--enter')).toHaveLength(0);
    expect(reduced.container.querySelectorAll('.personalized-search__block').length).toBeGreaterThan(0);
  });
});
