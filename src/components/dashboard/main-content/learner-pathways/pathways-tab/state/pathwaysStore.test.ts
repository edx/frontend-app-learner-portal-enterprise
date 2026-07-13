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
    expect(state.pathwayBaseline).toBeNull();
  });

  it('sets and clears the pathway baseline snapshot', () => {
    const { setPathwayBaseline } = usePathwaysStore.getState();

    setPathwayBaseline({
      careerGoal: 'Data Analyst',
      targetIndustry: 'Technology',
      background: 'Operations',
      motivation: 'Career growth',
      selectedCareerId: 'career-1',
    });

    let state = usePathwaysStore.getState();
    expect(state.pathwayBaseline).toEqual({
      careerGoal: 'Data Analyst',
      targetIndustry: 'Technology',
      background: 'Operations',
      motivation: 'Career growth',
      selectedCareerId: 'career-1',
    });
    expect(selectors.pathwayBaseline(state)).toEqual(state.pathwayBaseline);

    setPathwayBaseline(null);
    state = usePathwaysStore.getState();
    expect(state.pathwayBaseline).toBeNull();
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
  });

  it('operates via getState without mounting UI', () => {
    const state = usePathwaysStore.getState();
    state.setSection('profile');
    expect(usePathwaysStore.getState().section).toBe('profile');
  });

  describe('selectCareer', () => {
    it('sets the selected career and resets dismissed skills atomically', () => {
      usePathwaysStore.getState().dismissSkill('SQL');
      expect(usePathwaysStore.getState().dismissedSkillKeys).toEqual(['SQL']);

      usePathwaysStore.getState().selectCareer('career-2');

      const state = usePathwaysStore.getState();
      expect(state.selectedCareerId).toBe('career-2');
      expect(state.dismissedSkillKeys).toEqual([]);
    });

    it('preserves dismissed skills when reselecting the already-selected career', () => {
      usePathwaysStore.getState().setSelectedCareerId('career-1');
      usePathwaysStore.getState().dismissSkill('SQL');

      usePathwaysStore.getState().selectCareer('career-1');

      expect(usePathwaysStore.getState().dismissedSkillKeys).toEqual(['SQL']);
    });
  });

  describe('dismissSkill / restoreSkills', () => {
    it('adds a skill to the dismissed set without duplicating it', () => {
      const { dismissSkill } = usePathwaysStore.getState();
      dismissSkill('SQL');
      dismissSkill('SQL');
      dismissSkill('Python');

      expect(usePathwaysStore.getState().dismissedSkillKeys).toEqual(['SQL', 'Python']);
    });

    it('clears the dismissed set on restoreSkills', () => {
      usePathwaysStore.getState().dismissSkill('SQL');
      usePathwaysStore.getState().restoreSkills();

      expect(usePathwaysStore.getState().dismissedSkillKeys).toEqual([]);
    });
  });

  describe('commitProfileSuccess', () => {
    const profile = {
      summary: 's',
      careerGoal: 'Director of Analytics',
      targetIndustry: 'Tech',
      background: 'Ops',
      motivation: 'Growth',
      learningStyle: 'Hands-on',
      weeklyTimeCommitment: '5 hours',
      certificatePreference: 'Preferred',
      skills: ['SQL'],
    };
    const matches = [
      { id: 'career-1', title: 'Data Analyst' },
      { id: 'career-2', title: 'Business Analyst' },
    ];

    it('replaces the profile, career matches, and the corresponding onboarding answers', () => {
      usePathwaysStore.getState().commitProfileSuccess({ learnerProfile: profile, careerMatches: matches });

      const state = usePathwaysStore.getState();
      expect(state.learnerProfile).toEqual(profile);
      expect(state.careerMatches).toEqual(matches);
      expect(state.onboarding.answers).toEqual({
        goal: 'Director of Analytics',
        industry: 'Tech',
        background: 'Ops',
        motivation: 'Growth',
      });
    });

    it('keeps a still-valid selected career and resets dismissed skills', () => {
      usePathwaysStore.getState().setSelectedCareerId('career-2');
      usePathwaysStore.getState().dismissSkill('SQL');

      usePathwaysStore.getState().commitProfileSuccess({ learnerProfile: profile, careerMatches: matches });

      const state = usePathwaysStore.getState();
      expect(state.selectedCareerId).toBe('career-2');
      expect(state.dismissedSkillKeys).toEqual([]);
    });

    it('falls back to the first match when the previously selected career is no longer present', () => {
      usePathwaysStore.getState().setSelectedCareerId('stale-career');

      usePathwaysStore.getState().commitProfileSuccess({ learnerProfile: profile, careerMatches: matches });

      expect(usePathwaysStore.getState().selectedCareerId).toBe('career-1');
    });
  });

  describe('commitPathwayBuild', () => {
    const courses = [
      {
        id: 'course-1', courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' as const,
      },
    ];
    const baseline = {
      careerGoal: 'Data Analyst',
      targetIndustry: 'Tech',
      background: 'Ops',
      motivation: 'Growth',
      selectedCareerId: 'career-1',
    };

    it('replaces the course set, sets the baseline, and marks the pathway ready in one commit', () => {
      usePathwaysStore.getState().commitPathwayBuild({ courses, baseline });

      const state = usePathwaysStore.getState();
      expect(state.pathwayCourses).toEqual(courses);
      expect(state.pathwayBaseline).toEqual(baseline);
      expect(state.experienceStatus).toBe('pathway_ready');
    });

    it('replaces stale courses from a previous build entirely, not merges them', () => {
      usePathwaysStore.getState().setPathwayCourses([
        { id: 'stale-course', title: 'Old Course', status: 'completed' },
      ]);

      usePathwaysStore.getState().commitPathwayBuild({ courses, baseline });

      expect(usePathwaysStore.getState().pathwayCourses).toEqual(courses);
    });
  });
});
