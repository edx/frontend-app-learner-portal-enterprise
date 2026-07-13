import {
  buildCourseSearchQuery, buildLearnerProfile, buildRecommendationProfile, mapLearningIntentToTaxonomyInput,
} from './mappers';

const mockLearningIntent = {
  skillsRequired: ['SQL', 'Python'],
  skillsPreferred: ['Data Visualization', 'SQL'],
  condensedAlgoliaQuery: 'data analysis sql python',
};

const mockAnswers = {
  motivation: 'I want to grow into a data-focused role',
  goal: 'Become a data analyst',
  background: 'Five years in accounting',
  industry: 'Financial services',
};

describe('mapLearningIntentToTaxonomyInput', () => {
  it('maps condensedAlgoliaQuery, skillsRequired, and skillsPreferred', () => {
    const result = mapLearningIntentToTaxonomyInput({ learningIntent: mockLearningIntent, intakeAnswers: mockAnswers });

    expect(result).toEqual({
      query: 'data analysis sql python',
      skillsRequired: ['SQL', 'Python'],
      skillsPreferred: ['Data Visualization', 'SQL'],
    });
  });
});

describe('buildCourseSearchQuery', () => {
  it('joins the lowercased top 3 strict skills, space-separated, as the query', () => {
    const result = buildCourseSearchQuery({
      strictSkills: ['SQL', 'Python', 'Tableau'],
      careerTitle: 'Data Analyst',
    });

    expect(result.query).toBe('sql python tableau');
  });

  it('caps at 3 skill terms even with more strict skills, distinct from the facet cap of 4', () => {
    const result = buildCourseSearchQuery({
      strictSkills: ['SQL', 'Python', 'Tableau', 'Excel', 'R'],
      careerTitle: 'Data Analyst',
    });

    expect(result.query).toBe('sql python tableau');
  });

  it('falls back to careerTitle as the query when there are no strict skills', () => {
    const result = buildCourseSearchQuery({ strictSkills: [], careerTitle: 'Data Analyst' });

    expect(result.query).toBe('Data Analyst');
  });

  it('sets queryAlternates to [careerTitle] when the derived query differs from careerTitle', () => {
    const result = buildCourseSearchQuery({ strictSkills: ['SQL'], careerTitle: 'Data Analyst' });

    expect(result.queryAlternates).toEqual(['Data Analyst']);
  });

  it('sets queryAlternates to [] when the query equals careerTitle (no strict skills)', () => {
    const result = buildCourseSearchQuery({ strictSkills: [], careerTitle: 'Data Analyst' });

    expect(result.queryAlternates).toEqual([]);
  });
});

describe('buildLearnerProfile', () => {
  it('maps intake answers verbatim into careerGoal/targetIndustry/background/motivation', () => {
    const result = buildLearnerProfile({ intakeAnswers: mockAnswers, learningIntent: mockLearningIntent });

    expect(result.careerGoal).toBe('Become a data analyst');
    expect(result.targetIndustry).toBe('Financial services');
    expect(result.background).toBe('Five years in accounting');
    expect(result.motivation).toBe('I want to grow into a data-focused role');
  });

  it('dedupes skillsRequired and skillsPreferred into skills', () => {
    const result = buildLearnerProfile({ intakeAnswers: mockAnswers, learningIntent: mockLearningIntent });

    expect(result.skills).toEqual(['SQL', 'Python', 'Data Visualization']);
  });

  it('does not fabricate summary/learningStyle/weeklyTimeCommitment/certificatePreference', () => {
    const result = buildLearnerProfile({ intakeAnswers: mockAnswers, learningIntent: mockLearningIntent });

    expect(result.summary).toBe('');
    expect(result.learningStyle).toBe('');
    expect(result.weeklyTimeCommitment).toBe('');
    expect(result.certificatePreference).toBe('');
  });
});

describe('buildRecommendationProfile', () => {
  const mockLearnerProfile = buildLearnerProfile({ intakeAnswers: mockAnswers, learningIntent: mockLearningIntent });
  const mockSelectedCareer = {
    id: 'data-analyst',
    title: 'Data Analyst',
    skillsToDevelop: ['SQL', 'Tableau'],
  };

  it('includes only the deliberate minimal projection fields', () => {
    const result = buildRecommendationProfile({
      learnerProfile: mockLearnerProfile,
      learningIntent: mockLearningIntent,
      selectedCareer: mockSelectedCareer,
    });

    expect(result).toEqual({
      careerGoal: 'Become a data analyst',
      targetIndustry: 'Financial services',
      background: 'Five years in accounting',
      motivation: 'I want to grow into a data-focused role',
      skillsRequired: ['SQL', 'Python'],
      skillsPreferred: ['Data Visualization', 'SQL'],
      selectedCareerTitle: 'Data Analyst',
      selectedCareerSkills: ['SQL', 'Tableau'],
    });
  });

  it('excludes loading/error/navigation/constructedPayloads/raw-client fields', () => {
    const result = buildRecommendationProfile({
      learnerProfile: mockLearnerProfile,
      learningIntent: mockLearningIntent,
      selectedCareer: mockSelectedCareer,
    });

    expect(result).not.toHaveProperty('loading');
    expect(result).not.toHaveProperty('errors');
    expect(result).not.toHaveProperty('section');
    expect(result).not.toHaveProperty('constructedPayloads');
    expect(result).not.toHaveProperty('searchClient');
  });

  it('handles a null learningIntent gracefully with empty skill arrays', () => {
    const result = buildRecommendationProfile({
      learnerProfile: mockLearnerProfile,
      learningIntent: null,
      selectedCareer: mockSelectedCareer,
    });

    expect(result.skillsRequired).toEqual([]);
    expect(result.skillsPreferred).toEqual([]);
  });

  it('defaults selectedCareerSkills to an empty array when the career has none', () => {
    const result = buildRecommendationProfile({
      learnerProfile: mockLearnerProfile,
      learningIntent: mockLearningIntent,
      selectedCareer: { id: 'x', title: 'Some Career' },
    });

    expect(result.selectedCareerSkills).toEqual([]);
  });
});
