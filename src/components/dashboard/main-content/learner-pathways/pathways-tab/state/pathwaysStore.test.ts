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

    expect(state.section).toBe('onboarding');
    expect(state.learnerIntent).toEqual({
      careerGoal: '', targetIndustry: '', background: '', motivation: '',
    });
    expect(state.learnerProfile).toBeNull();
    expect(state.careerMatches).toEqual([]);
    expect(state.selectedCareerId).toBeNull();
    expect(state.selectedSkills).toBeNull();
    expect(state.pathwayCourses).toEqual([]);
    expect(state.pathwayInputFingerprint).toBeNull();
  });

  it('updates workflow-level values through basic setters', () => {
    const { setSection, setLearnerIntent } = usePathwaysStore.getState();

    setSection('onboarding');
    setLearnerIntent({
      motivation: 'Grow in my role',
      careerGoal: 'Become a data analyst',
      background: 'Operations',
      targetIndustry: 'Technology',
    });

    const state = usePathwaysStore.getState();
    expect(state.section).toBe('onboarding');
    expect(state.learnerIntent).toEqual({
      motivation: 'Grow in my role',
      careerGoal: 'Become a data analyst',
      background: 'Operations',
      targetIndustry: 'Technology',
    });
    expect(selectors.learnerIntent(state)).toEqual(state.learnerIntent);
  });

  it('resets back to a fresh initial state object', () => {
    const { setSection, resetPathwaysState } = usePathwaysStore.getState();

    setSection('pathway');
    expect(usePathwaysStore.getState().section).toBe('pathway');

    resetPathwaysState();

    const resetState = usePathwaysStore.getState();
    expect(resetState).toMatchObject(getInitialPathwaysState());
  });

  it('exposes selector slices', () => {
    const state = usePathwaysStore.getState();

    expect(selectors.section(state)).toBe('onboarding');
    expect(selectors.learnerIntent(state)).toEqual(state.learnerIntent);
    expect(selectors.learnerProfile(state)).toBeNull();
    expect(selectors.careerMatches(state)).toEqual([]);
    expect(selectors.selectedCareerId(state)).toBeNull();
    expect(selectors.selectedSkills(state)).toBeNull();
    expect(selectors.pathwayCourses(state)).toEqual([]);
    expect(selectors.pathwayInputFingerprint(state)).toBeNull();
  });

  it('operates via getState without mounting UI', () => {
    const state = usePathwaysStore.getState();
    state.setSection('profile');
    expect(usePathwaysStore.getState().section).toBe('profile');
  });

  describe('selectCareer', () => {
    const matches = [
      { id: 'career-1', title: 'Data Analyst', skillsToDevelop: ['SQL', 'Python'] },
      { id: 'career-2', title: 'Business Analyst', skillsToDevelop: ['Excel'] },
    ];

    it('sets the selected career and initializes selectedSkills from its recommended list', () => {
      usePathwaysStore.setState({ careerMatches: matches });

      usePathwaysStore.getState().selectCareer('career-2');

      const state = usePathwaysStore.getState();
      expect(state.selectedCareerId).toBe('career-2');
      expect(state.selectedSkills).toEqual(['Excel']);
    });

    it('preserves the current selection when reselecting the already-selected career', () => {
      usePathwaysStore.setState({ careerMatches: matches });
      usePathwaysStore.getState().selectCareer('career-1');
      usePathwaysStore.getState().removeSelectedSkill('SQL');

      usePathwaysStore.getState().selectCareer('career-1');

      expect(usePathwaysStore.getState().selectedSkills).toEqual(['Python']);
    });

    it('uses the explicit recommendedSkills override instead of looking up careerMatches', () => {
      usePathwaysStore.getState().selectCareer('stub-career', ['Stub Skill']);

      expect(usePathwaysStore.getState().selectedSkills).toEqual(['Stub Skill']);
    });
  });

  describe('removeSelectedSkill / restoreSelectedSkills', () => {
    it('removes a skill from selectedSkills', () => {
      usePathwaysStore.setState({ selectedCareerId: 'career-1', selectedSkills: ['SQL', 'Python'] });

      usePathwaysStore.getState().removeSelectedSkill('SQL');

      expect(usePathwaysStore.getState().selectedSkills).toEqual(['Python']);
    });

    it('initializes from the recommendedSkills override when selectedSkills is null', () => {
      usePathwaysStore.getState().removeSelectedSkill('SQL', ['SQL', 'Python']);

      expect(usePathwaysStore.getState().selectedSkills).toEqual(['Python']);
    });

    it('restores selectedSkills to the recommended list', () => {
      usePathwaysStore.setState({ selectedCareerId: 'career-1', selectedSkills: [] });

      usePathwaysStore.getState().restoreSelectedSkills(['SQL', 'Python']);

      expect(usePathwaysStore.getState().selectedSkills).toEqual(['SQL', 'Python']);
    });
  });

  describe('commitProfileSuccess', () => {
    const learnerIntent = {
      careerGoal: 'Director of Analytics', targetIndustry: 'Tech', background: 'Ops', motivation: 'Growth',
    };
    const learnerProfile = {
      summary: 's', learningStyle: 'Hands-on', weeklyTimeCommitment: '5 hours', certificatePreference: 'Preferred', skills: ['SQL'],
    };
    const matches = [
      { id: 'career-1', title: 'Data Analyst', skillsToDevelop: ['SQL'] },
      { id: 'career-2', title: 'Business Analyst', skillsToDevelop: ['Excel'] },
    ];

    it('atomically commits the submitted intent, generated profile, and career matches', () => {
      usePathwaysStore.getState().commitProfileSuccess({ learnerIntent, learnerProfile, careerMatches: matches });

      const state = usePathwaysStore.getState();
      expect(state.learnerIntent).toEqual(learnerIntent);
      expect(state.learnerProfile).toEqual(learnerProfile);
      expect(state.careerMatches).toEqual(matches);
    });

    it('never reconstructs learnerIntent from the generated profile', () => {
      usePathwaysStore.getState().commitProfileSuccess({ learnerIntent, learnerProfile, careerMatches: matches });

      // LearnerProfile has no intent fields at all — nothing to reconstruct from.
      expect(usePathwaysStore.getState().learnerProfile).not.toHaveProperty('careerGoal');
    });

    it('keeps a still-valid selected career and re-initializes its selected skills', () => {
      usePathwaysStore.setState({ selectedCareerId: 'career-2', selectedSkills: [] });

      usePathwaysStore.getState().commitProfileSuccess({ learnerIntent, learnerProfile, careerMatches: matches });

      const state = usePathwaysStore.getState();
      expect(state.selectedCareerId).toBe('career-2');
      expect(state.selectedSkills).toEqual(['Excel']);
    });

    it('falls back to the first match when the previously selected career is no longer present', () => {
      usePathwaysStore.setState({ selectedCareerId: 'stale-career' });

      usePathwaysStore.getState().commitProfileSuccess({ learnerIntent, learnerProfile, careerMatches: matches });

      const state = usePathwaysStore.getState();
      expect(state.selectedCareerId).toBe('career-1');
      expect(state.selectedSkills).toEqual(['SQL']);
    });

    it('defaults to the true top-match career, not the raw-first one, when the taxonomy connector returns them out of percentage order', () => {
      const outOfOrder = [
        {
          id: 'raw-first', title: 'Raw First', matchPercentage: 40, skillsToDevelop: ['Excel'],
        },
        {
          id: 'top-match', title: 'Top Match', matchPercentage: 90, skillsToDevelop: ['SQL'],
        },
      ];

      usePathwaysStore.getState().commitProfileSuccess({
        learnerIntent, learnerProfile, careerMatches: outOfOrder,
      });

      const state = usePathwaysStore.getState();
      expect(state.selectedCareerId).toBe('top-match');
      expect(state.selectedSkills).toEqual(['SQL']);
    });
  });

  describe('commitPathwayBuild', () => {
    const courses = [
      { courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' as const },
    ];

    it('replaces the course set and records the fingerprint in one commit', () => {
      usePathwaysStore.getState().commitPathwayBuild({ courses, fingerprint: 'fingerprint-1' });

      const state = usePathwaysStore.getState();
      expect(state.pathwayCourses).toEqual(courses);
      expect(state.pathwayInputFingerprint).toBe('fingerprint-1');
    });

    it('replaces stale courses from a previous build entirely, not merges them', () => {
      usePathwaysStore.setState({
        pathwayCourses: [{ courseKey: 'stale-course', title: 'Old Course', status: 'completed' }],
      });

      usePathwaysStore.getState().commitPathwayBuild({ courses, fingerprint: 'fingerprint-1' });

      expect(usePathwaysStore.getState().pathwayCourses).toEqual(courses);
    });
  });
});
