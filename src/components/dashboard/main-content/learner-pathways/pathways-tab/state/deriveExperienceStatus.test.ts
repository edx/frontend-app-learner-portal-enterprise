import { derivePathwaysExperienceStatus } from './deriveExperienceStatus';
import { EMPTY_LEARNER_INTENT } from './learnerIntent';
import type { LearnerProfile, PathwayProgress } from './types';

const profile: LearnerProfile = {
  summary: 's', learningStyle: 'l', weeklyTimeCommitment: 't', certificatePreference: 'c', skills: [],
};

const progressOf = (overrides: Partial<PathwayProgress>): PathwayProgress => ({
  completed: 0, inProgress: 0, upcoming: 0, totalCourses: 0, ...overrides,
});

const noPathway = progressOf({});

describe('derivePathwaysExperienceStatus', () => {
  it('returns not_started when intent is empty and there is no profile or pathway', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT, learnerProfile: null, progress: noPathway,
    })).toBe('not_started');
  });

  it('returns onboarding_in_progress once any intent field is non-empty but no profile exists', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: { ...EMPTY_LEARNER_INTENT, motivation: 'Grow' },
      learnerProfile: null,
      progress: noPathway,
    })).toBe('onboarding_in_progress');
  });

  it('returns profile_ready once a profile exists and there is no pathway', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT, learnerProfile: profile, progress: noPathway,
    })).toBe('profile_ready');
  });

  it('returns profile_ready (not pathway_completed) when totalCourses is 0 even if completed is also 0', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: profile,
      progress: progressOf({ completed: 0, totalCourses: 0 }),
    })).toBe('profile_ready');
  });

  it('returns pathway_ready when a pathway exists and no course has started', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: profile,
      progress: progressOf({ totalCourses: 5 }),
    })).toBe('pathway_ready');
  });

  it('returns course_registered when at least one course is in progress but none are completed', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: profile,
      progress: progressOf({ inProgress: 1, totalCourses: 5 }),
    })).toBe('course_registered');
  });

  it('returns pathway_in_progress when at least one course is completed and not all are', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: profile,
      progress: progressOf({ completed: 1, inProgress: 1, totalCourses: 5 }),
    })).toBe('pathway_in_progress');
  });

  it('returns pathway_in_progress (completed outranks course_registered) even when inProgress is 0', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: profile,
      progress: progressOf({ completed: 1, inProgress: 0, totalCourses: 5 }),
    })).toBe('pathway_in_progress');
  });

  it('returns pathway_completed when every course is completed', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: profile,
      progress: progressOf({ completed: 5, totalCourses: 5 }),
    })).toBe('pathway_completed');
  });

  it('returns pathway_completed regardless of intent/profile once the pathway facts say completed', () => {
    expect(derivePathwaysExperienceStatus({
      learnerIntent: EMPTY_LEARNER_INTENT,
      learnerProfile: null,
      progress: progressOf({ completed: 5, totalCourses: 5 }),
    })).toBe('pathway_completed');
  });
});
