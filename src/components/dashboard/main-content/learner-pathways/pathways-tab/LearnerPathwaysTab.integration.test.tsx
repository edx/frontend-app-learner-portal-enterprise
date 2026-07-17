import '@testing-library/jest-dom/extend-expect';
import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter } from 'react-router-dom';

import LearnerPathwaysTab from './LearnerPathwaysTab';
import intakeMessages from './intake/messages';
import { usePathwaysStore, getInitialPathwaysState } from './state';
import { PATHWAYS_STORAGE_KEY, PATHWAYS_STORAGE_VERSION } from './state/persistence';

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
  <MemoryRouter>
    <IntlProvider locale="en">
      <LearnerPathwaysTab />
    </IntlProvider>
  </MemoryRouter>,
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

describe('LearnerPathwaysTab integration — edge cases from this session', () => {
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
});
