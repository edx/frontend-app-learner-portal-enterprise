import type {
  LearnerProfile,
  LearningPathway,
  PathwayCourse,
  CourseStatus
} from './pathways.types';

/**
 * Adapters for normalizing source data shapes to target component contracts.
 */
export const pathwaysAdapters = {
  /**
   * Normalizes the pathway response from the source API.
   * Ensures that courses have the correct status and ordering.
   */
  normalizePathway(pathway: any): LearningPathway {
    const courses: PathwayCourse[] = (pathway.courses || []).map((course: any, index: number) => {
      // Source app had some logic for default status based on index
      // which we'll preserve here for fidelity, but it can be overridden later.
      let status: CourseStatus = 'not started';
      if (index === 0) {
        status = 'completed';
      } else if (index === 1) {
        status = 'in progress';
      }

      return {
        title: course.title || '',
        level: course.level || 'Introductory',
        skills: course.skills || [],
        reasoning: course.reasoning || '',
        status: course.status || status,
        order: course.order || index + 1,
      };
    });

    return {
      courses,
    };
  },

  /**
   * Normalizes a learner profile.
   */
  normalizeProfile(profile: any): LearnerProfile {
    return {
      overview: profile.overview || '',
      careerGoal: profile.careerGoal || '',
      targetIndustry: profile.targetIndustry || '',
      background: profile.background || '',
      motivation: profile.motivation || '',
      learningStyle: profile.learningStyle || '',
      timeAvailable: profile.timeAvailable || '',
      certificate: profile.certificate || '',
      careerMatches: (profile.careerMatches || []).map((match: any) => ({
        title: match.title || '',
        percentMatch: match.percentMatch || 0,
        skills: match.skills || [],
      })),
    };
  },
};
