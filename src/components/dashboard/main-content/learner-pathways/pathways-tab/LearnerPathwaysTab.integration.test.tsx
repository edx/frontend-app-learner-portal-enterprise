import '@testing-library/jest-dom/extend-expect';
import {
  act, fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { mergeConfig } from '@edx/frontend-platform';
import { MemoryRouter } from 'react-router-dom';

import LearnerPathwaysTab from './LearnerPathwaysTab';
import intakeMessages from './intake/messages';
import { usePathwaysStore, getInitialPathwaysState } from './state';
import { PATHWAYS_STORAGE_KEY, PATHWAYS_STORAGE_VERSION } from './state/persistence';
import { fetchLearningIntent, fetchRecommendationFeedback } from '../../../../app/data/services/xpert';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../app/data/services/data/__factories__';
import { careerRetrievalService, courseRetrievalService } from './services';
import { PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY } from './pathway-courses/constants';
import { queryClient } from '../../../../../utils/tests';

// PathwayCoursesContainer's one-time feedback prompt scopes its localStorage marker
// by username — every path that reaches the Pathway page with real courses now calls
// getAuthenticatedUser(), so this suite mocks it globally rather than per-describe.
jest.mock('@edx/frontend-platform/auth');
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;

// generateProfileWorkflow and generatePathwayWorkflow now really call
// fetchLearningIntent + careerRetrievalService and courseRetrievalService +
// fetchRecommendationFeedback respectively (see their own workflow files) instead of
// returning static stubs, so both the Goal-Summary-submitted path and the build-pathway
// path below need these mocked to resolve deterministically in this jsdom integration
// test, the same way generateProfileWorkflow.test.ts / generatePathwayWorkflow.test.ts
// mock them.
jest.mock('../../../../app/data/services/xpert', () => ({
  fetchLearningIntent: jest.fn().mockResolvedValue({
    condensedAlgoliaQuery: 'data analysis',
    skillsRequired: ['SQL'],
    skillsPreferred: ['Excel'],
  }),
  fetchRecommendationFeedback: jest.fn().mockResolvedValue({ reasons: {} }),
}));
jest.mock('./services', () => ({
  careerRetrievalService: {
    searchCareers: jest.fn().mockResolvedValue([
      { id: 'career-1', title: 'Data Analyst', skillsToDevelop: ['SQL'] },
    ]),
  },
  getCareerAlgoliaIndex: jest.fn(),
  courseRetrievalService: {
    searchCourses: jest.fn().mockResolvedValue([
      { courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' },
    ]),
  },
  getCourseAlgoliaIndex: jest.fn(),
}));
jest.mock('../../../../app/data/hooks', () => ({
  useSearchCatalogs: jest.fn(() => ['cat-1']),
  useAlgoliaSearch: jest.fn(() => ({ catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' } })),
}));
jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseCourseEnrollments: jest.fn(),
}));

/**
 * Extensive integration coverage for the edge cases fixed this session, exercised at
 * the full LearnerPathwaysTab level (Intake, CareerSelectionContainer,
 * PathwayCoursesContainer, and the store all wired together) rather than in isolation:
 *   - Retake Quiz confirm resets the ENTIRE store to zero state, regardless of whether
 *     the pathway/profile came from the pre-Goal-Summary stub display (State A) or a
 *     real Goal Summary submission; Cancel preserves everything either way.
 *   - Hydration (a real page refresh) correctly restores/normalizes a State-A-built
 *     pathway instead of demoting it or wiping its career/skill selection.
 *
 * `generatePathwayWorkflow` and `generateProfileWorkflow` are both real now (mocked
 * above at their respective dependency seams), so "State A" and "Goal-Summary-submitted"
 * exercise genuinely different code paths for the profile stage; what differs at the
 * store level is which action populates it (`commitStubProfile` vs
 * `commitProfileSuccess`, which also re-seeds selectedSkills differently) — exercising
 * both proves the Retake Quiz reset isn't accidentally coupled to one specific commit
 * path.
 */

const renderComponent = () => render(
  <QueryClientProvider client={queryClient()}>
    <MemoryRouter>
      <IntlProvider locale="en">
        <LearnerPathwaysTab />
      </IntlProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);

const fillIntake = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
  await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
  await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
  await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
  await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
};

// State A: builds straight from the pre-Goal-Summary stub display, without ever
// completing a real Intake submission — learnerProfile/careerMatches only become real
// via CareerSelectionContainer's commitStubProfile, triggered inside buildPathway.
// Seeds `section: 'profile'` directly rather than driving Intake's UI, since Intake
// submission now always calls the real (mocked) generateProfileWorkflow and would
// otherwise land on Profile with a real, non-null learnerProfile — no longer State A.
const buildViaStateA = async (user: ReturnType<typeof userEvent.setup>) => {
  act(() => {
    usePathwaysStore.setState({ section: 'profile' });
  });
  await user.click(screen.getByTestId('career-build-pathway-button'));
  await waitFor(() => expect(usePathwaysStore.getState().pathwayCourses).not.toEqual([]));
};

// Goal-Summary-submitted: exercises commitProfileSuccess (which also re-seeds
// selectedSkills for the resulting matches) before building, instead of
// commitStubProfile.
const buildViaGoalSummary = async (user: ReturnType<typeof userEvent.setup>) => {
  await fillIntake(user);
  await user.click(screen.getByTestId('goal-summary-edit-button'));
  await user.clear(screen.getByLabelText('Career Goal'));
  await user.type(screen.getByLabelText('Career Goal'), 'Director of Analytics');
  await user.click(screen.getByTestId('goal-summary-submit-button'));
  await waitFor(() => expect(usePathwaysStore.getState().learnerProfile).not.toBeNull());
  await user.click(screen.getByTestId('career-build-pathway-button'));
  await waitFor(() => expect(usePathwaysStore.getState().pathwayCourses).not.toEqual([]));
};

const navigateBackAndOpenRetake = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByTestId('pathway-rebuild-button'));
  await user.click(screen.getByTestId('career-retake-quiz-button'));
};

