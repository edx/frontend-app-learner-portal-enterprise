import { derivePathwaysExperienceStatus } from './deriveExperienceStatus';
import { EMPTY_LEARNER_INTENT } from './learnerIntent';
import type { LearnerProfile, PathwayCourse } from './types';

const profile: LearnerProfile = {
  summary: 's', learningStyle: 'l', weeklyTimeCommitment: 't', certificatePreference: 'c', skills: [],
};

const courseWith = (status: PathwayCourse['status']): PathwayCourse => ({
  courseKey: `course-${status}`, title: 'Course', status,
});

describe('derivePathwaysExperienceStatus', () => {
  it('returns not_started when intent is empty and there is no profile or pathway', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT, learnerProfile: null, pathwayCourses: [],
    })).toBe('not_started');
  });

  it('returns onboarding_in_progress once any intent field is non-empty but no profile exists', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: { ...EMPTY_LEARNER_INTENT, motivation: 'Grow' },
      learnerProfile: null,
      pathwayCourses: [],
    })).toBe('onboarding_in_progress');
  });

  it('returns profile_ready once a profile exists and there is no pathway', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT, learnerProfile: profile, pathwayCourses: [],
    })).toBe('profile_ready');
  });

  it('returns pathway_ready when every course is not_started', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: profile,
      pathwayCourses: [courseWith('not_started'), courseWith('not_started')],
    })).toBe('pathway_ready');
  });

  it('returns pathway_in_progress when at least one course has started but not all are completed', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: profile,
      pathwayCourses: [courseWith('completed'), courseWith('not_started')],
    })).toBe('pathway_in_progress');
  });

  it('returns pathway_completed when every course is completed', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: profile,
      pathwayCourses: [courseWith('completed'), courseWith('completed')],
    })).toBe('pathway_completed');
  });
});
