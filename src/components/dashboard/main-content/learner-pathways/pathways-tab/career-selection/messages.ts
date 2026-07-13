import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  heading: {
    id: 'learner.pathways.career.selection.heading',
    defaultMessage: 'Career Profile',
    description: 'Heading for the learner pathways career selection page.',
  },
  beta: {
    id: 'learner.pathways.career.selection.beta',
    defaultMessage: 'Beta',
    description: 'Beta status label.',
  },
  intro: {
    id: 'learner.pathways.career.selection.intro',
    defaultMessage: 'Review your goal summary and select a career match.',
    description: 'Career selection page intro.',
  },
  goalSummary: {
    id: 'learner.pathways.career.selection.goal.summary',
    defaultMessage: 'Goal Summary',
    description: 'Goal summary card heading.',
  },
  careerGoal: {
    id: 'learner.pathways.career.selection.career.goal',
    defaultMessage: 'Career Goal',
    description: 'Career goal label.',
  },
  targetIndustry: {
    id: 'learner.pathways.career.selection.target.industry',
    defaultMessage: 'Target Industry',
    description: 'Target industry label.',
  },
  background: {
    id: 'learner.pathways.career.selection.background',
    defaultMessage: 'Background',
    description: 'Background label.',
  },
  motivation: {
    id: 'learner.pathways.career.selection.motivation',
    defaultMessage: 'Motivation',
    description: 'Motivation label.',
  },
  careerGoalRequiredError: {
    id: 'learner.pathways.career.selection.career.goal.required.error',
    defaultMessage: 'Please enter a career goal.',
    description: 'Validation message shown when the career goal field is empty.',
  },
  targetIndustryRequiredError: {
    id: 'learner.pathways.career.selection.target.industry.required.error',
    defaultMessage: 'Please enter a target industry.',
    description: 'Validation message shown when the target industry field is empty.',
  },
  backgroundRequiredError: {
    id: 'learner.pathways.career.selection.background.required.error',
    defaultMessage: 'Please enter your background.',
    description: 'Validation message shown when the background field is empty.',
  },
  motivationRequiredError: {
    id: 'learner.pathways.career.selection.motivation.required.error',
    defaultMessage: 'Please enter your motivation.',
    description: 'Validation message shown when the motivation field is empty.',
  },
  edit: {
    id: 'learner.pathways.career.selection.edit',
    defaultMessage: 'Edit',
    description: 'Edit goal summary action.',
  },
  cancel: {
    id: 'learner.pathways.career.selection.cancel',
    defaultMessage: 'Cancel',
    description: 'Cancel goal summary edit action.',
  },
  submit: {
    id: 'learner.pathways.career.selection.submit',
    defaultMessage: 'Submit',
    description: 'Submit goal summary action.',
  },
  submitting: {
    id: 'learner.pathways.career.selection.submitting',
    defaultMessage: 'Submitting...',
    description: 'Goal summary submit loading state.',
  },
  notProvided: {
    id: 'learner.pathways.career.selection.not.provided',
    defaultMessage: 'Not provided',
    description: 'Fallback for empty goal summary fields.',
  },
  careerMatches: {
    id: 'learner.pathways.career.selection.matches',
    defaultMessage: 'Career Matches',
    description: 'Career matches card heading.',
  },
  careerMatchesHelp: {
    id: 'learner.pathways.career.selection.matches.help',
    defaultMessage:
      'Based on your goals and current market trends, here are roles that align with your profile.',
    description: 'Career matches supporting text.',
  },
  matchPercentage: {
    id: 'learner.pathways.career.selection.match.percentage',
    defaultMessage: '{percentage}% match',
    description: 'Career match percentage badge.',
  },
  noMatches: {
    id: 'learner.pathways.career.selection.no.matches',
    defaultMessage: 'No strong career matches yet',
    description: 'Career matches empty-state heading.',
  },
  noMatchesHelp: {
    id: 'learner.pathways.career.selection.no.matches.help',
    defaultMessage:
      'Edit your goal summary and submit it again to generate a new set of career matches.',
    description: 'Career matches empty-state help.',
  },
  editGoalSummary: {
    id: 'learner.pathways.career.selection.edit.goal.summary',
    defaultMessage: 'Edit goal summary',
    description: 'Career matches empty-state action.',
  },
  skills: {
    id: 'learner.pathways.career.selection.skills',
    defaultMessage: 'Skills to develop',
    description: 'Skills card heading.',
  },
  skillsHelp: {
    id: 'learner.pathways.career.selection.skills.help',
    defaultMessage: 'Key skills for your target goal.',
    description: 'Skills card supporting text.',
  },
  dismissSkill: {
    id: 'learner.pathways.career.selection.dismiss.skill',
    defaultMessage: 'Dismiss {skill}',
    description: 'Accessible label for dismissing a skill chip.',
  },
  restoreSkills: {
    id: 'learner.pathways.career.selection.restore.skills',
    defaultMessage: 'Restore skills',
    description: 'Restore dismissed skills action.',
  },
  noSkills: {
    id: 'learner.pathways.career.selection.no.skills',
    defaultMessage: 'No skills are currently selected for this career match.',
    description: 'Skills empty-state text.',
  },
  buildPathway: {
    id: 'learner.pathways.career.selection.build.pathway',
    defaultMessage: 'Build my learning pathway',
    description: 'Build pathway action.',
  },
  buildingPathway: {
    id: 'learner.pathways.career.selection.building.pathway',
    defaultMessage: 'Building pathway...',
    description: 'Loading state shown on the build/rebuild pathway action while it is in flight.',
  },
  viewCurrentPathway: {
    id: 'learner.pathways.career.selection.view.current.pathway',
    defaultMessage: 'View current pathway',
    description: 'Action to navigate to the existing pathway without rebuilding it, shown when the learner has made edits since it was generated.',
  },
  rebuildPathway: {
    id: 'learner.pathways.career.selection.rebuild.pathway',
    defaultMessage: 'Rebuild my learning pathway',
    description: 'Primary action to rebuild the pathway, shown when the learner has made relevant edits since it was generated.',
  },
  overwriteTitle: {
    id: 'learner.pathways.career.selection.overwrite.title',
    defaultMessage: 'Rebuild your pathway?',
    description: 'Confirmation modal title shown before rebuilding a pathway with updated goals or career choice.',
  },
  overwriteBody: {
    id: 'learner.pathways.career.selection.overwrite.body',
    defaultMessage:
      'You already have a saved pathway. Rebuilding will replace it based on your updated goals and career choice.',
    description: 'Confirmation modal body shown before rebuilding a pathway with updated goals or career choice.',
  },
  keepPathway: {
    id: 'learner.pathways.career.selection.keep.pathway',
    defaultMessage: 'Keep previous pathway',
    description: 'Cancel the pathway rebuild confirmation and keep the existing pathway.',
  },
  buildNewPathway: {
    id: 'learner.pathways.career.selection.build.new.pathway',
    defaultMessage: 'Rebuild my learning pathway',
    description: 'Confirm the pathway rebuild action.',
  },
  retakeQuiz: {
    id: 'learner.pathways.career.selection.retake.quiz',
    defaultMessage: 'Retake quiz',
    description: 'Leading action to retake the onboarding quiz from the Career Profile page.',
  },
  retakeQuizTitle: {
    id: 'learner.pathways.career.selection.retake.quiz.title',
    defaultMessage: 'Retake your onboarding quiz?',
    description: 'Confirmation modal title shown before retaking the onboarding quiz.',
  },
  retakeQuizBody: {
    id: 'learner.pathways.career.selection.retake.quiz.body',
    defaultMessage: 'You will need to answer the onboarding questions again to generate a new pathway.',
    description: 'Confirmation modal body shown before retaking the onboarding quiz.',
  },
  retakeQuizCancel: {
    id: 'learner.pathways.career.selection.retake.quiz.cancel',
    defaultMessage: 'Cancel',
    description: 'Cancel the retake-quiz confirmation and stay on the Career Profile page.',
  },
});

export default messages;