// Reaches Career Selection with a real, non-null learnerProfile/careerMatches via a
// genuine Intake submission (generateProfileWorkflow is real, mocked only at its
// fetchLearningIntent/careerRetrievalService dependency seams).
const reachCareerSelectionViaIntake = async (user: ReturnType<typeof userEvent.setup>) => {
  await fillIntake(user);
  await waitFor(() => expect(usePathwaysStore.getState().learnerProfile).not.toBeNull());
};

// Navigates from the Pathway page back to Career Selection, edits the career goal via
// Goal Summary, and submits — the same relevant-input-change shape already proven (at
// the container level) to mark an existing pathway as edited/dirty.
const editCareerGoalFromPathwayPage = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByTestId('pathway-rebuild-button'));
  await waitFor(() => expect(screen.getByTestId('profile-container')).toBeInTheDocument());
  await user.click(screen.getByTestId('goal-summary-edit-button'));
  await user.clear(screen.getByLabelText('Career Goal'));
  await user.type(screen.getByLabelText('Career Goal'), 'Director of Analytics');
  await user.click(screen.getByTestId('goal-summary-submit-button'));
  await waitFor(() => expect(screen.getByTestId('career-rebuild-pathway-button')).toBeInTheDocument());
};

describe('LearnerPathwaysTab integration — edge cases from this session', () => {
  beforeEach(() => {
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({
      data: enterpriseCustomerFactory({ slug: 'test-enterprise' }),
    });
    (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
      data: { enterpriseCourseEnrollments: [], allEnrollmentsByStatus: {} },
    });
    mockGetAuthenticatedUser.mockReturnValue({ username: 'test-learner' });
  });

  describe('Retake Quiz confirm/cancel', () => {
    beforeEach(() => {
      usePathwaysStore.getState().resetPathwaysState();
    });

    describe.each([
      ['State A pathway', buildViaStateA],
      ['Goal-Summary-submitted pathway', buildViaGoalSummary],
    ])('%s', (_originName, buildPathwayFn) => {
      it('confirming retake resets the entire store to its initial zero state', async () => {
        const user = userEvent.setup();
        renderComponent();

        await buildPathwayFn(user);
        await navigateBackAndOpenRetake(user);
        await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

        expect(usePathwaysStore.getState()).toMatchObject(getInitialPathwaysState());
        expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
      });

      it('cancelling retake preserves the built pathway, profile, and selection', async () => {
        const user = userEvent.setup();
        renderComponent();

        await buildPathwayFn(user);
        await navigateBackAndOpenRetake(user);
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(usePathwaysStore.getState().pathwayCourses).not.toEqual([]);
        expect(usePathwaysStore.getState().pathwayInputFingerprint).not.toBeNull();
        expect(usePathwaysStore.getState().learnerProfile).not.toBeNull();
        expect(usePathwaysStore.getState().careerMatches.length).toBeGreaterThan(0);
        expect(usePathwaysStore.getState().selectedCareerId).not.toBeNull();
        expect(usePathwaysStore.getState().selectedSkills).not.toBeNull();
      });
    });
  });

  /**
   * A real page refresh re-runs the store's merge/normalizePathwaysState logic against
   * whatever's in localStorage at that moment. Rather than jest.resetModules() (which
   * would force LearnerPathwaysTab to pull in a second, inconsistent copy of React),
   * each row seeds localStorage and then calls the store's own `persist.rehydrate()` —
   * the same merge logic, re-run on demand against the existing store instance — before
   * rendering the statically-imported LearnerPathwaysTab.
   */
  describe('hydration integration (real localStorage + rehydration)', () => {
    beforeEach(() => {
      localStorage.clear();
      usePathwaysStore.getState().resetPathwaysState();
    });

    it.each([
      {
        name: 'State A pathway, section "pathway" — renders the courses page with courses/skills intact',
        blob: {
          section: 'pathway',
          careerMatches: [],
          learnerProfile: null,
          selectedCareerId: 'reporting-data-analysis-manager',
          selectedSkills: ['SQL'],
          pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
        },
        expectTestId: 'pathway-container',
        expectStore: {
          section: 'pathway', selectedCareerId: 'reporting-data-analysis-manager', selectedSkills: ['SQL'],
        },
      },
      {
        name: 'State A pathway, section "profile" — renders the profile page (not onboarding) with selection intact',
        blob: {
          section: 'profile',
          careerMatches: [],
          learnerProfile: null,
          selectedCareerId: 'reporting-data-analysis-manager',
          selectedSkills: ['SQL'],
          pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
        },
        expectTestId: 'profile-container',
        expectStore: { section: 'profile', selectedCareerId: 'reporting-data-analysis-manager' },
      },
      {
        name: 'intake completed, reached profile, nothing selected/generated/built yet — renders the profile page (not onboarding)',
        blob: {
          section: 'profile',
          learnerIntent: {
            careerGoal: 'Senior Data Analyst',
            targetIndustry: 'EdTech',
            background: 'Data analyst with 5 years experience',
            motivation: 'Upskill for promotion',
          },
          careerMatches: [],
          learnerProfile: null,
          selectedCareerId: null,
          pathwayCourses: [],
        },
        expectTestId: 'profile-container',
        expectStore: { section: 'profile', learnerProfile: null },
      },
      {
        name: 'nothing persisted — renders onboarding',
        blob: null,
        expectTestId: 'intake-questions-container',
        expectStore: { section: 'onboarding', learnerProfile: null },
      },
      {
        name: 'real careerMatches with a stale selectedCareerId — falls back to the first match',
        blob: {
          section: 'profile',
          careerMatches: [{ id: 'career-1', title: 'Data Analyst', skillsToDevelop: ['SQL'] }],
          learnerProfile: {
            summary: 's', learningStyle: 'l', weeklyTimeCommitment: 't', certificatePreference: 'c', skills: ['SQL'],
          },
          selectedCareerId: 'stale-id',
          pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
        },
        expectTestId: 'profile-container',
        expectStore: { selectedCareerId: 'career-1' },
      },
    ])('$name', async ({ blob, expectTestId, expectStore }) => {
      if (blob) {
        localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify({ state: blob, version: PATHWAYS_STORAGE_VERSION }));
      }

      // Re-runs the same merge/normalizePathwaysState logic a real page load would run
      // against whatever's currently in localStorage, on the existing store instance —
      // no module reset needed, so the statically-imported LearnerPathwaysTab (and
      // React itself) stay a single, consistent instance.
      await usePathwaysStore.persist.rehydrate();

      renderComponent();

      expect(screen.getByTestId(expectTestId)).toBeInTheDocument();
      expect(usePathwaysStore.getState()).toMatchObject(expectStore);
    });
  });

  describe('Give feedback', () => {
    const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/mock-form/viewform';
    const seenKey = () => PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY('test-learner');

    beforeEach(() => {
      usePathwaysStore.getState().resetPathwaysState();
      localStorage.clear();
      mergeConfig({ PATHWAYS_FEEDBACK_FORM_URL: FEEDBACK_FORM_URL });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows the Give feedback link, pointing directly at the form, on the Intake and Profile pages before any pathway is built', async () => {
      renderComponent();
      const introLink = screen.getByTestId('pathway-feedback-button');
      expect(introLink).toHaveAttribute('href', FEEDBACK_FORM_URL);

      act(() => { usePathwaysStore.setState({ section: 'profile' }); });
      const profileLink = screen.getByTestId('pathway-feedback-button');
      expect(profileLink).toHaveAttribute('href', FEEDBACK_FORM_URL);
    });

    it('auto-opens the blocking modal once at 15s, only marks the prompt seen on Maybe later, and never reopens automatically afterwards', async () => {
      // Enabled before the Pathway page ever mounts, so the container's 15s timer is
      // scheduled as a fake timer from the start — a real setTimeout scheduled before
      // switching to fake timers would keep running on the real wall clock and never
      // be advanced by jest.advanceTimersByTime below.
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      await buildViaStateA(user);
      const coursesBeforeFeedback = usePathwaysStore.getState().pathwayCourses;

      expect(screen.getByTestId('pathway-rebuild-button')).toBeInTheDocument();
      expect(screen.getByTestId('pathway-feedback-button')).toBeInTheDocument();
      expect(screen.queryByText('Help us improve learning pathways!')).not.toBeInTheDocument();

      act(() => { jest.advanceTimersByTime(30000); });
      expect(screen.getByText('Help us improve learning pathways!')).toBeInTheDocument();
      // Firing/opening alone must not mark it seen.
      expect(localStorage.getItem(seenKey())).toBeNull();

      // Blocking: Escape must not dismiss it.
      await user.keyboard('{Escape}');
      expect(screen.getByText('Help us improve learning pathways!')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Maybe later' }));
      expect(screen.queryByText('Help us improve learning pathways!')).not.toBeInTheDocument();
      expect(localStorage.getItem(seenKey())).toBe('true');
      // Dismissing the automatic prompt must not touch pathway content/state.
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(coursesBeforeFeedback);

      // Dismissing the auto-opened modal must not schedule another automatic open.
      act(() => { jest.advanceTimersByTime(60000); });
      expect(screen.queryByText('Help us improve learning pathways!')).not.toBeInTheDocument();

      // The footer link remains present and still points directly at the form.
      expect(screen.getByTestId('pathway-feedback-button')).toHaveAttribute('href', FEEDBACK_FORM_URL);
    });

    it('never starts the feedback timer/modal when the Pathway page is reached without canonical generated courses', () => {
      jest.useFakeTimers();
      renderComponent();
      act(() => { usePathwaysStore.setState({ section: 'pathway' }); });
      expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

      act(() => { jest.advanceTimersByTime(20000); });

      expect(screen.queryByText('Help us improve learning pathways!')).not.toBeInTheDocument();
    });
  });

  /**
   * Feature-level coverage for the full Intake -> Profile -> Career Selection -> Pathway
   * flow's build/rebuild pathway-generation step: Catalog Retrieval -> Recommendation
   * Feedback orchestration, success/empty/failure handling, retry, duplicate-submission
   * guarding, and persistence — exercised through real components/controller/workflows/
   * store, with only the external service-call boundaries mocked (per the file-level
   * jest.mock calls above). Per-test mockResolvedValueOnce/mockRejectedValueOnce
   * overrides are reset back to their known-good defaults in beforeEach via
   * mockReset().mockResolvedValue(...) so no override ever leaks into a later test.
   */
  describe('Build/Rebuild pathway generation — full flow', () => {
    beforeEach(() => {
      usePathwaysStore.getState().resetPathwaysState();
      jest.mocked(fetchLearningIntent).mockReset().mockResolvedValue({
        condensedAlgoliaQuery: 'data analysis', skillsRequired: ['SQL'], skillsPreferred: ['Excel'],
      });
      jest.mocked(fetchRecommendationFeedback).mockReset().mockResolvedValue({ reasons: {} });
      jest.mocked(careerRetrievalService.searchCareers).mockReset().mockResolvedValue([
        { id: 'career-1', title: 'Data Analyst', skillsToDevelop: ['SQL'] },
      ]);
      jest.mocked(courseRetrievalService.searchCourses).mockReset().mockResolvedValue([
        { courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' },
      ]);
    });

    it('completes a first-time Intake -> Profile -> Career Selection -> Pathway build with real call-argument, feedback-join, and persistence assertions', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      jest.mocked(fetchRecommendationFeedback).mockResolvedValueOnce({
        reasons: { 'course-1': 'This course builds your SQL skills for Data Analyst roles.' },
      });

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());

      const [, searchOptions] = jest.mocked(courseRetrievalService.searchCourses).mock.calls[0];
      expect(searchOptions.selectedCareer.title).toBe('Data Analyst');
      expect(searchOptions.catalogScope).toEqual({
        searchCatalogs: ['cat-1'],
        catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' },
      });

      expect(fetchRecommendationFeedback).toHaveBeenCalledWith(expect.objectContaining({
        selectedCareer: 'Data Analyst',
        courseKeys: ['course-1'],
      }));
      const retrievalOrder = jest.mocked(courseRetrievalService.searchCourses).mock.invocationCallOrder[0];
      const feedbackOrder = jest.mocked(fetchRecommendationFeedback).mock.invocationCallOrder[0];
      expect(retrievalOrder).toBeLessThan(feedbackOrder);

      expect(screen.getByText('This course builds your SQL skills for Data Analyst roles.')).toBeInTheDocument();

      const persisted = JSON.parse(localStorage.getItem(PATHWAYS_STORAGE_KEY) ?? '{}');
      expect(persisted.state.pathwayCourses).toEqual([{
        courseKey: 'course-1',
        title: 'Intro to SQL',
        status: 'not_started',
        whyThisFitsYou: 'This course builds your SQL skills for Data Analyst roles.',
      }]);
      expect(persisted.state.pathwayInputFingerprint).not.toBeNull();
    });

    it('rebuilds an existing pathway after a relevant edit, replacing courses and committing a fresh fingerprint', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      const priorFingerprint = usePathwaysStore.getState().pathwayInputFingerprint;

      await editCareerGoalFromPathwayPage(user);
      jest.mocked(courseRetrievalService.searchCourses).mockResolvedValueOnce([
        { courseKey: 'course-2', title: 'Advanced SQL', status: 'not_started' },
      ]);

      await user.click(screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      expect(usePathwaysStore.getState().pathwayCourses).toEqual([
        { courseKey: 'course-2', title: 'Advanced SQL', status: 'not_started' },
      ]);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).not.toBe(priorFingerprint);
    });

    it('retries successfully after an initial rejection without repeating Intake', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      jest.mocked(courseRetrievalService.searchCourses).mockRejectedValueOnce(new Error('boom'));

      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => {
        expect(screen.getByTestId('career-build-pathway-button')).not.toBeDisabled();
      });
      expect(screen.getByTestId('profile-container')).toBeInTheDocument();
      expect(screen.queryByTestId('intake-questions-container')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
    });

    it('retries successfully after an initial empty result without repeating Intake', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      jest.mocked(courseRetrievalService.searchCourses).mockResolvedValueOnce([]);

      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => {
        expect(screen.getByText('We could not build a pathway for this career match')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: 'Back' }));

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
    });

    it('surfaces a Catalog Retrieval failure without calling Recommendation Feedback, stays on Career Selection with a visible error, and allows a later retry', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      jest.mocked(courseRetrievalService.searchCourses).mockRejectedValueOnce(new Error('Algolia unavailable'));

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => {
        expect(screen.getByText('Algolia unavailable')).toBeInTheDocument();
      });
      expect(fetchRecommendationFeedback).not.toHaveBeenCalled();
      expect(screen.getByTestId('profile-container')).toBeInTheDocument();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
    });

    it('surfaces a Recommendation Feedback failure without a partial commit or navigation, preserving selections for a later retry', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      jest.mocked(fetchRecommendationFeedback).mockRejectedValueOnce(new Error('Feedback unavailable'));

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => {
        expect(screen.getByText('Feedback unavailable')).toBeInTheDocument();
      });
      expect(screen.getByTestId('profile-container')).toBeInTheDocument();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();
      expect(usePathwaysStore.getState().selectedCareerId).not.toBeNull();

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
    });

    it('shows the no-courses UI without calling Recommendation Feedback, and preserves the prior pathway when a rebuild resolves empty', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      const priorCourses = usePathwaysStore.getState().pathwayCourses;
      const priorFingerprint = usePathwaysStore.getState().pathwayInputFingerprint;

      await editCareerGoalFromPathwayPage(user);
      jest.mocked(courseRetrievalService.searchCourses).mockResolvedValueOnce([]);
      jest.mocked(fetchRecommendationFeedback).mockClear();

      await user.click(screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));

      await waitFor(() => {
        expect(screen.getByText('We could not build a pathway for this career match')).toBeInTheDocument();
      });
      expect(fetchRecommendationFeedback).not.toHaveBeenCalled();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(priorCourses);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toEqual(priorFingerprint);
    });

    it('the disabled button prevents a second awaited click from issuing a duplicate retrieval/feedback call pair', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      let resolveSearch: (value: unknown) => void = () => {};
      jest.mocked(courseRetrievalService.searchCourses).mockImplementationOnce(() => new Promise((resolve) => {
        resolveSearch = resolve;
      }));

      const button = screen.getByTestId('career-build-pathway-button');
      await user.click(button);
      await user.click(button);

      expect(courseRetrievalService.searchCourses).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSearch([{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }]);
        await Promise.resolve();
      });

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      expect(fetchRecommendationFeedback).toHaveBeenCalledTimes(1);
    });

    it('a true synchronous double-click (no render between clicks) still issues only one retrieval call', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      let resolveSearch: (value: unknown) => void = () => {};
      jest.mocked(courseRetrievalService.searchCourses).mockImplementationOnce(() => new Promise((resolve) => {
        resolveSearch = resolve;
      }));

      const button = screen.getByTestId('career-build-pathway-button');
      // fireEvent.click dispatches synchronously with no await/tick between the two
      // calls, so React hasn't re-rendered the disabled button yet — this exercises
      // buildPathway's internal isBuildingRef guard directly, not the DOM disabled
      // attribute a real double-click would also be blocked by.
      act(() => {
        fireEvent.click(button);
        fireEvent.click(button);
      });

      expect(courseRetrievalService.searchCourses).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSearch([{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }]);
        await Promise.resolve();
      });

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      expect(fetchRecommendationFeedback).toHaveBeenCalledTimes(1);
    });

    it('stays on Intake with entered values preserved when profile generation fails, with no downstream career/course/feedback calls', async () => {
      const user = userEvent.setup();
      jest.mocked(fetchLearningIntent).mockRejectedValueOnce(new Error('Learning Intent unavailable'));
      renderComponent();

      await fillIntake(user);

      await waitFor(() => expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument());
      expect(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage)).toHaveValue('Goal');
      expect(careerRetrievalService.searchCareers).not.toHaveBeenCalled();
      expect(courseRetrievalService.searchCourses).not.toHaveBeenCalled();
      expect(fetchRecommendationFeedback).not.toHaveBeenCalled();
    });

    it('preserves the prior pathway and fingerprint when a rebuild fails, leaving View Current Pathway usable', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      const priorCourses = usePathwaysStore.getState().pathwayCourses;
      const priorFingerprint = usePathwaysStore.getState().pathwayInputFingerprint;

      await editCareerGoalFromPathwayPage(user);
      jest.mocked(courseRetrievalService.searchCourses).mockRejectedValueOnce(new Error('boom'));

      await user.click(screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));

      await waitFor(() => {
        expect(screen.getByText('boom')).toBeInTheDocument();
      });
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(priorCourses);
      expect(usePathwaysStore.getState().pathwayInputFingerprint).toEqual(priorFingerprint);

      await user.click(screen.getByTestId('career-view-current-pathway-button'));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
    });

    it('disables the build button while the goal summary is being edited, preventing navigation mid-edit', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);

      await user.click(screen.getByTestId('goal-summary-edit-button'));
      expect(screen.getByTestId('career-build-pathway-button')).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByTestId('career-build-pathway-button')).not.toBeDisabled();
    });

    it('disables the rebuild button while the goal summary is being edited, preventing navigation mid-edit', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      await editCareerGoalFromPathwayPage(user);

      await user.click(screen.getByTestId('goal-summary-edit-button'));
      expect(screen.getByTestId('career-rebuild-pathway-button')).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByTestId('career-rebuild-pathway-button')).not.toBeDisabled();
    });

    it('disables the view-current-pathway button while the goal summary is being edited, preventing navigation mid-edit', async () => {
      const user = userEvent.setup();
      renderComponent();
      await reachCareerSelectionViaIntake(user);
      await user.click(screen.getByTestId('career-build-pathway-button'));
      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      await editCareerGoalFromPathwayPage(user);

      await user.click(screen.getByTestId('goal-summary-edit-button'));
      expect(screen.getByTestId('career-view-current-pathway-button')).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByTestId('career-view-current-pathway-button')).not.toBeDisabled();
    });
  });

  describe('enrollment-derived pathway course states (feature regression)', () => {
    beforeEach(() => {
      usePathwaysStore.getState().resetPathwaysState();
      jest.mocked(courseRetrievalService.searchCourses).mockReset().mockResolvedValue([
        { courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' },
      ]);
    });

    it('renders a generated pathway with enrollment data matched by exact courseKey, agreeing row status/action and summary counts', async () => {
      (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
        data: {
          enterpriseCourseEnrollments: [{
            courseKey: 'course-1',
            courseRunId: 'course-v1:edX+SQL+2024',
            courseRunStatus: 'in_progress',
            isEnrollmentActive: true,
            isRevoked: false,
            created: '2026-01-10T00:00:00Z',
            linkToCourse: 'https://learning.edx.org/course/course-v1:edX+SQL+2024/resume',
            linkToCertificate: null,
          }],
          allEnrollmentsByStatus: {},
        },
      });
      const user = userEvent.setup();
      renderComponent();
      await buildViaStateA(user);

      expect(screen.getByTestId('pathway-container')).toBeInTheDocument();
      const table = screen.getByRole('table');
      expect(within(table).getByText('In progress')).toBeInTheDocument();
      expect(within(table).getByRole('link', { name: /Continue/ }))
        .toHaveAttribute('href', 'https://learning.edx.org/course/course-v1:edX+SQL+2024/resume');
      expect(screen.getByTestId('pathway-progress-in-progress')).toHaveTextContent('1');
    });

    it('is unaffected by enrollments for unrelated courseKeys', async () => {
      (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
        data: {
          enterpriseCourseEnrollments: [{
            courseKey: 'unrelated-course',
            courseRunId: 'course-v1:edX+SQL+2024',
            courseRunStatus: 'in_progress',
            isEnrollmentActive: true,
            isRevoked: false,
            created: '2026-01-10T00:00:00Z',
            linkToCourse: 'https://learning.edx.org/unrelated',
            linkToCertificate: null,
          }],
          allEnrollmentsByStatus: {},
        },
      });
      const user = userEvent.setup();
      renderComponent();
      await buildViaStateA(user);

      const table = screen.getByRole('table');
      expect(within(table).getByText('Not started')).toBeInTheDocument();
      expect(within(table).getByRole('link', { name: /View Course/ })).toBeInTheDocument();
      expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent('1');
    });

    it('leaves persistence/hydration contracts unchanged when enrollment-derived states render', async () => {
      (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
        data: {
          enterpriseCourseEnrollments: [{
            courseKey: 'course-1',
            courseRunId: 'course-v1:edX+SQL+2024',
            courseRunStatus: 'completed',
            isEnrollmentActive: true,
            isRevoked: false,
            created: '2026-01-10T00:00:00Z',
            linkToCourse: 'https://learning.edx.org/course/course-v1:edX+SQL+2024/home',
            linkToCertificate: 'https://courses.edx.org/certificates/abc123',
          }],
          allEnrollmentsByStatus: {},
        },
      });
      const user = userEvent.setup();
      renderComponent();
      await buildViaStateA(user);

      await waitFor(() => expect(screen.getByRole('link', { name: /View Certificate/ })).toBeInTheDocument());

      const persisted = JSON.parse(localStorage.getItem(PATHWAYS_STORAGE_KEY) ?? '{}');
      expect(persisted.state.pathwayCourses).toEqual([
        { courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' },
      ]);
      expect(persisted.state.pathwayInputFingerprint).not.toBeNull();
    });

    it('introduces no workflow/controller calls when rendering or clicking a resolved row navigation link', async () => {
      (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
        data: {
          enterpriseCourseEnrollments: [{
            courseKey: 'course-1',
            courseRunId: 'course-v1:edX+SQL+2024',
            courseRunStatus: 'in_progress',
            isEnrollmentActive: true,
            isRevoked: false,
            created: '2026-01-10T00:00:00Z',
            linkToCourse: 'https://learning.edx.org/course/course-v1:edX+SQL+2024/resume',
            linkToCertificate: null,
          }],
          allEnrollmentsByStatus: {},
        },
      });
      const user = userEvent.setup();
      renderComponent();
      await buildViaStateA(user);

      const coursesRef = usePathwaysStore.getState().pathwayCourses;
      jest.mocked(courseRetrievalService.searchCourses).mockClear();
      jest.mocked(fetchRecommendationFeedback).mockClear();
      jest.mocked(careerRetrievalService.searchCareers).mockClear();

      await user.click(screen.getByRole('link', { name: /Continue/ }));

      expect(courseRetrievalService.searchCourses).not.toHaveBeenCalled();
      expect(fetchRecommendationFeedback).not.toHaveBeenCalled();
      expect(careerRetrievalService.searchCareers).not.toHaveBeenCalled();
      expect(usePathwaysStore.getState().pathwayCourses).toBe(coursesRef);
    });
  });
});
