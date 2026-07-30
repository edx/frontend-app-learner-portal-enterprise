import { defineMessages } from '@edx/frontend-platform/i18n';

/**
 * Internationalized copy for the stateful learner pathways Courses-tab alert. Exact
 * wording (except `onboardingInProgress*`, see below) is transcribed verbatim from the
 * Figma source (`docs/projects/learner-pathway/screenshots/mycoursestab.svg`).
 */
const learnerPathwaysMessages = defineMessages({
  eyebrowLabel: {
    id: 'enterprise.dashboard.learner.pathways.alert.eyebrow.label',
    defaultMessage: 'Pathways Beta',
    description: 'Small eyebrow label above the learner pathways alert heading.',
  },
  notStartedHeading: {
    id: 'enterprise.dashboard.learner.pathways.alert.not.started.heading',
    defaultMessage: 'Ready to start your learning journey?',
    description: 'Heading for the learner pathways alert before onboarding has started.',
  },
  notStartedBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.not.started.body',
    defaultMessage: 'Take a short onboarding quiz to build your personalized pathway of course recommendations tailored to your career goals.',
    description: 'Body text for the learner pathways alert before onboarding has started.',
  },
  ctaTakeOnboardingQuiz: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.take.onboarding.quiz',
    defaultMessage: 'Take onboarding quiz',
    description: 'Button label to start the learner pathways onboarding quiz.',
  },
  // Not shown in the Figma source (no mockup covers "quiz started, no profile yet") —
  // written to fit the same purple visual family without claiming a profile exists.
  // Flagged as not designer-approved; needs sign-off before shipping to production.
  onboardingInProgressHeading: {
    id: 'enterprise.dashboard.learner.pathways.alert.onboarding.in.progress.heading',
    defaultMessage: 'Keep building your pathway',
    description: 'Heading for the learner pathways alert while onboarding is in progress.',
  },
  onboardingInProgressBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.onboarding.in.progress.body',
    defaultMessage: 'Finish the onboarding quiz to get your personalized career profile and course recommendations.',
    description: 'Body text for the learner pathways alert while onboarding is in progress.',
  },
  ctaContinueQuiz: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.continue.quiz',
    defaultMessage: 'Continue quiz',
    description: 'Button label to continue the in-progress learner pathways onboarding quiz.',
  },
  profileReadyHeading: {
    id: 'enterprise.dashboard.learner.pathways.alert.profile.ready.heading',
    defaultMessage: 'Your personalized pathway is almost ready!',
    description: 'Heading for the learner pathways alert once a career profile exists but no pathway has been built.',
  },
  profileReadyBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.profile.ready.body',
    defaultMessage: "We've generated your career profile from your quiz results. Review it and we'll build your pathway.",
    description: 'Body text for the learner pathways alert once a career profile exists but no pathway has been built.',
  },
  ctaReviewCareerProfile: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.review.career.profile',
    defaultMessage: 'Review career profile',
    description: 'Button label to review the generated career profile.',
  },
  pathwayHeading: {
    id: 'enterprise.dashboard.learner.pathways.alert.pathway.heading',
    defaultMessage: 'Your learning pathway',
    description: 'Heading for the learner pathways alert once a pathway has been generated (ready, registered, or in progress).',
  },
  pathwayReadyBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.pathway.ready.body',
    defaultMessage: 'View your personalized learning pathway to enroll in a course or navigate back to your career profile.',
    description: 'Body text for the learner pathways alert once a pathway exists but no course is registered yet.',
  },
  courseRegisteredBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.course.registered.body',
    defaultMessage: 'View your personalized learning pathway to continue your next course or check your progress.',
    description: 'Body text for the learner pathways alert once the learner has registered for a pathway course.',
  },
  pathwayInProgressBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.pathway.in.progress.body',
    defaultMessage: 'Congratulations on completing a course! View your learning pathway to start your next upcoming course.',
    description: 'Body text for the learner pathways alert once the learner has completed at least one pathway course.',
  },
  ctaViewLearningPathway: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.view.learning.pathway',
    defaultMessage: 'View learning pathway',
    description: 'Button label to view the generated learning pathway.',
  },
  pathwayCompletedHeading: {
    id: 'enterprise.dashboard.learner.pathways.alert.pathway.completed.heading',
    defaultMessage: 'Learning pathway completed!',
    description: 'Heading for the learner pathways alert once every pathway course is completed.',
  },
  pathwayCompletedBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.pathway.completed.body',
    defaultMessage: 'Congratulations on finishing your pathway! Retake the onboarding quiz to build a new learning pathway.',
    description: 'Body text for the learner pathways alert once every pathway course is completed.',
  },
  ctaRetakeOnboardingQuiz: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.retake.onboarding.quiz',
    defaultMessage: 'Retake onboarding quiz',
    description: 'Button label to retake the onboarding quiz and build a new learning pathway.',
  },
  progressReadyTemplate: {
    id: 'enterprise.dashboard.learner.pathways.alert.progress.ready',
    defaultMessage: '{careerGoal}: {totalCourses} courses ready to start',
    description: 'Career-goal and progress line for a freshly generated pathway with no course started yet.',
  },
  progressInProgressTemplate: {
    id: 'enterprise.dashboard.learner.pathways.alert.progress.in.progress',
    defaultMessage: '{careerGoal}: {inProgress}/{totalCourses} courses in progress',
    description: 'Career-goal and progress line when the learner has registered for at least one course but not completed any.',
  },
  progressPartialTemplate: {
    id: 'enterprise.dashboard.learner.pathways.alert.progress.partial',
    defaultMessage: '{careerGoal}: {completed} completed • {inProgress} in progress',
    description: 'Career-goal and progress line when at least one course is completed and at least one is in progress.',
  },
  progressCompletedTemplate: {
    id: 'enterprise.dashboard.learner.pathways.alert.progress.completed',
    defaultMessage: '{careerGoal}: {totalCourses}/{totalCourses} courses completed!',
    description: 'Career-goal and progress line when every pathway course is completed.',
  },
});

export default learnerPathwaysMessages;
