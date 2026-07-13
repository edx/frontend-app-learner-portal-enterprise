import {
  getInitialPathwaysState,
  selectors,
  usePathwaysStore,
} from './pathwaysStore';

describe('pathwaysStore', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
  });

  it('returns the expected initial state scaffold', () => {
    const state = usePathwaysStore.getState();

    expect(state.experienceStatus).toBe('not_started');
    expect(state.section).toBe('onboarding');
    expect(state.onboarding.answers).toEqual({
      motivation: '',
      goal: '',
      background: '',
      industry: '',
    });
    expect(state.onboarding.currentQuestion).toBe(0);
    expect(state.onboarding.isComplete).toBe(false);
    expect(state.learnerProfile).toBeNull();
    expect(state.careerMatches).toEqual([]);
    expect(state.selectedCareerId).toBeNull();
    expect(state.pathwayCourses).toEqual([]);
    expect(state.progress).toEqual({
      completed: 0,
      inProgress: 0,
      upcoming: 0,
      totalCourses: 0,
    });
    expect(state.loading).toEqual({
      learnerProfile: false,
      careerMatches: false,
      pathwayCourses: false,
      pathwayProgress: false,
    });
    expect(state.errors).toEqual({
      learnerProfile: null,
      careerMatches: null,
      pathwayCourses: null,
      pathwayProgress: null,
    });
    expect(state.constructedPayloads).toEqual({
      learnerProfileRequest: null,
      pathwayRequest: null,
    });
  });

  it('updates workflow-level values through basic setters', () => {
    const {
      setSection,
      setExperienceStatus,
      setCurrentQuestion,
      setOnboardingComplete,
      setOnboardingAnswer,
      setOnboardingAnswers,
    } = usePathwaysStore.getState();

    setSection('onboarding');
    setExperienceStatus('onboarding_in_progress');
    setCurrentQuestion(2);
    setOnboardingComplete(true);
    setOnboardingAnswer('motivation', 'Grow in my role');
    setOnboardingAnswers({
      motivation: 'Grow in my role',
      goal: 'Become a data analyst',
      background: 'Operations',
      industry: 'Technology',
    });

    const state = usePathwaysStore.getState();
    expect(state.section).toBe('onboarding');
    expect(state.experienceStatus).toBe('onboarding_in_progress');
    expect(state.onboarding.currentQuestion).toBe(2);
    expect(state.onboarding.isComplete).toBe(true);
    expect(state.onboarding.answers).toEqual({
      motivation: 'Grow in my role',
      goal: 'Become a data analyst',
      background: 'Operations',
      industry: 'Technology',
    });
    expect(selectors.onboarding(state).currentQuestion).toBe(2);
  });

  it('updates learner profile, career matches, selected career, and course slices', () => {
    const {
      setLearnerProfile,
      updateLearnerProfile,
      setCareerMatches,
      setSelectedCareerId,
      setPathwayCourses,
      updatePathwayCourse,
      setProgress,
      setLoading,
      setError,
      setConstructedPayload,
      clearConstructedPayloads,
    } = usePathwaysStore.getState();

    setLearnerProfile({
      summary: 'Profile summary',
      careerGoal: 'Data Analyst',
      targetIndustry: 'Technology',
      background: 'Operations',
      motivation: 'Career growth',
      learningStyle: 'Hands-on',
      weeklyTimeCommitment: '5 hours',
      certificatePreference: 'Optional',
      skills: ['SQL'],
    });

    updateLearnerProfile({
      weeklyTimeCommitment: '8 hours',
      skills: ['SQL', 'Python'],
    });

    setCareerMatches([
      { id: 'career-1', title: 'Data Analyst', matchPercentage: 85 },
      { id: 'career-2', title: 'Business Analyst', matchPercentage: 78 },
    ]);
    setSelectedCareerId('career-1');

    setPathwayCourses([
      { id: 'course-1', title: 'Intro to SQL', status: 'not_started' },
      { id: 'course-2', title: 'Python for Data', status: 'in_progress' },
    ]);
    updatePathwayCourse('course-1', { status: 'completed' });

    setProgress({
      completed: 1,
      inProgress: 1,
      upcoming: 0,
      totalCourses: 2,
    });

    setLoading('pathwayCourses', true);
    setError('pathwayCourses', 'Stubbed pathway error');
    setLoading('pathwayProgress', true);
    setError('pathwayProgress', 'Stubbed progress error');
    setConstructedPayload('learnerProfileRequest', { answersSource: 'onboarding' });
    setConstructedPayload('pathwayRequest', { selectedCareerId: 'career-1' });

    const state = usePathwaysStore.getState();
    expect(state.learnerProfile?.weeklyTimeCommitment).toBe('8 hours');
    expect(state.learnerProfile?.skills).toEqual(['SQL', 'Python']);
    expect(state.selectedCareerId).toBe('career-1');
    expect(selectors.selectedCareerMatch(state)?.title).toBe('Data Analyst');
    expect(state.pathwayCourses[0].status).toBe('completed');
    expect(state.progress.totalCourses).toBe(2);
    expect(state.loading.pathwayCourses).toBe(true);
    expect(state.errors.pathwayCourses).toBe('Stubbed pathway error');
    expect(state.loading.pathwayProgress).toBe(true);
    expect(state.errors.pathwayProgress).toBe('Stubbed progress error');
    expect(state.constructedPayloads.learnerProfileRequest).toEqual({ answersSource: 'onboarding' });
    expect(state.constructedPayloads.pathwayRequest).toEqual({ selectedCareerId: 'career-1' });

    clearConstructedPayloads();
    expect(usePathwaysStore.getState().constructedPayloads).toEqual({
      learnerProfileRequest: null,
      pathwayRequest: null,
    });
  });

  it('sets and clears the learningIntent slice', () => {
    const { setLearningIntent } = usePathwaysStore.getState();
    const mockLearningIntent = {
      skillsRequired: ['SQL'],
      skillsPreferred: ['Python'],
      condensedAlgoliaQuery: 'sql python',
    };

    setLearningIntent(mockLearningIntent);
    expect(usePathwaysStore.getState().learningIntent).toEqual(mockLearningIntent);
    expect(selectors.learningIntent(usePathwaysStore.getState())).toEqual(mockLearningIntent);

    setLearningIntent(null);
    expect(usePathwaysStore.getState().learningIntent).toBeNull();
  });

  it('resets back to a fresh initial state object', () => {
    const { setSection, setExperienceStatus, resetPathwaysState } = usePathwaysStore.getState();

    setSection('pathway');
    setExperienceStatus('pathway_completed');
    expect(usePathwaysStore.getState().section).toBe('pathway');

    resetPathwaysState();

    const resetState = usePathwaysStore.getState();
    expect(resetState).toMatchObject(getInitialPathwaysState());
  });

  it('handles no-op profile update and exposes selector slices', () => {
    const stateBefore = usePathwaysStore.getState();
    stateBefore.updateLearnerProfile({ weeklyTimeCommitment: '10 hours' });

    const currentState = usePathwaysStore.getState();
    expect(currentState.learnerProfile).toBeNull();

    expect(selectors.experienceStatus(currentState)).toBe('not_started');
    expect(selectors.section(currentState)).toBe('onboarding');
    expect(selectors.onboardingAnswers(currentState)).toEqual(currentState.onboarding.answers);
    expect(selectors.learnerProfile(currentState)).toBeNull();
    expect(selectors.careerMatches(currentState)).toEqual([]);
    expect(selectors.selectedCareerId(currentState)).toBeNull();
    expect(selectors.pathwayCourses(currentState)).toEqual([]);
    expect(selectors.progress(currentState)).toEqual({
      completed: 0,
      inProgress: 0,
      upcoming: 0,
      totalCourses: 0,
    });
    expect(selectors.loading(currentState)).toEqual(currentState.loading);
    expect(selectors.errors(currentState)).toEqual(currentState.errors);
    expect(selectors.constructedPayloads(currentState)).toEqual({
      learnerProfileRequest: null,
      pathwayRequest: null,
    });
  });

  it('operates via getState without mounting UI', () => {
    const state = usePathwaysStore.getState();
    state.setSection('profile');
    expect(usePathwaysStore.getState().section).toBe('profile');
  });
});
