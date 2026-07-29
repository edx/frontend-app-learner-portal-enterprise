import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';
import { MemoryRouter } from 'react-router-dom';

import LearnerPathwaysTab from './LearnerPathwaysTab';
import intakeMessages from './intake/messages';
import { usePathwaysStore, computePathwayInputFingerprint } from './state';
import type { PathwayGenerationRequest } from './state';
import { fetchLearningIntent, fetchRecommendationFeedback } from '../../../../app/data/services/xpert';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../app/data/services/data/__factories__';
import { careerRetrievalService, courseRetrievalService } from './services';
import { queryClient } from '../../../../../utils/tests';

/**
 * End-to-end schema and privacy validation for every Learner Pathways Segment event.
 * Drives the real LearnerPathwaysTab -> CareerSelectionContainer -> PathwayCoursesContainer
 * flow (workflows are real; only their fetchLearningIntent/searchCareers/searchCourses/
 * fetchRecommendationFeedback dependency seams are mocked, same as
 * LearnerPathwaysTab.integration.test.tsx), captures every sendEnterpriseTrackEvent call,
 * and asserts:
 *   1. every payload is flat — no nested objects, no arrays of objects;
 *   2. sentinel values planted in every known privacy-sensitive source (raw intake text,
 *      recommendation explanation prose, raw error messages, the pathway fingerprint)
 *      never appear anywhere in a captured payload.
 */

jest.mock('@edx/frontend-platform/auth');
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;

jest.mock('../../../../app/data/services/xpert', () => ({
  fetchLearningIntent: jest.fn(),
  fetchRecommendationFeedback: jest.fn(),
}));
jest.mock('./services', () => ({
  careerRetrievalService: { searchCareers: jest.fn() },
  getCareerAlgoliaIndex: jest.fn(),
  courseRetrievalService: { searchCourses: jest.fn() },
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
jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-utils'),
  sendEnterpriseTrackEvent: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory({ slug: 'test-enterprise' });

// Unique, unmistakable markers for every privacy-sensitive source. If any of these ever
// appears in a captured payload, that's a real leak, not a false positive.
const SENTINEL_MOTIVATION = 'ZZZ_SENTINEL_RAW_MOTIVATION_TEXT_DO_NOT_LEAK_ZZZ';
const SENTINEL_GOAL = 'ZZZ_SENTINEL_RAW_GOAL_TEXT_DO_NOT_LEAK_ZZZ';
const SENTINEL_BACKGROUND = 'ZZZ_SENTINEL_RAW_BACKGROUND_TEXT_DO_NOT_LEAK_ZZZ';
const SENTINEL_INDUSTRY = 'ZZZ_SENTINEL_RAW_INDUSTRY_TEXT_DO_NOT_LEAK_ZZZ';
const SENTINEL_EXPLANATION = 'ZZZ_SENTINEL_RECOMMENDATION_EXPLANATION_PROSE_ZZZ';
const SENTINEL_ERROR = 'ZZZ_SENTINEL_RAW_ERROR_MESSAGE_ZZZ';

const isPrimitive = (value: unknown): boolean => (
  value === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof value)
);

/** Every top-level field must be a primitive, or an array of primitives — never an object. */
const assertFlatPayload = (payload: Record<string, unknown>) => {
  Object.values(payload).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        expect(isPrimitive(item)).toBe(true);
      });
      return;
    }
    expect(isPrimitive(value)).toBe(true);
  });
};

const renderComponent = () => render(
  <QueryClientProvider client={queryClient()}>
    <MemoryRouter>
      <IntlProvider locale="en">
        <LearnerPathwaysTab />
      </IntlProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);

const fillIntakeWithSentinels = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), SENTINEL_MOTIVATION);
  await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), SENTINEL_GOAL);
  await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), SENTINEL_BACKGROUND);
  await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), SENTINEL_INDUSTRY);
};

