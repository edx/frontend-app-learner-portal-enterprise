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
    defaultMessage: 'Rebuild your Pathway?',
    description: 'Confirmation modal title shown before rebuilding a pathway with updated goals or career choice.',
  },
  overwriteBodyPathway: {
    id: 'learner.pathways.career.selection.overwrite.body.pathway',
    defaultMessage: 'Your current pathway will be replaced with new recommendations.',
    description: 'First paragraph of the confirmation modal body shown before rebuilding a pathway: explains the pathway itself will be replaced.',
  },
  overwriteBodyCourses: {
    id: 'learner.pathways.career.selection.overwrite.body.courses',
    defaultMessage: "Any courses you've already enrolled in won't be affected. You will still be able to access them on the course tab on your dashboard.",
    description: 'Second paragraph of the confirmation modal body shown before rebuilding a pathway: reassures the learner that enrolled courses are unaffected.',
  },
  overwriteCancel: {
    id: 'learner.pathways.career.selection.overwrite.cancel',
    defaultMessage: 'Cancel',
    description: 'Cancel the pathway rebuild confirmation and keep the existing pathway.',
  },
  overwriteConfirm: {
    id: 'learner.pathways.career.selection.overwrite.confirm',
    defaultMessage: 'Rebuild Pathway',
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
    defaultMessage: "If you retake the onboarding quiz, your existing goal summary, career match, and pathway will no longer be saved. You will need to rebuild them. Your enrolled courses won't be affected.",
    description: 'Confirmation modal body shown before retaking the onboarding quiz.',
  },
  retakeQuizCancel: {
    id: 'learner.pathways.career.selection.retake.quiz.cancel',
    defaultMessage: 'Cancel',
    description: 'Cancel the retake-quiz confirmation and stay on the Career Profile page.',
  },
  noCoursesTitle: {
    id: 'learner.pathways.career.selection.no.courses.title',
    defaultMessage: 'We could not build a pathway for this career match',
    description: 'Title of the modal shown when pathway generation succeeds but returns no courses for the selected career match.',
  },
  noCoursesBody: {
    id: 'learner.pathways.career.selection.no.courses.body',
    defaultMessage: "There aren't enough courses available for this career goal right now. Try selecting a different career match, or edit your goal summary to explore other directions.",
    description: 'Body copy of the no-courses-returned modal, explaining why a pathway could not be built and how the learner can proceed.',
  },
  noCoursesBack: {
    id: 'learner.pathways.career.selection.no.courses.back',
    defaultMessage: 'Back',
    description: 'Secondary action on the no-courses-returned modal: dismiss the modal and stay on Career Profile without changing anything.',
  },
  noCoursesChooseDifferentMatch: {
    id: 'learner.pathways.career.selection.no.courses.choose.different.match',
    defaultMessage: 'Choose a different match',
    description: 'Primary action on the no-courses-returned modal: closes the modal and opens Goal Summary editing so the learner can change the inputs driving their career match.',
  },
});

export default messages;
