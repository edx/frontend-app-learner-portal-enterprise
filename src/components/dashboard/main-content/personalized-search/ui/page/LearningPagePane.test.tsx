import '@testing-library/jest-dom/extend-expect';
import {
  render, screen, waitFor, within,
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
        pageFocusRequest={0}
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

describe('LearningPagePane', () => {
  beforeEach(() => {
    mergeConfig({
      COURSE_TYPE_CONFIG: { 'executive-education-2u': { pathSlug: 'executive-education-2u' } },
    });
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
              pageFocusRequest={0}
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
    // A single card in its row lays out horizontally.
    expect(courseCard).toHaveClass('personalized-search__card--horizontal');

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
    expect(within(compare).getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
      'Best for a recognized credential', 'Best for an executive-level perspective', 'Best for a quick start',
    ]);
    const pickInCompare = within(compare).getByRole('link', { name: 'Program p-1' })
      .closest('.personalized-search__card') as HTMLElement;
    expect(within(pickInCompare).getByText('Top pick')).toBeInTheDocument();
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
    await user.keyboard('{Escape}');
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

  it('hides a dismissed top pick and compared option', () => {
    const { turns } = runTurns(['normal_turn.sse']);
    renderPane(turns, { dismissedIds: new Set(['p-1']) });
    expect(screen.queryByRole('heading', { name: 'Top pick' })).not.toBeInTheDocument();
    const compare = screen.getByText('Compare top options').closest('section') as HTMLElement;
    expect(within(compare).queryByRole('link', { name: 'Program p-1' })).not.toBeInTheDocument();
  });

  it('groups sections under More options with the type, See all (n), one line and two cards', () => {
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
      .toHaveAttribute('href', `/${SLUG}/search?q=m&content_type=course`);
    expect(screen.getAllByRole('link', { name: /One|Two|Three|Four/ }).map((l) => l.textContent)).toEqual(['One', 'Two']);
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

  it('adds the entrance transition only when reduced motion is not requested', () => {
    const { turns } = runTurns(['normal_turn.sse']);
    const { container, unmount } = renderPane(turns, { reducedMotion: false });
    expect(container.querySelectorAll('.personalized-search__block--enter').length).toBeGreaterThan(0);
    unmount();
    const reduced = renderPane(turns, { reducedMotion: true });
    expect(reduced.container.querySelectorAll('.personalized-search__block--enter')).toHaveLength(0);
    expect(reduced.container.querySelectorAll('.personalized-search__block').length).toBeGreaterThan(0);
  });

  it('takes focus when the chat asks for it', () => {
    const { turns } = runTurns(['normal_turn.sse']);
    const { rerender } = renderPane(turns, { pageFocusRequest: 0 });
    rerender(
      <IntlProvider locale="en">
        <MemoryRouter>
          <LearningPagePane
            turns={turns}
            viewedTurnId={null}
            pageFocusRequest={1}
            links={createPortalItemLinks(SLUG)}
            reducedMotion
          />
        </MemoryRouter>
      </IntlProvider>,
    );
    expect(screen.getByRole('region', { name: 'Your results' })).toHaveFocus();
  });
});