describe('Learner Pathways analytics — schema and privacy', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    global.localStorage.clear();
    jest.clearAllMocks();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockEnterpriseCustomer });
    (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
      data: { enterpriseCourseEnrollments: [], allEnrollmentsByStatus: {} },
    });
    mockGetAuthenticatedUser.mockReturnValue({ username: 'test-learner' });

    (fetchLearningIntent as jest.Mock).mockResolvedValue({
      condensedAlgoliaQuery: SENTINEL_GOAL, // the one AI-derived field closest to raw text — must never appear either
      skillsRequired: ['SQL'],
      skillsPreferred: ['Excel'],
    });
    (careerRetrievalService.searchCareers as jest.Mock).mockResolvedValue([
      {
        id: 'career-1', title: 'Data Analyst', matchPercentage: 90, skillsToDevelop: ['SQL', 'Excel'],
      },
    ]);
    (courseRetrievalService.searchCourses as jest.Mock).mockResolvedValue([
      { courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' },
    ]);
    (fetchRecommendationFeedback as jest.Mock).mockResolvedValue({
      reasons: { 'course-1': SENTINEL_EXPLANATION },
    });
  });

  it('emits only flat payloads with no privacy-sensitive leakage across the full onboarding -> career selection -> pathway -> course-click journey', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Onboarding: submit intake with sentinel-bearing free text.
    await fillIntakeWithSentinels(user);
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    await waitFor(() => expect(screen.getByTestId('profile-container')).toBeInTheDocument());

    // Career selection: select the (only) career, dismiss a skill, restore it.
    await user.click(screen.getByTestId('career-match-career-1'));
    await user.click(screen.getByLabelText('Dismiss SQL'));
    await user.click(screen.getByRole('button', { name: 'Restore skills' }));

    // Build the pathway (real generatePathwayWorkflow -> real fetchRecommendationFeedback,
    // whose reason text must never reach analytics).
    await user.click(screen.getByTestId('career-build-pathway-button'));
    await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
    // Captured before Retake Quiz resets the store back to null/empty below.
    const builtLearnerProfile = usePathwaysStore.getState().learnerProfile!;

    // Course engagement.
    await user.click(screen.getByRole('link', { name: /View Course/ }));

    // Retake, to also capture QUIZ_RETAKEN and the reset control-interaction pair.
    await user.click(screen.getByRole('link', { name: 'Onboarding Quiz' }));
    await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

    const { calls } = (sendEnterpriseTrackEvent as jest.Mock).mock;
    expect(calls.length).toBeGreaterThan(5);

    // 1. Every captured payload must be flat.
    calls.forEach(([, , properties]) => {
      assertFlatPayload(properties);
    });

    // 2. No sentinel value may appear anywhere in any captured call, under any key.
    const serializedCalls = JSON.stringify(calls);
    const fingerprintOfBuiltRequest = computePathwayInputFingerprint({
      learnerIntent: {
        motivation: SENTINEL_MOTIVATION,
        careerGoal: SENTINEL_GOAL,
        background: SENTINEL_BACKGROUND,
        targetIndustry: SENTINEL_INDUSTRY,
      },
      learnerProfile: builtLearnerProfile,
      selectedCareerId: 'career-1',
      selectedSkills: ['SQL', 'Excel'],
    } as PathwayGenerationRequest);
    [
      SENTINEL_MOTIVATION,
      SENTINEL_GOAL,
      SENTINEL_BACKGROUND,
      SENTINEL_INDUSTRY,
      SENTINEL_EXPLANATION,
      fingerprintOfBuiltRequest,
    ].forEach((sentinel) => {
      expect(serializedCalls).not.toContain(sentinel);
    });
  });

  it('never leaks a raw exception message when profile generation fails', async () => {
    const user = userEvent.setup();
    (fetchLearningIntent as jest.Mock).mockRejectedValueOnce(new Error(SENTINEL_ERROR));
    renderComponent();

    await fillIntakeWithSentinels(user);
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

    await waitFor(() => expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
      mockEnterpriseCustomer.uuid,
      expect.stringContaining('profile.generation_completed'),
      expect.objectContaining({ outcome: 'failed' }),
    ));

    const { calls } = (sendEnterpriseTrackEvent as jest.Mock).mock;
    calls.forEach(([, , properties]) => assertFlatPayload(properties));
    expect(JSON.stringify(calls)).not.toContain(SENTINEL_ERROR);
  });
});
