import { act, renderHook } from '@testing-library/react';

import { useLearnerPathwaysAlertViewModel } from './useLearnerPathwaysAlertViewModel';
import { usePathwaysStore } from '../../pathways-tab/state';
import { getDismissedRank, recordDismissal } from './bannerDismissal';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../../app/data/services/data/__factories__';

jest.mock('../../../../../app/data', () => ({
  ...jest.requireActual('../../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseCourseEnrollments: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory({ slug: 'test-enterprise' });

const mockEnrollments = (enterpriseCourseEnrollments: unknown[]) => {
  (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
    data: { enterpriseCourseEnrollments },
  });
};

const inProgressEnrollment = (courseKey: string) => ({
  courseKey,
  courseRunId: `${courseKey}-run`,
  courseRunStatus: 'in_progress',
  isEnrollmentActive: true,
  isRevoked: false,
  created: '2026-01-01T00:00:00Z',
});

const completedEnrollment = (courseKey: string) => ({
  courseKey,
  courseRunId: `${courseKey}-run`,
  courseRunStatus: 'completed',
  isEnrollmentActive: true,
  isRevoked: false,
  created: '2026-01-01T00:00:00Z',
  linkToCertificate: 'https://example.com/certificate',
});

describe('useLearnerPathwaysAlertViewModel', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    global.localStorage.clear();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockEnterpriseCustomer });
    mockEnrollments([]);
  });

  const renderViewModel = (input = {}) => renderHook(() => useLearnerPathwaysAlertViewModel({
    onSelectTab: jest.fn(),
    hasPathwaysTab: true,
    ...input,
  }));

  it('returns not_started with no progress when there is no intent, profile, pathway, or enrollments', () => {
    const { result } = renderViewModel();

    expect(result.current.status).toBe('not_started');
    expect(result.current.show).toBe(true);
    expect(result.current.progress).toBeNull();
  });

  it('derives course_registered from a pathway plus a matching in-progress enrollment', () => {
    usePathwaysStore.setState({
      pathwayCourses: [
        { courseKey: 'course-1', title: 'Course 1', status: 'not_started' },
        { courseKey: 'course-2', title: 'Course 2', status: 'not_started' },
      ],
    });
    mockEnrollments([inProgressEnrollment('course-1')]);

    const { result } = renderViewModel();

    expect(result.current.status).toBe('course_registered');
    expect(result.current.progress).toEqual({ completed: 0, inProgress: 1, totalCourses: 2 });
  });

  it('derives pathway_completed once every course is completed', () => {
    usePathwaysStore.setState({
      pathwayCourses: [
        { courseKey: 'course-1', title: 'Course 1', status: 'not_started' },
      ],
    });
    mockEnrollments([completedEnrollment('course-1')]);

    const { result } = renderViewModel();

    expect(result.current.status).toBe('pathway_completed');
    expect(result.current.progress).toEqual({ completed: 1, inProgress: 0, totalCourses: 1 });
  });

  it('disables the CTA and no-ops onCtaClick when hasPathwaysTab is false', () => {
    const onSelectTab = jest.fn();
    const { result } = renderViewModel({ onSelectTab, hasPathwaysTab: false });

    expect(result.current.ctaDisabled).toBe(true);

    act(() => { result.current.onCtaClick(); });

    expect(onSelectTab).not.toHaveBeenCalled();
    expect(usePathwaysStore.getState().section).toBe('onboarding');
  });

  it('onCtaClick calls setSection with the descriptor target and onSelectTab with the pathways tab', () => {
    usePathwaysStore.setState({
      pathwayCourses: [{ courseKey: 'course-1', title: 'Course 1', status: 'not_started' }],
    });
    const onSelectTab = jest.fn();
    const { result } = renderViewModel({ onSelectTab, hasPathwaysTab: true });

    expect(result.current.status).toBe('pathway_ready');

    act(() => { result.current.onCtaClick(); });

    expect(usePathwaysStore.getState().section).toBe('pathway');
    expect(onSelectTab).toHaveBeenCalledWith('pathways');
  });

  it('hides the banner once dismissed at the current status, and records the dismissal', () => {
    const { result, rerender } = renderViewModel();

    expect(result.current.show).toBe(true);

    act(() => { result.current.onDismiss(); });
    rerender();

    expect(result.current.show).toBe(false);
    expect(getDismissedRank()).not.toBeNull();
  });

  it('shows the banner again once the status advances past a prior dismissal', () => {
    recordDismissal('not_started');
    const { result, rerender } = renderViewModel();

    expect(result.current.show).toBe(false);

    act(() => {
      usePathwaysStore.setState({ learnerIntent: { ...usePathwaysStore.getState().learnerIntent, motivation: 'Grow' } });
    });
    rerender();

    expect(result.current.status).toBe('onboarding_in_progress');
    expect(result.current.show).toBe(true);
  });

  it('resolves careerGoal from the selected career match, falling back to an empty string', () => {
    const { result: withoutCareer } = renderViewModel();
    expect(withoutCareer.current.careerGoal).toBe('');

    act(() => {
      usePathwaysStore.setState({
        careerMatches: [{ id: 'career-1', title: 'Data Scientist' }],
        selectedCareerId: 'career-1',
      });
    });
    const { result: withCareer } = renderViewModel();
    expect(withCareer.current.careerGoal).toBe('Data Scientist');
  });
});
