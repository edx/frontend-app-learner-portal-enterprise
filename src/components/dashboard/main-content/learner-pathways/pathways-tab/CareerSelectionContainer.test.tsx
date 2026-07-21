import '@testing-library/jest-dom/extend-expect';
import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { mergeConfig } from '@edx/frontend-platform';

import CareerSelectionContainer from './CareerSelectionContainer';
import type { CareerSelectionContainerProps } from './CareerSelectionContainer';
import { computePathwayInputFingerprint, EMPTY_LEARNER_INTENT, usePathwaysStore } from './state';
import type { LearnerIntent, PathwayGenerationRequest } from './state';
import {
  CAREER_SELECTION_STUB_MATCHES,
  CAREER_SELECTION_STUB_PROFILE,
} from './career-selection/fixtures';
import { PATHWAY_COURSES_STUB } from './pathway-courses/fixtures';
import { generatePathwayWorkflow, generateProfileWorkflow } from './workflows';
import { PathwaysActionBarProvider } from './action-bar';
import { getDismissedRank, recordDismissal } from '../courses-tab-alert/data/bannerDismissal';

jest.mock('../../../../app/data/hooks', () => ({
  useSearchCatalogs: jest.fn(() => ['cat-1']),
  useAlgoliaSearch: jest.fn(() => ({ catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' } })),
}));

jest.mock('./workflows', () => {
  // eslint-disable-next-line global-require
  const { CAREER_SELECTION_STUB_MATCHES: matches, CAREER_SELECTION_STUB_PROFILE: profile } = require('./career-selection/fixtures');
  // eslint-disable-next-line global-require
  const { PATHWAY_COURSES_STUB: courses } = require('./pathway-courses/fixtures');
  return {
    generateProfileWorkflow: jest.fn(() => Promise.resolve({
      learnerProfile: profile,
      careerMatches: matches,
    })),
    generatePathwayWorkflow: jest.fn().mockResolvedValue({ courses }),
  };
});

const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/mock-form/viewform';

const SELECTED_CAREER_ID = 'reporting-data-analysis-manager';
const OTHER_CAREER_ID = 'business-data-analyst';

const baseLearnerIntent: LearnerIntent = {
  careerGoal: 'Senior Data Analyst',
  targetIndustry: 'EdTech',
  background: 'Data analyst at 2U with extensive experience in financial data and team leadership.',
  motivation: 'Upskill to prepare for promotion',
};

const skillsForCareer = (careerId: string): string[] => (
  CAREER_SELECTION_STUB_MATCHES.find((match) => match.id === careerId)?.skillsToDevelop ?? []
);

const unchangedRequest: PathwayGenerationRequest = {
  learnerIntent: baseLearnerIntent,
  learnerProfile: CAREER_SELECTION_STUB_PROFILE,
  selectedCareerId: SELECTED_CAREER_ID,
  selectedSkills: skillsForCareer(SELECTED_CAREER_ID),
};

/** Seeds the store as if a pathway already exists and no relevant edits have occurred. */
const seedExistingUnchangedPathway = () => {
  act(() => {
    usePathwaysStore.setState({
      learnerIntent: { ...baseLearnerIntent },
      learnerProfile: { ...CAREER_SELECTION_STUB_PROFILE },
      careerMatches: CAREER_SELECTION_STUB_MATCHES,
      selectedCareerId: SELECTED_CAREER_ID,
      selectedSkills: [...unchangedRequest.selectedSkills],
      pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
      pathwayInputFingerprint: computePathwayInputFingerprint(unchangedRequest),
    });
  });
};

const renderContainer = (props: Partial<CareerSelectionContainerProps> = {}) => render(
  <IntlProvider locale="en">
    <PathwaysActionBarProvider>
      <CareerSelectionContainer {...props} />
    </PathwaysActionBarProvider>
  </IntlProvider>,
);

const submitGoalSummaryEdit = async (
  user: ReturnType<typeof userEvent.setup>,
  careerGoal: string,
) => {
  await user.click(screen.getByTestId('goal-summary-edit-button'));
  const careerGoalField = screen.getByLabelText('Career Goal');
  await user.clear(careerGoalField);
  await user.type(careerGoalField, careerGoal);
  await user.click(screen.getByTestId('goal-summary-submit-button'));
};

describe('CareerSelectionContainer', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    global.localStorage.clear();
    jest.clearAllMocks();
    jest.mocked(generateProfileWorkflow).mockImplementation(() => Promise.resolve({
      learnerProfile: CAREER_SELECTION_STUB_PROFILE,
      careerMatches: CAREER_SELECTION_STUB_MATCHES,
    }));
    jest.mocked(generatePathwayWorkflow).mockResolvedValue({ courses: PATHWAY_COURSES_STUB });
    mergeConfig({ PATHWAYS_FEEDBACK_FORM_URL: FEEDBACK_FORM_URL });
  });

  it('hydrates the learner profile and stub career matches on first goal-summary submission', async () => {
    const user = userEvent.setup();
    // The learner has already completed Intake, so learnerIntent's other three
    // fields are already non-empty (required) before this Goal Summary edit.
    act(() => {
      usePathwaysStore.setState({ learnerIntent: { ...baseLearnerIntent } });
    });
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(usePathwaysStore.getState().learnerIntent.careerGoal).toBe('Director of Analytics');
    });
    expect(usePathwaysStore.getState().learnerProfile).not.toBeNull();
    expect(usePathwaysStore.getState().careerMatches).toEqual(CAREER_SELECTION_STUB_MATCHES);
  });

  it('replaces the generated profile wholesale on every successful Goal Summary submission', async () => {
    const user = userEvent.setup();
    act(() => {
      usePathwaysStore.setState({
        learnerIntent: { ...baseLearnerIntent },
        learnerProfile: { ...CAREER_SELECTION_STUB_PROFILE, skills: ['Some Other Skill'] },
        careerMatches: CAREER_SELECTION_STUB_MATCHES,
      });
    });
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(usePathwaysStore.getState().learnerIntent.careerGoal).toBe('Director of Analytics');
    });
    // The commit always uses the workflow's freshly generated profile — never the
    // learner's typed Goal Summary text, which lives on learnerIntent only.
    expect(usePathwaysStore.getState().learnerProfile).toEqual(CAREER_SELECTION_STUB_PROFILE);
  });

  it('surfaces a profile error and leaves the prior profile untouched when generateProfile rejects', async () => {
    const user = userEvent.setup();
    jest.mocked(generateProfileWorkflow).mockRejectedValueOnce(new Error('network down'));
    act(() => {
      usePathwaysStore.setState({ learnerIntent: { ...baseLearnerIntent } });
    });
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(screen.getByText('network down')).toBeInTheDocument();
    });
    expect(usePathwaysStore.getState().learnerProfile).toBeNull();
  });

  /**
   * Seeds the legacy/no-real-profile shape directly. Before Intake was wired to real
   * profile generation (see LearnerPathwaysTab's handleIntakeSubmit), every learner
   * reached CareerSelectionContainer this way. Now this is a legacy/edge-case path only
   * — e.g. a pathway that predates this feature, or the container reached without a
   * completed real Intake submission — not the everyday first-visit shape, which now
   * always has a non-null learnerProfile by the time this container renders. The outer
   * beforeEach's resetPathwaysState() already produces this shape, so this helper exists
   * to document that fact at each call site rather than to change behavior.
   */
  const seedLegacyNoProfileState = () => {
    expect(usePathwaysStore.getState().learnerProfile).toBeNull();
    expect(usePathwaysStore.getState().careerMatches).toEqual([]);
  };

  describe('State A — no existing pathway', () => {
    it('renders only the build action, no retake-quiz-adjacent trailing actions', () => {
      seedLegacyNoProfileState();
      renderContainer();
      expect(screen.getByTestId('career-build-pathway-button')).toHaveTextContent('Build my learning pathway');
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('career-rebuild-pathway-button')).not.toBeInTheDocument();
    });

    it('never persists fixture/stub data as a real pathway before a build succeeds', () => {
      seedLegacyNoProfileState();
      renderContainer();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();
    });

    it('calls onNext and commits the fingerprint when generatePathway resolves', async () => {
      seedLegacyNoProfileState();
      const user = userEvent.setup();
      const onNext = jest.fn();
      renderContainer({ onNext });

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);
      expect(usePathwaysStore.getState().selectedCareerId).toBe(SELECTED_CAREER_ID);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).not.toBeNull();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(PATHWAY_COURSES_STUB);
    });

    it('invokes generatePathwayWorkflow with the exact composed request, selected career, and catalog scope', async () => {
      const user = userEvent.setup();
      act(() => {
        usePathwaysStore.setState({
          learnerIntent: baseLearnerIntent,
          learnerProfile: CAREER_SELECTION_STUB_PROFILE,
          careerMatches: CAREER_SELECTION_STUB_MATCHES,
          selectedCareerId: SELECTED_CAREER_ID,
          selectedSkills: skillsForCareer(SELECTED_CAREER_ID),
        });
      });
      renderContainer();

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1));
      expect(generatePathwayWorkflow).toHaveBeenCalledWith({
        request: unchangedRequest,
        selectedCareer: CAREER_SELECTION_STUB_MATCHES.find((match) => match.id === SELECTED_CAREER_ID),
        catalogScope: {
          searchCatalogs: ['cat-1'],
          catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' },
        },
      });
    });

    it('commits the pathway result before navigating, not after', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      // Observes the commit via the store's own subscription mechanism rather than
      // spying on the action itself, so nothing about the store's real action
      // references is patched/leaked across tests.
      const commitObserved = jest.fn();
      const unsubscribe = usePathwaysStore.subscribe((state) => {
        if (state.pathwayCourses.length > 0) {
          commitObserved();
        }
      });
      try {
        seedLegacyNoProfileState();
        renderContainer({ onNext });

        await user.click(screen.getByTestId('career-build-pathway-button'));

        await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
        expect(commitObserved).toHaveBeenCalled();
        const commitOrder = commitObserved.mock.invocationCallOrder[0];
        const navigateOrder = onNext.mock.invocationCallOrder[0];
        expect(commitOrder).toBeLessThan(navigateOrder);
      } finally {
        unsubscribe();
      }
    });

    it('a later successful retry commits and navigates after a rejected build', async () => {
      const user = userEvent.setup();
      jest.mocked(generatePathwayWorkflow).mockRejectedValueOnce(new Error('boom'));
      const onNext = jest.fn();
      seedLegacyNoProfileState();
      renderContainer({ onNext });

      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => {
        expect(screen.getByTestId('career-build-pathway-button')).not.toBeDisabled();
      });
      expect(onNext).not.toHaveBeenCalled();

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(generatePathwayWorkflow).toHaveBeenCalledTimes(2);
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(PATHWAY_COURSES_STUB);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).not.toBeNull();
    });

    it('marks a State-A-built pathway as edited after a skill change, and durably persists the stub profile/matches', async () => {
      seedLegacyNoProfileState();
      const user = userEvent.setup();
      const onNext = jest.fn();
      renderContainer({ onNext });

      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(usePathwaysStore.getState().learnerProfile).toEqual(CAREER_SELECTION_STUB_PROFILE);
      expect(usePathwaysStore.getState().careerMatches).toEqual(CAREER_SELECTION_STUB_MATCHES);

      await user.click(screen.getByLabelText('Dismiss SQL'));

      expect(screen.getByTestId('career-view-current-pathway-button')).toBeInTheDocument();
      expect(screen.getByTestId('career-rebuild-pathway-button')).toBeInTheDocument();
    });

    it('persists the stub profile and matches as real once a State A pathway is built', async () => {
      const user = userEvent.setup();
      renderContainer();
      seedLegacyNoProfileState();

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(usePathwaysStore.getState().pathwayCourses).not.toEqual([]));
      expect(usePathwaysStore.getState().learnerProfile).toEqual(CAREER_SELECTION_STUB_PROFILE);
      expect(usePathwaysStore.getState().careerMatches).toEqual(CAREER_SELECTION_STUB_MATCHES);
    });

    it('does not fall back to profile skills when the selected career has an empty skillsToDevelop array', () => {
      act(() => {
        usePathwaysStore.setState({
          learnerProfile: { ...CAREER_SELECTION_STUB_PROFILE, skills: ['Fallback Skill'] },
          careerMatches: [
            {
              id: 'no-skills', title: 'No Skills Role', matchPercentage: 90, skillsToDevelop: [],
            },
          ],
          selectedCareerId: 'no-skills',
        });
      });
      renderContainer();

      expect(screen.getByTestId('skills-empty-state')).toBeInTheDocument();
      expect(screen.queryByText('Fallback Skill')).not.toBeInTheDocument();
    });

    it('recovers without navigating or persisting a pathway when generatePathway rejects', async () => {
      const user = userEvent.setup();
      jest.mocked(generatePathwayWorkflow).mockRejectedValueOnce('boom');
      const onNext = jest.fn();
      renderContainer({ onNext });

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => {
        expect(screen.getByTestId('career-build-pathway-button')).not.toBeDisabled();
      });
      expect(onNext).not.toHaveBeenCalled();
      // The error is now surfaced via the pathway-error alert (see also the dedicated
      // "surfaces a pathway error" test below).
      expect(screen.getByText('Unable to build the learning pathway.')).toBeInTheDocument();
      // Recovers: the pathway was never built, so no fingerprint/courses are committed.
      expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();
    });

    it('shows the loading state and cannot issue duplicate builds from a double click', async () => {
      const user = userEvent.setup();
      let resolveWorkflow: () => void = () => {};
      jest.mocked(generatePathwayWorkflow).mockImplementationOnce(() => new Promise((resolve) => {
        resolveWorkflow = () => resolve({ courses: PATHWAY_COURSES_STUB });
      }));
      renderContainer();

      const button = screen.getByTestId('career-build-pathway-button');
      await user.click(button);
      await user.click(button);

      expect(screen.getByTestId('career-build-pathway-button')).toHaveTextContent('Building pathway...');
      expect(screen.getByTestId('career-build-pathway-button')).toBeDisabled();
      expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveWorkflow();
        await Promise.resolve();
      });
    });
  });

  describe('No courses returned', () => {
    it('opens the no-courses modal, ends the pending state, and does not navigate or persist a pathway when generatePathway resolves with an empty course list', async () => {
      const user = userEvent.setup();
      jest.mocked(generatePathwayWorkflow).mockResolvedValueOnce({ courses: [] });
      const onNext = jest.fn();
      renderContainer({ onNext });

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => {
        expect(screen.getByText('We could not build a pathway for this career match')).toBeInTheDocument();
      });
      expect(onNext).not.toHaveBeenCalled();
      expect(screen.getByTestId('career-build-pathway-button')).not.toBeDisabled();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();
    });

    it('preserves the existing pathway and fingerprint when a rebuild resolves with an empty course list', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      const priorCourses = usePathwaysStore.getState().pathwayCourses;
      const priorFingerprint = usePathwaysStore.getState().pathwayInputFingerprint;
      jest.mocked(generatePathwayWorkflow).mockResolvedValueOnce({ courses: [] });
      renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByTestId('career-rebuild-pathway-button'));

      await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));

      await waitFor(() => {
        expect(screen.getByText('We could not build a pathway for this career match')).toBeInTheDocument();
      });
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(priorCourses);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toEqual(priorFingerprint);
    });

    it('Back closes the no-courses modal without modifying stored pathway state', async () => {
      const user = userEvent.setup();
      jest.mocked(generatePathwayWorkflow).mockResolvedValueOnce({ courses: [] });
      renderContainer();
      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => screen.getByText('We could not build a pathway for this career match'));

      await user.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.queryByText('We could not build a pathway for this career match')).not.toBeInTheDocument();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();
    });

    it('closes the no-courses modal and opens Goal Summary editing when Choose a different match is clicked', async () => {
      const user = userEvent.setup();
      jest.mocked(generatePathwayWorkflow).mockResolvedValueOnce({ courses: [] });
      renderContainer();
      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => screen.getByText('We could not build a pathway for this career match'));

      await user.click(screen.getByRole('button', { name: 'Choose a different match' }));

      expect(screen.queryByText('We could not build a pathway for this career match')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Career Goal')).toBeInTheDocument();
    });

    it('a later successful retry still commits and navigates', async () => {
      const user = userEvent.setup();
      jest.mocked(generatePathwayWorkflow).mockResolvedValueOnce({ courses: [] });
      const onNext = jest.fn();
      renderContainer({ onNext });
      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => screen.getByText('We could not build a pathway for this career match'));
      await user.click(screen.getByRole('button', { name: 'Back' }));

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(PATHWAY_COURSES_STUB);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).not.toBeNull();
    });
  });

  describe('State B — existing pathway, no relevant edits', () => {
    it('renders only the (unchanged-label) build action', () => {
      seedExistingUnchangedPathway();
      renderContainer();

      expect(screen.getByTestId('career-build-pathway-button')).toHaveTextContent('Build my learning pathway');
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('career-rebuild-pathway-button')).not.toBeInTheDocument();
    });

    it('navigates without rebuilding when the build action is clicked', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      seedExistingUnchangedPathway();
      renderContainer({ onNext });

      await user.click(screen.getByTestId('career-build-pathway-button'));

      expect(onNext).toHaveBeenCalledTimes(1);
      expect(generatePathwayWorkflow).not.toHaveBeenCalled();
    });

    it('does not open the rebuild modal when the build action is clicked', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByTestId('career-build-pathway-button'));

      expect(screen.queryByText('Rebuild your Pathway?')).not.toBeInTheDocument();
    });
  });

  describe('State C — existing pathway, relevant edits made', () => {
    it('shows View current pathway + Rebuild after a successful Goal Summary edit', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await submitGoalSummaryEdit(user, 'Director of Analytics');

      await waitFor(() => {
        expect(screen.getByTestId('career-view-current-pathway-button')).toBeInTheDocument();
      });
      expect(screen.getByTestId('career-rebuild-pathway-button')).toHaveTextContent('Rebuild my learning pathway');
      expect(screen.queryByTestId('career-build-pathway-button')).not.toBeInTheDocument();
    });

    it('shows View current pathway + Rebuild after selecting a different career', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByTestId(`career-match-${OTHER_CAREER_ID}`));

      expect(screen.getByTestId('career-view-current-pathway-button')).toBeInTheDocument();
      expect(screen.getByTestId('career-rebuild-pathway-button')).toBeInTheDocument();
    });

    it('View current pathway navigates without rebuilding', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      seedExistingUnchangedPathway();
      renderContainer({ onNext });
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-view-current-pathway-button'));

      await user.click(screen.getByTestId('career-view-current-pathway-button'));

      expect(onNext).toHaveBeenCalledTimes(1);
      expect(generatePathwayWorkflow).not.toHaveBeenCalled();
    });

    it('Rebuild opens the confirmation modal without rebuilding immediately', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));

      await user.click(screen.getByTestId('career-rebuild-pathway-button'));

      expect(screen.getByText('Rebuild your Pathway?')).toBeInTheDocument();
      expect(generatePathwayWorkflow).not.toHaveBeenCalled();
    });

    it('confirming the rebuild modal rebuilds once, commits a fresh fingerprint, and navigates', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      seedExistingUnchangedPathway();
      renderContainer({ onNext });
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByTestId('career-rebuild-pathway-button'));

      await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));

      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);
      expect(usePathwaysStore.getState().learnerIntent.careerGoal).toBe('Director of Analytics');
      // The stale seeded course ('course-1') is fully replaced, not merged with the new set.
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(PATHWAY_COURSES_STUB);
      expect(usePathwaysStore.getState().pathwayCourses.find((c) => c.courseKey === 'course-1')).toBeUndefined();
    });

    it('a failed rebuild preserves the prior courses and fingerprint', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      const priorCourses = usePathwaysStore.getState().pathwayCourses;
      const priorFingerprint = usePathwaysStore.getState().pathwayInputFingerprint;
      jest.mocked(generatePathwayWorkflow).mockRejectedValueOnce(new Error('boom'));
      renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByTestId('career-rebuild-pathway-button'));

      await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));

      await waitFor(() => {
        expect(screen.getByTestId('career-rebuild-pathway-button')).not.toBeDisabled();
      });
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(priorCourses);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toEqual(priorFingerprint);
    });

    it('View current pathway does not modify the pathway fingerprint', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      const priorFingerprint = usePathwaysStore.getState().pathwayInputFingerprint;
      renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-view-current-pathway-button'));

      await user.click(screen.getByTestId('career-view-current-pathway-button'));

      expect(usePathwaysStore.getState().pathwayInputFingerprint).toEqual(priorFingerprint);
    });

    it('canceling the rebuild modal does not rebuild', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByTestId('career-rebuild-pathway-button'));

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(generatePathwayWorkflow).not.toHaveBeenCalled();
      expect(screen.queryByText('Rebuild your Pathway?')).not.toBeInTheDocument();
    });
  });

  describe('non-edits do not mark the pathway dirty', () => {
    it('opening and canceling Goal Summary edit mode', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByTestId('goal-summary-edit-button'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
    });

    it('a failed Goal Summary submission', async () => {
      const user = userEvent.setup();
      jest.mocked(generateProfileWorkflow).mockRejectedValueOnce(new Error('network down'));
      seedExistingUnchangedPathway();
      renderContainer();

      await submitGoalSummaryEdit(user, 'Director of Analytics');

      await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument());
      expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
    });

    it('selecting the already-selected career', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByTestId(`career-match-${SELECTED_CAREER_ID}`));

      expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
    });
  });

  describe('skills persist in the store, not component state', () => {
    it('dismissing a skill updates the persisted selectedSkills', async () => {
      const user = userEvent.setup();
      renderContainer();

      await user.click(screen.getByLabelText('Dismiss SQL'));

      expect(usePathwaysStore.getState().selectedSkills).not.toContain('SQL');
      expect(screen.queryByText('SQL')).not.toBeInTheDocument();
    });

    it('dismissed skills survive unmounting and remounting the container', async () => {
      const user = userEvent.setup();
      const { unmount } = renderContainer();

      await user.click(screen.getByLabelText('Dismiss SQL'));
      unmount();

      renderContainer();

      expect(screen.queryByText('SQL')).not.toBeInTheDocument();
    });

    it('restoring skills brings back the full recommended list', async () => {
      const user = userEvent.setup();
      renderContainer();

      await user.click(screen.getByLabelText('Dismiss SQL'));
      await user.click(screen.getByRole('button', { name: 'Restore skills' }));

      expect(screen.getByText('SQL')).toBeInTheDocument();
    });

    it('selecting a different career resets the selected-skills list, but reselecting the same one does not', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByLabelText('Dismiss SQL'));
      await user.click(screen.getByTestId(`career-match-${SELECTED_CAREER_ID}`));
      expect(usePathwaysStore.getState().selectedSkills).not.toContain('SQL');

      await user.click(screen.getByTestId(`career-match-${OTHER_CAREER_ID}`));
      expect(usePathwaysStore.getState().selectedSkills).toEqual(skillsForCareer(OTHER_CAREER_ID));
    });

    it('a skill change alone marks an otherwise-unchanged pathway as edited', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByLabelText('Dismiss SQL'));

      expect(screen.getByTestId('career-view-current-pathway-button')).toBeInTheDocument();
      expect(screen.getByTestId('career-rebuild-pathway-button')).toBeInTheDocument();
    });
  });

  describe('lifecycle', () => {
    it('dirty state survives unmounting and remounting the container', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      const { unmount } = renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));

      unmount();
      renderContainer();

      expect(screen.getByTestId('career-view-current-pathway-button')).toBeInTheDocument();
      expect(screen.getByTestId('career-rebuild-pathway-button')).toBeInTheDocument();
    });

    it('a successful rebuild resets the pathway back to the unchanged state', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));

      await waitFor(() => {
        expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('career-rebuild-pathway-button')).not.toBeInTheDocument();
    });

    it('treats an existing pathway with no recorded fingerprint as edited (conservative default)', () => {
      // Simulates a pathway carried over from a pre-refactor localStorage blob, where
      // no migration reconstructs a fingerprint (see state/persistence.ts) — rather
      // than silently assuming "unchanged," the pathway is treated as stale until the
      // learner rebuilds once.
      act(() => {
        usePathwaysStore.setState({
          learnerIntent: { ...baseLearnerIntent },
          learnerProfile: { ...CAREER_SELECTION_STUB_PROFILE },
          careerMatches: CAREER_SELECTION_STUB_MATCHES,
          selectedCareerId: SELECTED_CAREER_ID,
          selectedSkills: skillsForCareer(SELECTED_CAREER_ID),
          pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
          pathwayInputFingerprint: null,
        });
      });
      renderContainer();

      expect(screen.getByTestId('career-view-current-pathway-button')).toBeInTheDocument();
      expect(screen.getByTestId('career-rebuild-pathway-button')).toBeInTheDocument();
      expect(screen.queryByTestId('career-build-pathway-button')).not.toBeInTheDocument();
    });
  });

  describe('Retake quiz', () => {
    it('opens the warning modal', async () => {
      const user = userEvent.setup();
      renderContainer();

      await user.click(screen.getByTestId('career-retake-quiz-button'));

      expect(screen.getByText('Retake your onboarding quiz?')).toBeInTheDocument();
    });

    it('cancel closes the modal without navigating', async () => {
      const user = userEvent.setup();
      const onRetakeQuiz = jest.fn();
      renderContainer({ onRetakeQuiz });

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onRetakeQuiz).not.toHaveBeenCalled();
      expect(screen.queryByText('Retake your onboarding quiz?')).not.toBeInTheDocument();
    });

    it('confirm invokes onRetakeQuiz', async () => {
      const user = userEvent.setup();
      const onRetakeQuiz = jest.fn();
      renderContainer({ onRetakeQuiz });

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

      expect(onRetakeQuiz).toHaveBeenCalledTimes(1);
    });

    it('resets the entire store to its initial zero state when confirming retake', async () => {
      const user = userEvent.setup();
      const onRetakeQuiz = jest.fn();
      seedExistingUnchangedPathway();
      renderContainer({ onRetakeQuiz });

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

      expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();
      expect(usePathwaysStore.getState().learnerIntent).toEqual(EMPTY_LEARNER_INTENT);
      expect(usePathwaysStore.getState().selectedCareerId).toBeNull();
      expect(usePathwaysStore.getState().selectedSkills).toBeNull();
      expect(usePathwaysStore.getState().learnerProfile).toBeNull();
      expect(usePathwaysStore.getState().careerMatches).toEqual([]);
    });

    it('clears a prior Courses-tab banner dismissal when confirming retake', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      recordDismissal('pathway_in_progress');
      renderContainer();

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

      expect(getDismissedRank()).toBeNull();
    });

    it('does not clear a prior Courses-tab banner dismissal when cancelling retake', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      recordDismissal('pathway_in_progress');
      renderContainer();

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(getDismissedRank()).not.toBeNull();
    });

    it('does not clear the existing saved pathway, intake draft, or career/skill selection when cancelling retake', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(usePathwaysStore.getState().pathwayCourses).not.toEqual([]);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).not.toBeNull();
      expect(usePathwaysStore.getState().learnerIntent).toEqual(baseLearnerIntent);
      expect(usePathwaysStore.getState().selectedCareerId).toBe(SELECTED_CAREER_ID);
      expect(usePathwaysStore.getState().selectedSkills).not.toBeNull();
    });

    it('returns focus to the trigger after the modal closes', async () => {
      const user = userEvent.setup();
      renderContainer();

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByTestId('career-retake-quiz-button')).toHaveFocus();
    });
  });

  describe('Give feedback link', () => {
    it('renders as the leftmost secondary action, as a link pointing directly at the form', () => {
      renderContainer();

      const feedbackLink = screen.getByTestId('pathway-feedback-button');
      expect(feedbackLink.tagName).toBe('A');
      expect(feedbackLink).toHaveAttribute('href', FEEDBACK_FORM_URL);
      expect(feedbackLink).toHaveAttribute('target', '_blank');
    });

    it('does not call onRetakeQuiz or any other page callback when clicked', async () => {
      const user = userEvent.setup();
      const onRetakeQuiz = jest.fn();
      const onNext = jest.fn();
      renderContainer({ onRetakeQuiz, onNext });

      await user.click(screen.getByTestId('pathway-feedback-button'));

      expect(onRetakeQuiz).not.toHaveBeenCalled();
      expect(onNext).not.toHaveBeenCalled();
    });

    it('is entirely absent when PATHWAYS_FEEDBACK_FORM_URL is not configured', () => {
      mergeConfig({ PATHWAYS_FEEDBACK_FORM_URL: null });
      renderContainer();

      expect(screen.queryByTestId('pathway-feedback-button')).not.toBeInTheDocument();
    });
  });
});
