import '@testing-library/jest-dom/extend-expect';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { mergeConfig } from '@edx/frontend-platform';
import {
  MemoryRouter, Route, Routes, useLocation,
} from 'react-router-dom';

import {
  applyPart, applyParts, beginTurn, getInitialChatStreamState,
} from '../stream/applyPart';
import { parseSseText } from '../stream/parseSse';
import { readGolden } from '../stream/testUtils';
import type { GoldenFile } from '../stream/testUtils';
import type {
  AssistantTurn, ChatStreamState, ItemCard, Part,
} from '../stream/types';
import { renderBlock } from './blockRegistry';
import LearningPagePane from './LearningPagePane';

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
        enterpriseSlug={SLUG}
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
    expect(screen.getByText("Your learning page is empty. Tell me what you want to learn and I'll build it.")).toBeInTheDocument();
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
              enterpriseSlug={SLUG}
              reducedMotion={false}
            />
          </MemoryRouter>
        </IntlProvider>,
      );
      const count = container.querySelectorAll('[data-block-id]').length;
      if (counts[counts.length - 1] !== count) { counts.push(count); }
    });
    expect(counts).toEqual([0, 1, 2, 3, 4, 5]);
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
    expect(screen.getByText('Becoming a confident team lead')).toBeInTheDocument();
  });

  it('keeps the previous page for off-topic and text-only turns', () => {
    const { turns } = runTurns(['normal_turn.sse', 'off_topic_turn.sse', 'no_match_turn.sse']);
    const { container } = renderPane(turns);
    expect(container.querySelector('section')).toHaveAttribute('data-turn-id', 'turn-1');
    expect(screen.getByText('Becoming a confident team lead')).toBeInTheDocument();
  });

  it('renders nothing for an unknown block type or version', () => {
    const ctx = { enterpriseSlug: SLUG, itemTitles: {} };
    expect(renderBlock({ v: 1, type: 'carousel', props: {} }, ctx)).toBeNull();
    expect(renderBlock({ v: 2, type: 'page_header', props: { title: 't', dek: 'd', label: 'l' } }, ctx)).toBeNull();
    expect(renderBlock({ v: 1, type: 'toString', props: {} }, ctx)).toBeNull();
  });

  it('renders course, exec ed and program cards with facts, why, fit badges and links', () => {
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
    expect(within(courseCard).getByText('Introductory · 4 weeks · Self-paced')).toBeInTheDocument();
    expect(within(courseCard).getByText('Why this fits you')).toBeInTheDocument();
    expect(within(courseCard).getByText('Because it fits.')).toBeInTheDocument();
    expect(within(courseCard).getByText('Fit tag')).toBeInTheDocument();
    expect(courseCard.querySelector('img')).toBeInTheDocument();

    const programCard = screen.getByRole('link', { name: 'A program' }).closest('.personalized-search__card') as HTMLElement;
    expect(within(programCard).getByText('Program')).toBeInTheDocument();
    expect(within(programCard).getByText(/Professional Certificate · Intermediate · 3 courses/)).toBeInTheDocument();
    const execCard = screen.getByRole('link', { name: 'An exec ed course' }).closest('.personalized-search__card') as HTMLElement;
    expect(within(execCard).getByText('Executive Education')).toBeInTheDocument();
  });

  it('renders model text as literal text, never HTML', () => {
    const turns = turnWithParts([{
      type: 'data-block',
      id: 'blk_1',
      data: {
        v: 1, type: 'page_header', props: { title: '<script>alert(1)</script>', dek: '<b>bold</b>', label: 'Your learning page' },
      },
    }]);
    const { container } = renderPane(turns);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(screen.getByText('<b>bold</b>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('degraded and fallback cards have no "Why this fits you" area or fit badges', () => {
    const { turns } = runTurns(['degraded_turn.sse']);
    renderPane(turns);
    expect(screen.queryByText('Why this fits you')).not.toBeInTheDocument();

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
    expect(screen.queryByText('Why this fits you')).not.toBeInTheDocument();
    expect(screen.queryByText('Fit tag')).not.toBeInTheDocument();
  });

  it('card links are reachable by Tab in reading order and open with Enter', async () => {
    const user = userEvent.setup();
    const { turns } = runTurns(['normal_turn.sse']);
    renderPane(turns);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Leading High-Performing Teams',
      'Communicating with Influence',
      'Strategic Thinking for Managers',
      'Professional Certificate in Management',
    ]);
    for (let i = 0; i < links.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await user.tab();
      expect(links[i]).toHaveFocus();
    }
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent(`/${SLUG}/program/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d`);
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
            enterpriseSlug={SLUG}
            reducedMotion
          />
        </MemoryRouter>
      </IntlProvider>,
    );
    expect(screen.getByRole('region', { name: 'Your learning page' })).toHaveFocus();
  });
});
