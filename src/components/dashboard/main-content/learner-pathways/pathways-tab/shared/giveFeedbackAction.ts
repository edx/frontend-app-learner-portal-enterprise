import type { PathwaysAction } from '../action-bar';
import messages from './messages';

/**
 * The "Give feedback" action-bar link shared by every Learner Pathways page. Returns
 * null (omit entirely) when no feedback form URL is configured, rather than rendering
 * a link with nowhere to go. `onClick` is supplied by the caller (each surface fires its
 * own `trackFeedbackLinkClicked` via `usePathwaysAnalytics()`, since a plain function like
 * this one can't call hooks itself).
 */
export const buildGiveFeedbackAction = (
  feedbackFormUrl: string | null,
  onClick?: () => void,
): PathwaysAction | null => (
  feedbackFormUrl ? {
    id: 'pathway-feedback',
    label: messages.giveFeedback,
    destination: feedbackFormUrl,
    target: '_blank',
    testId: 'pathway-feedback-button',
    onClick,
  } : null
);
