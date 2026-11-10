/**
 * @file Documents the Segment event tracking name space.
 *
 * Event names should follow the convention of:
 * <project name>.<product name>.<location>.<action>
 *
 * @example edx.ui.enterprise.learner_portal.pathways.step.viewed
 *
 * TODO: only Learner Pathways events are centralized here so far. Other event names
 * across this app are still defined inline or in scattered per-feature constants files
 * (e.g. src/components/pathway/constants.js, src/components/course/data/constants.js).
 * They should eventually be migrated into this same convention, mirroring
 * frontend-app-admin-portal's src/eventTracking.js.
 */

const PROJECT_NAME = 'edx.ui.enterprise.learner_portal';

const PATHWAYS_PREFIX = `${PROJECT_NAME}.pathways`;

export const PATHWAYS_EVENTS = {
  STEP_VIEWED: `${PATHWAYS_PREFIX}.step.viewed`,
  INTAKE_SUBMITTED: `${PATHWAYS_PREFIX}.intake.submitted`,
  INTAKE_VALIDATION_FAILED: `${PATHWAYS_PREFIX}.intake.validation_failed`,
  PROFILE_GENERATION_COMPLETED: `${PATHWAYS_PREFIX}.profile.generation_completed`,
  CAREER_SELECTED: `${PATHWAYS_PREFIX}.career.selected`,
  SKILL_UPDATED: `${PATHWAYS_PREFIX}.skill.updated`,
  BUILD_REQUESTED: `${PATHWAYS_PREFIX}.build.requested`,
  BUILD_COMPLETED: `${PATHWAYS_PREFIX}.build.completed`,
  COURSE_CLICKED: `${PATHWAYS_PREFIX}.course.clicked`,
  QUIZ_RETAKEN: `${PATHWAYS_PREFIX}.quiz.retaken`,
  FEEDBACK_LINK_CLICKED: `${PATHWAYS_PREFIX}.feedback_link.clicked`,
  CONTROL_INTERACTED: `${PATHWAYS_PREFIX}.control.interacted`,
};

const PERSONALIZED_SEARCH_PREFIX = `${PROJECT_NAME}.personalized_search`;

/** Personalized Search usage events (tech spec KD-12); keys are the feature's action names. */
export const PERSONALIZED_SEARCH_EVENTS = {
  tab_viewed: `${PERSONALIZED_SEARCH_PREFIX}.tab.tab_viewed`,
  prompt_submitted: `${PERSONALIZED_SEARCH_PREFIX}.chat.prompt_submitted`,
  new_chat_started: `${PERSONALIZED_SEARCH_PREFIX}.chat.new_chat_started`,
  results_rendered: `${PERSONALIZED_SEARCH_PREFIX}.results.results_rendered`,
  result_clicked: `${PERSONALIZED_SEARCH_PREFIX}.results.result_clicked`,
  item_save_toggled: `${PERSONALIZED_SEARCH_PREFIX}.results.item_save_toggled`,
  item_dismissed: `${PERSONALIZED_SEARCH_PREFIX}.results.item_dismissed`,
  explanation_opened: `${PERSONALIZED_SEARCH_PREFIX}.results.explanation_opened`,
  saved_tab_opened: `${PERSONALIZED_SEARCH_PREFIX}.results.saved_tab_opened`,
  history_opened: `${PERSONALIZED_SEARCH_PREFIX}.history.history_opened`,
} as const;

const EVENT_NAMES = {
  PATHWAYS: PATHWAYS_EVENTS,
  PERSONALIZED_SEARCH: PERSONALIZED_SEARCH_EVENTS,
};

export default EVENT_NAMES;
