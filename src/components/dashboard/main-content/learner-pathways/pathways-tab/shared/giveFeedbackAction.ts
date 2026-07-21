import type { PathwaysAction } from '../action-bar';
import messages from './messages';

/**
 * The "Give feedback" action-bar link shared by every Learner Pathways page. Returns
 * null (omit entirely) when no feedback form URL is configured, rather than rendering
 * a link with nowhere to go.
 */
export const buildGiveFeedbackAction = (feedbackFormUrl: string | null): PathwaysAction | null => (
  feedbackFormUrl ? {
    id: 'pathway-feedback',
    label: messages.giveFeedback,
    destination: feedbackFormUrl,
    target: '_blank',
    testId: 'pathway-feedback-button',
  } : null
);
